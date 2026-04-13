// frontend/src/hooks/useSocket.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const useSocket = () => {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    if (user && token) {
      // Créer la connexion socket
      const baseApiUrl = process.env.REACT_APP_API_URL || ''
      const socketServerUrl =
        process.env.REACT_APP_SOCKET_URL ||
        baseApiUrl.replace(/\/api$/, '') ||
        'http://localhost:5000'

      socketRef.current = io(socketServerUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      const socket = socketRef.current;

      // Gestionnaires d'événements
      socket.on('connect', () => {
        console.log('🔌 Connecté au serveur Socket.io');
        setIsConnected(true);
        setConnectionError(null);
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Déconnecté du serveur Socket.io:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Erreur de connexion Socket.io:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      });

      // Événements de course
      socket.on('ride:new-request', (data) => {
        console.log('🚗 Nouvelle demande de course:', data);
        // Émettre un événement personnalisé pour les composants
        window.dispatchEvent(new CustomEvent('ride:new-request', { detail: data }));
      });

      socket.on('ride:request-accepted', (data) => {
        console.log('✅ Course acceptée:', data);
        window.dispatchEvent(new CustomEvent('ride:request-accepted', { detail: data }));
      });

      socket.on('ride:status-update', (data) => {
        console.log('📍 Mise à jour statut course:', data);
        window.dispatchEvent(new CustomEvent('ride:status-update', { detail: data }));
      });

      socket.on('driver:location-update', (data) => {
        // Mise à jour silencieuse de la position du chauffeur
        window.dispatchEvent(new CustomEvent('driver:location-update', { detail: data }));
      });

      // Événements de chat
      socket.on('chat:new-message', (data) => {
        console.log('💬 Nouveau message:', data);
        window.dispatchEvent(new CustomEvent('chat:new-message', { detail: data }));
      });

      // Notifications
      socket.on('notification:new', (data) => {
        console.log('🔔 Nouvelle notification:', data);
        window.dispatchEvent(new CustomEvent('notification:new', { detail: data }));

        // Afficher une notification système si supportée
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title || 'Yoonbi', {
            body: data.message,
            icon: '/favicon.ico'
          });
        }
      });

      return () => {
        socket.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      };
    } else {
      // Déconnecter si pas d'utilisateur
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    }
  }, [user, token]);

  // Méthodes pour interagir avec le socket
  const emit = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket non connecté, impossible d\'émettre:', event);
    }
  };

  // Méthodes spécifiques aux chauffeurs
  const goOnline = (location, vehicleType) => {
    emit('driver:online', { location, vehicleType });
  };

  const updateLocation = (latitude, longitude, heading = null, speed = null) => {
    emit('driver:location-update', {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      heading: heading ? parseFloat(heading) : null,
      speed: speed ? parseFloat(speed) : null
    });
  };

  const updateDriverStatus = (status) => {
    emit('driver:status-change', { status });
  };

  // Méthodes spécifiques aux passagers
  const requestRide = (pickupLocation, dropoffLocation, vehicleType, estimatedPrice) => {
    emit('ride:request', {
      pickupLocation,
      dropoffLocation,
      vehicleType,
      estimatedPrice
    });
  };

  const acceptRide = (requestId) => {
    emit('ride:accept', { requestId });
  };

  const updateRideStatus = (rideId, status, location = null) => {
    emit('ride:status-update', { rideId, status, location });
  };

  // Méthodes de chat
  const sendMessage = (rideId, message, receiverId) => {
    emit('chat:message', {
      rideId,
      message: message.trim(),
      receiverId
    });
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    // Méthodes
    emit,
    goOnline,
    updateLocation,
    updateDriverStatus,
    requestRide,
    acceptRide,
    updateRideStatus,
    sendMessage
  };
};

export default useSocket;