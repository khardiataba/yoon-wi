// frontend/src/components/RideEstimator.jsx
import React, { useState, useEffect } from 'react';
import GoogleMap from './GoogleMap';
import LocationPicker from './LocationPicker';
import googleMapsService from '../services/googleMapsService';
import { formatters } from '../api';

const RideEstimator = ({
  onRideRequest,
  className = '',
  vehicleTypes = [
    { id: 'standard', name: 'Standard', icon: '🚗', multiplier: 1 },
    { id: 'premium', name: 'Premium', icon: '🚙', multiplier: 1.5 },
    { id: 'van', name: 'Van', icon: '🚐', multiplier: 2 }
  ]
}) => {
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleTypes[0]);
  const [route, setRoute] = useState(null);
  const [price, setPrice] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1);
  const [markers, setMarkers] = useState([]);
  const [polylines, setPolylines] = useState([]);

  // Calculer l'itinéraire et le prix quand les deux points sont sélectionnés
  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      calculateRouteAndPrice();
    } else {
      setRoute(null);
      setPrice(null);
      setPolylines([]);
    }
  }, [pickupLocation, dropoffLocation, selectedVehicle]);

  // Mettre à jour les marqueurs sur la carte
  useEffect(() => {
    const newMarkers = [];

    if (pickupLocation) {
      newMarkers.push({
        position: pickupLocation,
        title: 'Point de départ',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#10B981" stroke="white" stroke-width="3"/>
              <text x="20" y="26" text-anchor="middle" fill="white" font-size="14">A</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 40)
        }
      });
    }

    if (dropoffLocation) {
      newMarkers.push({
        position: dropoffLocation,
        title: 'Destination',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#EF4444" stroke="white" stroke-width="3"/>
              <text x="20" y="26" text-anchor="middle" fill="white" font-size="14">B</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 40)
        }
      });
    }

    setMarkers(newMarkers);
  }, [pickupLocation, dropoffLocation]);

  const calculateRouteAndPrice = async () => {
    if (!pickupLocation || !dropoffLocation) return;

    setIsCalculating(true);
    try {
      // Calculer l'itinéraire
      const routeResult = await googleMapsService.calculateRoute(
        pickupLocation,
        dropoffLocation
      );

      if (routeResult.success) {
        setRoute(routeResult.route);

        // Créer la polyline pour l'affichage
        const path = google.maps.geometry.encoding.decodePath(routeResult.route.polyline.points);
        setPolylines([{
          path: path.map(point => ({ lat: point.lat(), lng: point.lng() })),
          color: '#4285F4',
          weight: 5,
          opacity: 0.8
        }]);

        // Calculer le prix
        const distanceKm = routeResult.route.distance.value / 1000;
        const durationMin = routeResult.route.duration.value / 60;

        // Simuler un multiplicateur de pointe basé sur l'heure
        const currentHour = new Date().getHours();
        const isPeakHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
        const surge = isPeakHour ? 1.3 : 1;
        setSurgeMultiplier(surge);

        const priceResult = googleMapsService.calculateRidePrice(
          distanceKm,
          durationMin,
          surge * selectedVehicle.multiplier
        );

        setPrice(priceResult);
      }
    } catch (error) {
      console.error('Erreur calcul itinéraire:', error);
      setRoute(null);
      setPrice(null);
      setPolylines([]);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleVehicleChange = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleRideRequest = () => {
    if (!pickupLocation || !dropoffLocation || !route || !price) return;

    const rideData = {
      pickupLocation,
      dropoffLocation,
      vehicleType: selectedVehicle.id,
      estimatedPrice: price.totalFare,
      estimatedDistance: route.distance.value,
      estimatedDuration: route.duration.value,
      route: route
    };

    if (onRideRequest) {
      onRideRequest(rideData);
    }
  };

  const getSurgeColor = (multiplier) => {
    if (multiplier > 1.3) return 'text-red-600 bg-red-50';
    if (multiplier > 1.1) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getSurgeText = (multiplier) => {
    if (multiplier > 1.3) return 'Forte demande';
    if (multiplier > 1.1) return 'Demande élevée';
    return 'Demande normale';
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Sélecteurs de lieu */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Commander une course
        </h2>

        <div className="space-y-4">
          <LocationPicker
            label="Point de départ"
            placeholder="Où êtes-vous ?"
            onLocationSelect={setPickupLocation}
            required
            showCurrentLocation={true}
          />

          <LocationPicker
            label="Destination"
            placeholder="Où allez-vous ?"
            onLocationSelect={setDropoffLocation}
            required
          />
        </div>
      </div>

      {/* Carte */}
      {(pickupLocation || dropoffLocation) && (
        <div className="p-6 border-b">
          <div className="h-64 rounded-lg overflow-hidden">
            <GoogleMap
              center={pickupLocation || { lat: 14.6937, lng: -17.4441 }}
              zoom={13}
              markers={markers}
              polylines={polylines}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
      )}

      {/* Sélection du véhicule */}
      {pickupLocation && dropoffLocation && (
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Choisissez votre véhicule
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vehicleTypes.map((vehicle) => (
              <button
                key={vehicle.id}
                onClick={() => handleVehicleChange(vehicle)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedVehicle.id === vehicle.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{vehicle.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{vehicle.name}</div>
                    <div className="text-sm text-gray-500">
                      {vehicle.multiplier > 1 ? `${vehicle.multiplier}x le prix` : 'Tarif normal'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Estimation du prix */}
      {isCalculating && (
        <div className="p-6 border-b">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Calcul de l'itinéraire...</span>
          </div>
        </div>
      )}

      {route && price && !isCalculating && (
        <div className="p-6 border-b">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Estimation</h3>
              {surgeMultiplier > 1 && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSurgeColor(surgeMultiplier)}`}>
                  {getSurgeText(surgeMultiplier)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {route.distance.text}
                </div>
                <div className="text-sm text-gray-500">Distance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {route.duration.text}
                </div>
                <div className="text-sm text-gray-500">Durée</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-gray-900">Prix estimé</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatters.formatAmount(price.totalFare)}
                </span>
              </div>

              {surgeMultiplier > 1 && (
                <div className="text-sm text-orange-600 mt-1">
                  Multiplicateur de pointe: {surgeMultiplier}x
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bouton de commande */}
      {pickupLocation && dropoffLocation && route && price && (
        <div className="p-6">
          <button
            onClick={handleRideRequest}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Commander maintenant • {formatters.formatAmount(price.totalFare)}
          </button>

          <p className="text-xs text-gray-500 text-center mt-2">
            Paiement automatique à la fin de la course
          </p>
        </div>
      )}
    </div>
  );
};

export default RideEstimator;