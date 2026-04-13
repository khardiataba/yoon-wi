// frontend/src/services/googleMapsService.js
class GoogleMapsService {
  constructor() {
    this.directionsService = null;
    this.distanceMatrixService = null;
    this.geocoder = null;
    this.placesService = null;
    this.isInitialized = false;
  }

  // Initialiser les services Google Maps
  initialize(google) {
    if (!google) return false;

    try {
      this.directionsService = new google.maps.DirectionsService();
      this.distanceMatrixService = new google.maps.DistanceMatrixService();
      this.geocoder = new google.maps.Geocoder();
      this.placesService = new google.maps.places.PlacesService(document.createElement('div'));
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Erreur d\'initialisation Google Maps:', error);
      return false;
    }
  }

  // Calculer un itinéraire
  async calculateRoute(origin, destination, options = {}) {
    if (!this.isInitialized || !this.directionsService) {
      throw new Error('Google Maps non initialisé');
    }

    const request = {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false,
      avoidHighways: false,
      avoidTolls: false,
      ...options
    };

    return new Promise((resolve, reject) => {
      this.directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          const route = result.routes[0];
          const leg = route.legs[0];

          resolve({
            success: true,
            route: {
              distance: {
                text: leg.distance.text,
                value: leg.distance.value // en mètres
              },
              duration: {
                text: leg.duration.text,
                value: leg.duration.value // en secondes
              },
              polyline: route.overview_polyline,
              bounds: route.bounds,
              steps: leg.steps.map(step => ({
                instructions: step.instructions,
                distance: step.distance,
                duration: step.duration,
                path: step.path
              }))
            },
            rawResult: result
          });
        } else {
          reject(new Error(`Erreur calcul itinéraire: ${status}`));
        }
      });
    });
  }

  // Calculer la matrice de distances
  async calculateDistanceMatrix(origins, destinations, options = {}) {
    if (!this.isInitialized || !this.distanceMatrixService) {
      throw new Error('Google Maps non initialisé');
    }

    const request = {
      origins,
      destinations,
      travelMode: google.maps.TravelMode.DRIVING,
      avoidHighways: false,
      avoidTolls: false,
      ...options
    };

    return new Promise((resolve, reject) => {
      this.distanceMatrixService.getDistanceMatrix(request, (response, status) => {
        if (status === google.maps.DistanceMatrixStatus.OK) {
          resolve({
            success: true,
            matrix: response.rows.map(row => ({
              elements: row.elements.map(element => ({
                status: element.status,
                distance: element.distance ? {
                  text: element.distance.text,
                  value: element.distance.value
                } : null,
                duration: element.duration ? {
                  text: element.duration.text,
                  value: element.duration.value
                } : null,
                duration_in_traffic: element.duration_in_traffic ? {
                  text: element.duration_in_traffic.text,
                  value: element.duration_in_traffic.value
                } : null
              }))
            }))
          });
        } else {
          reject(new Error(`Erreur matrice distances: ${status}`));
        }
      });
    });
  }

  // Géocodage (coordonnées vers adresse)
  async reverseGeocode(latLng) {
    if (!this.isInitialized || !this.geocoder) {
      throw new Error('Google Maps non initialisé');
    }

    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results[0]) {
          const address = this.parseGeocodeResult(results[0]);
          resolve({
            success: true,
            address,
            rawResults: results
          });
        } else {
          reject(new Error(`Erreur géocodage inverse: ${status}`));
        }
      });
    });
  }

  // Géocodage inverse (adresse vers coordonnées)
  async geocodeAddress(address) {
    if (!this.isInitialized || !this.geocoder) {
      throw new Error('Google Maps non initialisé');
    }

    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results[0]) {
          const location = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
            address: results[0].formatted_address,
            placeId: results[0].place_id
          };
          resolve({
            success: true,
            location,
            rawResults: results
          });
        } else {
          reject(new Error(`Erreur géocodage: ${status}`));
        }
      });
    });
  }

  // Recherche de lieux
  async searchPlaces(query, location, radius = 5000) {
    if (!this.isInitialized || !this.placesService) {
      throw new Error('Google Maps non initialisé');
    }

    const request = {
      query,
      location,
      radius
    };

    return new Promise((resolve, reject) => {
      this.placesService.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          const places = results.map(place => ({
            id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            rating: place.rating,
            types: place.types,
            photos: place.photos?.map(photo => ({
              url: photo.getUrl({ maxWidth: 400, maxHeight: 300 }),
              width: photo.width,
              height: photo.height
            }))
          }));

          resolve({
            success: true,
            places
          });
        } else {
          reject(new Error(`Erreur recherche lieux: ${status}`));
        }
      });
    });
  }

  // Parser le résultat du géocodage
  parseGeocodeResult(result) {
    const address = {
      formatted: result.formatted_address,
      components: {}
    };

    result.address_components.forEach(component => {
      const types = component.types;
      if (types.includes('street_number')) {
        address.components.streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        address.components.street = component.long_name;
      }
      if (types.includes('locality')) {
        address.components.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        address.components.region = component.long_name;
      }
      if (types.includes('country')) {
        address.components.country = component.long_name;
        address.components.countryCode = component.short_name;
      }
      if (types.includes('postal_code')) {
        address.components.postalCode = component.long_name;
      }
    });

    return address;
  }

  // Calculer les bounds pour plusieurs points
  calculateBounds(points) {
    if (!points || points.length === 0) return null;

    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;

    points.forEach(point => {
      north = Math.max(north, point.lat);
      south = Math.min(south, point.lat);
      east = Math.max(east, point.lng);
      west = Math.min(west, point.lng);
    });

    return {
      north,
      south,
      east,
      west
    };
  }

  // Estimer le prix d'une course
  calculateRidePrice(distanceKm, durationMin, surgeMultiplier = 1) {
    // Tarifs Yoonbi (inspirés du marché sénégalais)
    const baseFare = 1500; // F CFA
    const perKm = 800; // F CFA
    const perMin = 200; // F CFA
    const minimumFare = 2000; // F CFA

    const distanceFare = distanceKm * perKm;
    const timeFare = durationMin * perMin;
    const totalFare = baseFare + distanceFare + timeFare;

    // Appliquer le multiplicateur de pointe
    const finalFare = Math.max(totalFare * surgeMultiplier, minimumFare);

    return {
      baseFare,
      distanceFare,
      timeFare,
      surgeMultiplier,
      totalFare: Math.round(finalFare),
      currency: 'XOF'
    };
  }

  // Calculer le multiplicateur de pointe (surge pricing)
  calculateSurgeMultiplier(demandLevel, supplyLevel) {
    // demandLevel et supplyLevel sont entre 0 et 1
    // Plus la demande est élevée et l'offre faible, plus le multiplicateur est élevé

    const ratio = demandLevel / Math.max(supplyLevel, 0.1);
    let multiplier = 1;

    if (ratio > 2) multiplier = 1.5;
    else if (ratio > 1.5) multiplier = 1.3;
    else if (ratio > 1.2) multiplier = 1.2;
    else if (ratio < 0.5) multiplier = 0.8; // Réduction en cas de faible demande

    return Math.round(multiplier * 10) / 10;
  }

  // Calculer la distance entre deux points (formule de Haversine)
  calculateDistance(point1, point2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

// Exporter une instance unique
const googleMapsService = new GoogleMapsService();
export default googleMapsService;