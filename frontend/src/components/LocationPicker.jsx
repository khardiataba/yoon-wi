// frontend/src/components/LocationPicker.jsx
import React, { useState, useEffect, useCallback } from 'react';
import GoogleMap from './GoogleMap';
import googleMapsService from '../services/googleMapsService';

const LocationPicker = ({
  initialLocation = null,
  onLocationSelect,
  placeholder = "Sélectionnez un lieu",
  label = "Adresse",
  required = false,
  className = '',
  mapHeight = '300px',
  showCurrentLocation = true,
  enableSearch = true
}) => {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 14.6937, lng: -17.4441 }); // Dakar
  const [markers, setMarkers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  // Initialiser avec la location fournie
  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation(initialLocation);
      setMapCenter(initialLocation);
      setMarkers([{
        position: initialLocation,
        title: 'Position sélectionnée',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#4285F4" stroke="white" stroke-width="3"/>
              <circle cx="20" cy="20" r="8" fill="white"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 40)
        }
      }]);
      reverseGeocodeLocation(initialLocation);
    }
  }, [initialLocation]);

  // Géocodage inverse pour obtenir l'adresse
  const reverseGeocodeLocation = useCallback(async (location) => {
    if (!location) return;

    setIsLoading(true);
    try {
      const result = await googleMapsService.reverseGeocode(location);
      if (result.success) {
        setAddress(result.address.formatted);
      }
    } catch (error) {
      console.error('Erreur géocodage inverse:', error);
      setAddress(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Gestionnaire de clic sur la carte
  const handleMapClick = useCallback(async (latLng) => {
    setSelectedLocation(latLng);
    setMapCenter(latLng);
    setMarkers([{
      position: latLng,
      title: 'Position sélectionnée',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#4285F4" stroke="white" stroke-width="3"/>
            <circle cx="20" cy="20" r="8" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 40)
      }
    }]);

    await reverseGeocodeLocation(latLng);

    if (onLocationSelect) {
      onLocationSelect({
        ...latLng,
        address: address
      });
    }
  }, [address, onLocationSelect, reverseGeocodeLocation]);

  // Gestionnaire de sélection de lieu depuis la recherche
  const handlePlaceSelect = useCallback((place) => {
    const location = {
      lat: place.lat,
      lng: place.lng
    };

    setSelectedLocation(location);
    setAddress(place.address || place.name);
    setMapCenter(location);
    setMarkers([{
      position: location,
      title: place.name || 'Lieu sélectionné',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#10B981" stroke="white" stroke-width="3"/>
            <text x="20" y="25" text-anchor="middle" fill="white" font-size="16" font-weight="bold">📍</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 40)
      }
    }]);

    if (onLocationSelect) {
      onLocationSelect({
        ...location,
        address: place.address || place.name,
        name: place.name
      });
    }
  }, [onLocationSelect]);

  // Gestionnaire de mise à jour de la position utilisateur
  const handleLocationUpdate = useCallback((location) => {
    setUserLocation(location);
  }, []);

  // Utiliser la position actuelle
  const useCurrentLocation = useCallback(() => {
    if (userLocation) {
      handleMapClick(userLocation);
    } else if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          await handleMapClick(location);
          setIsLoading(false);
        },
        (error) => {
          console.error('Erreur géolocalisation:', error);
          setIsLoading(false);
          alert('Impossible d\'obtenir votre position. Vérifiez les permissions.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [userLocation, handleMapClick]);

  // Recherche d'adresse manuelle
  const handleAddressSearch = useCallback(async (searchAddress) => {
    if (!searchAddress.trim()) return;

    setIsLoading(true);
    try {
      const result = await googleMapsService.geocodeAddress(searchAddress);
      if (result.success) {
        handleMapClick(result.location);
      }
    } catch (error) {
      console.error('Erreur recherche adresse:', error);
      alert('Adresse non trouvée. Essayez une formulation différente.');
    } finally {
      setIsLoading(false);
    }
  }, [handleMapClick]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Barre de recherche d'adresse */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddressSearch(address);
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          onClick={() => handleAddressSearch(address)}
          disabled={isLoading || !address.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '🔍' : 'Rechercher'}
        </button>
        {showCurrentLocation && (
          <button
            onClick={useCurrentLocation}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            title="Utiliser ma position actuelle"
          >
            📍
          </button>
        )}
      </div>

      {/* Carte Google Maps */}
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <GoogleMap
          center={mapCenter}
          zoom={15}
          markers={markers}
          onMapClick={handleMapClick}
          onPlaceSelect={handlePlaceSelect}
          enablePlacesSearch={enableSearch}
          showUserLocation={showCurrentLocation}
          onLocationUpdate={handleLocationUpdate}
          style={{ height: mapHeight }}
          className="w-full"
        />
      </div>

      {/* Informations de localisation */}
      {selectedLocation && (
        <div className="bg-blue-50 p-3 rounded-md">
          <div className="flex items-center text-sm text-blue-700">
            <span className="mr-2">📍</span>
            <div>
              <div className="font-medium">Position sélectionnée</div>
              <div className="text-xs text-blue-600">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </div>
              {address && (
                <div className="text-xs text-blue-600 mt-1">
                  {address}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-600">Recherche en cours...</span>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;