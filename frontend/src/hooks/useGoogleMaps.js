// frontend/src/hooks/useGoogleMaps.js
import { useState, useEffect, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import googleMapsService from '../services/googleMapsService';

const useGoogleMaps = (apiKey) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [google, setGoogle] = useState(null);

  const initializeGoogleMaps = useCallback(async () => {
    if (!apiKey) {
      setError(new Error('Clé API Google Maps manquante'));
      return;
    }

    if (isLoaded || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places', 'geometry']
      });

      const googleInstance = await loader.load();

      // Initialiser notre service Google Maps
      const serviceInitialized = googleMapsService.initialize(googleInstance);

      if (serviceInitialized) {
        setGoogle(googleInstance);
        setIsLoaded(true);
      } else {
        throw new Error('Échec d\'initialisation du service Google Maps');
      }
    } catch (err) {
      console.error('Erreur chargement Google Maps:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, isLoaded, isLoading]);

  useEffect(() => {
    if (apiKey && !isLoaded && !isLoading) {
      initializeGoogleMaps();
    }
  }, [apiKey, isLoaded, isLoading, initializeGoogleMaps]);

  // Méthodes utilitaires exposées par le hook
  const calculateRoute = useCallback(async (origin, destination, options = {}) => {
    if (!isLoaded) {
      throw new Error('Google Maps n\'est pas encore chargé');
    }
    return googleMapsService.calculateRoute(origin, destination, options);
  }, [isLoaded]);

  const calculateDistanceMatrix = useCallback(async (origins, destinations, options = {}) => {
    if (!isLoaded) {
      throw new Error('Google Maps n\'est pas encore chargé');
    }
    return googleMapsService.calculateDistanceMatrix(origins, destinations, options);
  }, [isLoaded]);

  const reverseGeocode = useCallback(async (latLng) => {
    if (!isLoaded) {
      throw new Error('Google Maps n\'est pas encore chargé');
    }
    return googleMapsService.reverseGeocode(latLng);
  }, [isLoaded]);

  const geocodeAddress = useCallback(async (address) => {
    if (!isLoaded) {
      throw new Error('Google Maps n\'est pas encore chargé');
    }
    return googleMapsService.geocodeAddress(address);
  }, [isLoaded]);

  const searchPlaces = useCallback(async (query, location, radius = 5000) => {
    if (!isLoaded) {
      throw new Error('Google Maps n\'est pas encore chargé');
    }
    return googleMapsService.searchPlaces(query, location, radius);
  }, [isLoaded]);

  const calculateRidePrice = useCallback((distanceKm, durationMin, surgeMultiplier = 1) => {
    return googleMapsService.calculateRidePrice(distanceKm, durationMin, surgeMultiplier);
  }, []);

  const calculateDistance = useCallback((point1, point2) => {
    return googleMapsService.calculateDistance(point1, point2);
  }, []);

  return {
    // État
    isLoaded,
    isLoading,
    error,
    google,

    // Méthodes
    calculateRoute,
    calculateDistanceMatrix,
    reverseGeocode,
    geocodeAddress,
    searchPlaces,
    calculateRidePrice,
    calculateDistance,

    // Utilitaires
    initializeGoogleMaps
  };
};

export default useGoogleMaps;