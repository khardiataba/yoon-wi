// frontend/src/components/GoogleMap.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { useAuth } from '../context/AuthContext';

const GoogleMap = ({
  center = { lat: 14.6937, lng: -17.4441 }, // Dakar, Sénégal
  zoom = 12,
  markers = [],
  polylines = [],
  onMapClick,
  onMarkerClick,
  className = '',
  style = { height: '400px', width: '100%' },
  enablePlacesSearch = false,
  onPlaceSelect,
  showUserLocation = false,
  userLocation,
  onLocationUpdate
}) => {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const userMarkerRef = useRef(null);
  const searchBoxRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [userPosition, setUserPosition] = useState(userLocation);

  // Initialiser la carte
  const initMap = (google) => {
    if (!mapRef.current) return;

    const mapOptions = {
      center,
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    };

    googleMapRef.current = new google.maps.Map(mapRef.current, mapOptions);

    // Gestionnaire de clic sur la carte
    if (onMapClick) {
      googleMapRef.current.addListener('click', (event) => {
        const latLng = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        onMapClick(latLng);
      });
    }

    // Initialiser la recherche de lieux si activée
    if (enablePlacesSearch) {
      initPlacesSearch(google);
    }

    // Géolocalisation utilisateur
    if (showUserLocation) {
      initUserLocation(google);
    }

    setMapLoaded(true);
  };

  // Initialiser la recherche de lieux
  const initPlacesSearch = (google) => {
    const input = document.getElementById('places-search-input');
    if (!input) return;

    searchBoxRef.current = new google.maps.places.SearchBox(input);

    searchBoxRef.current.addListener('places_changed', () => {
      const places = searchBoxRef.current.getPlaces();
      if (places.length === 0) return;

      const place = places[0];
      if (!place.geometry || !place.geometry.location) return;

      const location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address,
        name: place.name
      };

      // Centrer la carte sur le lieu
      googleMapRef.current.setCenter(place.geometry.location);
      googleMapRef.current.setZoom(16);

      if (onPlaceSelect) {
        onPlaceSelect(location);
      }
    });
  };

  // Géolocalisation utilisateur
  const initUserLocation = (google) => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          setUserPosition(pos);

          // Créer ou mettre à jour le marqueur utilisateur
          if (userMarkerRef.current) {
            userMarkerRef.current.setPosition(pos);
          } else {
            userMarkerRef.current = new google.maps.Marker({
              position: pos,
              map: googleMapRef.current,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
              title: 'Votre position'
            });
          }

          if (onLocationUpdate) {
            onLocationUpdate(pos);
          }
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 30000
        }
      );
    }
  };

  // Mettre à jour les marqueurs
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;

    // Supprimer les anciens marqueurs
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Créer les nouveaux marqueurs
    markers.forEach((markerData, index) => {
      const marker = new google.maps.Marker({
        position: markerData.position,
        map: googleMapRef.current,
        title: markerData.title,
        icon: markerData.icon,
        animation: markerData.animation ? google.maps.Animation.DROP : null
      });

      // Info window si spécifié
      if (markerData.infoWindow) {
        const infoWindow = new google.maps.InfoWindow({
          content: markerData.infoWindow
        });

        marker.addListener('click', () => {
          infoWindow.open(googleMapRef.current, marker);
        });
      }

      // Gestionnaire de clic personnalisé
      if (onMarkerClick) {
        marker.addListener('click', () => {
          onMarkerClick(markerData, index);
        });
      }

      markersRef.current.push(marker);
    });
  }, [markers, mapLoaded]);

  // Mettre à jour les polylines
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;

    // Supprimer les anciennes polylines
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];

    // Créer les nouvelles polylines
    polylines.forEach((polylineData) => {
      const polyline = new google.maps.Polyline({
        path: polylineData.path,
        geodesic: true,
        strokeColor: polylineData.color || '#4285F4',
        strokeOpacity: polylineData.opacity || 1.0,
        strokeWeight: polylineData.weight || 3,
        map: googleMapRef.current
      });

      polylinesRef.current.push(polyline);
    });
  }, [polylines, mapLoaded]);

  // Centrer sur la position utilisateur
  useEffect(() => {
    if (userPosition && googleMapRef.current) {
      googleMapRef.current.setCenter(userPosition);
      googleMapRef.current.setZoom(15);
    }
  }, [userPosition]);

  // Composant de rendu de la carte
  const MapComponent = () => (
    <div style={style} className={className}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );

  // Wrapper Google Maps
  const render = (status) => {
    switch (status) {
      case Status.LOADING:
        return (
          <div style={style} className={`flex items-center justify-center bg-gray-100 ${className}`}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Chargement de la carte...</p>
            </div>
          </div>
        );

      case Status.FAILURE:
        return (
          <div style={style} className={`flex items-center justify-center bg-red-50 ${className}`}>
            <div className="text-center">
              <div className="text-red-500 mb-2">❌</div>
              <p className="text-red-700">Erreur de chargement de Google Maps</p>
              <p className="text-sm text-red-600 mt-1">
                Vérifiez votre clé API Google Maps
              </p>
            </div>
          </div>
        );

      case Status.SUCCESS:
        return <MapComponent />;
    }
  };

  return (
    <>
      {/* Barre de recherche si activée */}
      {enablePlacesSearch && (
        <div className="mb-4">
          <input
            id="places-search-input"
            type="text"
            placeholder="Rechercher un lieu..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <Wrapper
        apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY"}
        libraries={['places', 'geometry']}
        callback={initMap}
        render={render}
      />
    </>
  );
};

export default GoogleMap;