// backend/socket/socketManager.js
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Ride = require('../models/Ride');

class SocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.activeDrivers = new Map(); // driverId -> {socketId, location, status}
    this.activeRides = new Map(); // rideId -> {passengerSocket, driverSocket, status}
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.io.use(this.authenticateSocket.bind(this));
    this.setupSocketHandlers();

    console.log('🔌 Socket.io initialized');
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id;
      socket.userRole = user.role;
      socket.userData = user;

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`👤 User ${socket.userId} connected (${socket.userRole})`);

      // Register user connection
      this.connectedUsers.set(socket.userId.toString(), socket.id);

      // Handle driver going online
      socket.on('driver:online', (data) => {
        this.handleDriverOnline(socket, data);
      });

      // Handle driver location updates
      socket.on('driver:location-update', (data) => {
        this.handleDriverLocationUpdate(socket, data);
      });

      // Handle driver status change
      socket.on('driver:status-change', (data) => {
        this.handleDriverStatusChange(socket, data);
      });

      // Handle passenger requesting ride
      socket.on('ride:request', (data) => {
        this.handleRideRequest(socket, data);
      });

      // Handle driver accepting ride
      socket.on('ride:accept', (data) => {
        this.handleRideAccept(socket, data);
      });

      // Handle ride status updates
      socket.on('ride:status-update', (data) => {
        this.handleRideStatusUpdate(socket, data);
      });

      // Handle chat messages
      socket.on('chat:message', (data) => {
        this.handleChatMessage(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  handleDriverOnline(socket, data) {
    const { location, vehicleType } = data;

    this.activeDrivers.set(socket.userId.toString(), {
      socketId: socket.id,
      location,
      vehicleType,
      status: 'available',
      lastUpdate: Date.now()
    });

    socket.emit('driver:online-success', { message: 'Driver is now online' });
    console.log(`🚗 Driver ${socket.userId} went online`);
  }

  handleDriverLocationUpdate(socket, data) {
    const { latitude, longitude, heading, speed } = data;

    if (this.activeDrivers.has(socket.userId.toString())) {
      const driver = this.activeDrivers.get(socket.userId.toString());
      driver.location = { latitude, longitude };
      driver.heading = heading;
      driver.speed = speed;
      driver.lastUpdate = Date.now();

      // Notify passengers in active rides about location update
      this.notifyRidePassengers(socket.userId.toString(), 'driver:location-update', {
        driverId: socket.userId,
        location: driver.location,
        heading,
        speed
      });
    }
  }

  handleDriverStatusChange(socket, data) {
    const { status } = data; // 'available', 'busy', 'offline'

    if (this.activeDrivers.has(socket.userId.toString())) {
      const driver = this.activeDrivers.get(socket.userId.toString());
      driver.status = status;

      if (status === 'offline') {
        this.activeDrivers.delete(socket.userId.toString());
      }
    }
  }

  async handleRideRequest(socket, data) {
    const { pickupLocation, dropoffLocation, vehicleType, estimatedPrice } = data;

    try {
      // Find available drivers within range
      const availableDrivers = this.findAvailableDrivers(pickupLocation, vehicleType);

      if (availableDrivers.length === 0) {
        socket.emit('ride:request-failed', { message: 'No drivers available' });
        return;
      }

      // Create ride request
      const rideRequest = {
        id: Date.now().toString(),
        passengerId: socket.userId,
        passengerSocket: socket.id,
        pickupLocation,
        dropoffLocation,
        vehicleType,
        estimatedPrice,
        status: 'searching',
        createdAt: new Date()
      };

      // Send request to nearest drivers
      const nearestDrivers = availableDrivers.slice(0, 3); // Send to 3 nearest drivers

      for (const driver of nearestDrivers) {
        const driverSocket = this.io.sockets.sockets.get(driver.socketId);
        if (driverSocket) {
          driverSocket.emit('ride:new-request', rideRequest);
        }
      }

      // Set timeout for ride request (30 seconds)
      setTimeout(() => {
        if (rideRequest.status === 'searching') {
          socket.emit('ride:request-timeout', { message: 'No driver accepted the ride' });
        }
      }, 30000);

      socket.emit('ride:request-sent', { requestId: rideRequest.id });

    } catch (error) {
      console.error('Ride request error:', error);
      socket.emit('ride:request-failed', { message: 'Failed to request ride' });
    }
  }

  handleRideAccept(socket, data) {
    const { requestId } = data;

    // Find the ride request and update it
    // This would need to be implemented with proper ride management
    socket.emit('ride:accept-success', { requestId });
  }

  handleRideStatusUpdate(socket, data) {
    const { rideId, status, location } = data;

    // Notify the other party about status change
    this.notifyRideParticipants(rideId, 'ride:status-update', {
      rideId,
      status,
      location,
      timestamp: new Date()
    });
  }

  handleChatMessage(socket, data) {
    const { rideId, message, receiverId } = data;

    const receiverSocketId = this.connectedUsers.get(receiverId.toString());
    if (receiverSocketId) {
      this.io.to(receiverSocketId).emit('chat:new-message', {
        rideId,
        message,
        senderId: socket.userId,
        timestamp: new Date()
      });
    }
  }

  handleDisconnect(socket) {
    console.log(`👤 User ${socket.userId} disconnected`);

    // Remove from connected users
    this.connectedUsers.delete(socket.userId.toString());

    // Remove from active drivers if driver
    if (socket.userRole === 'driver') {
      this.activeDrivers.delete(socket.userId.toString());
    }

    // Handle active rides cleanup
    // This would need more implementation
  }

  findAvailableDrivers(pickupLocation, vehicleType) {
    const availableDrivers = [];

    for (const [driverId, driverData] of this.activeDrivers) {
      if (driverData.status === 'available' &&
          (!vehicleType || driverData.vehicleType === vehicleType)) {

        const distance = this.calculateDistance(
          pickupLocation.latitude,
          pickupLocation.longitude,
          driverData.location.latitude,
          driverData.location.longitude
        );

        if (distance <= 5) { // Within 5km
          availableDrivers.push({
            driverId,
            socketId: driverData.socketId,
            distance,
            location: driverData.location
          });
        }
      }
    }

    // Sort by distance
    return availableDrivers.sort((a, b) => a.distance - b.distance);
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async notifyRidePassengers(driverId, event, data) {
    if (!driverId) return

    try {
      const rides = await Ride.find({ driverId, status: { $in: ['accepted', 'ongoing'] } }).select('userId')
      rides.forEach((ride) => {
        const passengerSocketId = this.connectedUsers.get(String(ride.userId))
        if (passengerSocketId) {
          this.io.to(passengerSocketId).emit(event, data)
        }
      })
    } catch (error) {
      console.error('Erreur notification passager:', error)
    }
  }

  async notifyRideParticipants(rideId, event, data) {
    if (!rideId) return

    try {
      const ride = await Ride.findById(rideId).select('userId driverId')
      if (!ride) return

      const participantIds = [ride.userId, ride.driverId].filter(Boolean)
      participantIds.forEach((participantId) => {
        const socketId = this.connectedUsers.get(String(participantId))
        if (socketId) {
          this.io.to(socketId).emit(event, data)
        }
      })
    } catch (error) {
      console.error('Erreur notification participants:', error)
    }
  }

  // Utility methods for external use
  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  getActiveDrivers() {
    return Array.from(this.activeDrivers.values());
  }

  emitToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }
}

module.exports = new SocketManager();