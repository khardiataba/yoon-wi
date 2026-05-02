// frontend/src/hooks/useSocket.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const stripTrailingSlashes = (value) => (value || '').trim().replace(/\/+$/, '');
const isLocalhostHost = (value) => value === 'localhost' || value === '127.0.0.1';
const isLocalSocketUrl = (value) => /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(String(value || '').trim());
const DEPLOY_FALLBACK_BACKEND = stripTrailingSlashes(import.meta.env.VITE_FALLBACK_BACKEND_URL || 'https://yoon-wi.onrender.com');

const getDefaultSocketUrl = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const { protocol, hostname, origin } = window.location;
    const isLocalhost = isLocalhostHost(hostname);

    if (isLocalhost) {
      return `${protocol}//${hostname}:5000`;
    }

    if (DEPLOY_FALLBACK_BACKEND) {
      console.warn(
        `VITE_SOCKET_URL is not set. Falling back to ${DEPLOY_FALLBACK_BACKEND}. ` +
        'Set VITE_SOCKET_URL in frontend env to use your own backend URL.'
      );
      return DEPLOY_FALLBACK_BACKEND;
    }

    console.warn(
      'VITE_SOCKET_URL is not set. Falling back to same-origin socket host. ' +
      'This only works if your production host also serves Socket.io.'
    );

    return origin;
  }

  return 'http://localhost:5000';
};

const getConfiguredSocketUrl = () => {
  const directSocketUrl = stripTrailingSlashes(import.meta.env.VITE_SOCKET_URL);
  const baseApiUrl = stripTrailingSlashes(import.meta.env.VITE_API_URL || '');
  const fallbackFromApi = baseApiUrl.replace(/\/api$/, '');
  const candidate = directSocketUrl || fallbackFromApi;

  if (!candidate) return '';

  if (typeof window !== 'undefined' && window.location?.hostname && !isLocalhostHost(window.location.hostname) && isLocalSocketUrl(candidate)) {
    console.warn('Ignoring local socket URL on a non-local host:', candidate);
    return '';
  }

  return candidate;
};

const useSocket = () => {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    if (user && token) {
      const socketServerUrl = getConfiguredSocketUrl() || getDefaultSocketUrl()

      socketRef.current = io(socketServerUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      const socket = socketRef.current;

      // Gestionnaires d'événements
      socket.on('connect', () => {
        console.log('SOCKET Connecté au serveur Socket.io');
        setIsConnected(true);
        setConnectionError(null);
      });

      socket.on('disconnect', (reason) => {
        console.log('SOCKET Déconnecté du serveur Socket.io:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Erreur de connexion Socket.io:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      });

      // Événements de course
      socket.on('ride:new-request', (data) => {
        console.log('CAR Nouvelle demande de course:', data);
        // Émettre un événement personnalisé pour les composants
        window.dispatchEvent(new CustomEvent('ride:new-request', { detail: data }));
      });

      socket.on('ride:request-accepted', (data) => {
        console.log('OK Course acceptée:', data);
        window.dispatchEvent(new CustomEvent('ride:request-accepted', { detail: data }));
      });

      socket.on('ride:status-update', (data) => {
        console.log('PIN Mise à jour statut course:', data);
        window.dispatchEvent(new CustomEvent('ride:status-update', { detail: data }));
      });

      socket.on('driver:location-update', (data) => {
        // Mise à jour silencieuse de la position du chauffeur
        window.dispatchEvent(new CustomEvent('driver:location-update', { detail: data }));
      });

      socket.on('passenger:location-update', (data) => {
        window.dispatchEvent(new CustomEvent('passenger:location-update', { detail: data }));
      });

      // Événements de chat
      socket.on('chat:new-message', (data) => {
        console.log('MESSAGE Nouveau message:', data);
        window.dispatchEvent(new CustomEvent('chat:new-message', { detail: data }));
      });

      // Notifications
      socket.on('notification:new', (data) => {
        console.log('NOTIF Nouvelle notification:', data);
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
