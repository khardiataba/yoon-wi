// backend/services/googleMapsService.js
const axios = require('axios');

class GoogleMapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
  }

  /**
   * Calculer un itinéraire
   */
  async calculateRoute(origin, destination, options = {}) {
    try {
      const params = new URLSearchParams({
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        key: this.apiKey,
        mode: options.mode || 'driving',
        avoid: options.avoid || '',
        units: 'metric',
        language: 'fr'
      });

      const response = await axios.get(`${this.baseUrl}/directions/json?${params}`);

      if (response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      const route = response.data.routes[0];
      const leg = route.legs[0];

      return {
        success: true,
        distance: {
          text: leg.distance.text,
          value: leg.distance.value // mètres
        },
        duration: {
          text: leg.duration.text,
          value: leg.duration.value // secondes
        },
        polyline: route.overview_polyline,
        bounds: route.bounds,
        steps: leg.steps.map(step => ({
          instructions: step.html_instructions.replace(/<[^>]*>/g, ''), // Supprimer HTML
          distance: step.distance,
          duration: step.duration,
          start_location: step.start_location,
          end_location: step.end_location
        }))
      };
    } catch (error) {
      console.error('Erreur calcul itinéraire:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculer la matrice de distances
   */
  async calculateDistanceMatrix(origins, destinations, options = {}) {
    try {
      const originsParam = origins.map(origin => `${origin.lat},${origin.lng}`).join('|');
      const destinationsParam = destinations.map(dest => `${dest.lat},${dest.lng}`).join('|');

      const params = new URLSearchParams({
        origins: originsParam,
        destinations: destinationsParam,
        key: this.apiKey,
        mode: options.mode || 'driving',
        units: 'metric',
        language: 'fr'
      });

      const response = await axios.get(`${this.baseUrl}/distancematrix/json?${params}`);

      if (response.data.status !== 'OK') {
        throw new Error(`Distance Matrix API error: ${response.data.status}`);
      }

      return {
        success: true,
        matrix: response.data.rows.map(row => ({
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
      };
    } catch (error) {
      console.error('Erreur matrice distances:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Géocodage inverse (coordonnées vers adresse)
   */
  async reverseGeocode(lat, lng) {
    try {
      const params = new URLSearchParams({
        latlng: `${lat},${lng}`,
        key: this.apiKey,
        language: 'fr'
      });

      const response = await axios.get(`${this.baseUrl}/geocode/json?${params}`);

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding API error: ${response.data.status}`);
      }

      const result = response.data.results[0];
      return {
        success: true,
        address: result.formatted_address,
        components: this.parseAddressComponents(result.address_components),
        placeId: result.place_id
      };
    } catch (error) {
      console.error('Erreur géocodage inverse:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Géocodage (adresse vers coordonnées)
   */
  async geocodeAddress(address) {
    try {
      const params = new URLSearchParams({
        address: encodeURIComponent(address),
        key: this.apiKey,
        language: 'fr'
      });

      const response = await axios.get(`${this.baseUrl}/geocode/json?${params}`);

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding API error: ${response.data.status}`);
      }

      const result = response.data.results[0];
      return {
        success: true,
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        },
        address: result.formatted_address,
        placeId: result.place_id
      };
    } catch (error) {
      console.error('Erreur géocodage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Recherche de lieux
   */
  async searchPlaces(query, location, radius = 5000) {
    try {
      const params = new URLSearchParams({
        query: encodeURIComponent(query),
        location: `${location.lat},${location.lng}`,
        radius: radius.toString(),
        key: this.apiKey,
        language: 'fr'
      });

      const response = await axios.get(`${this.baseUrl}/place/textsearch/json?${params}`);

      if (response.data.status !== 'OK') {
        throw new Error(`Places API error: ${response.data.status}`);
      }

      return {
        success: true,
        places: response.data.results.map(place => ({
          id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          rating: place.rating,
          types: place.types,
          photos: place.photos?.map(photo => ({
            reference: photo.photo_reference,
            width: photo.width,
            height: photo.height
          }))
        }))
      };
    } catch (error) {
      console.error('Erreur recherche lieux:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parser les composants d'adresse
   */
  parseAddressComponents(components) {
    const parsed = {};

    components.forEach(component => {
      const types = component.types;

      if (types.includes('street_number')) {
        parsed.streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        parsed.street = component.long_name;
      }
      if (types.includes('locality')) {
        parsed.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        parsed.region = component.long_name;
      }
      if (types.includes('country')) {
        parsed.country = component.long_name;
        parsed.countryCode = component.short_name;
      }
      if (types.includes('postal_code')) {
        parsed.postalCode = component.long_name;
      }
    });

    return parsed;
  }

  /**
   * Calculer le prix d'une course
   */
  calculateRidePrice(distanceKm, durationMin, surgeMultiplier = 1, vehicleType = 'standard') {
    // Tarifs Yoonbi (inspirés du marché sénégalais)
    const baseRates = {
      standard: { base: 1500, perKm: 800, perMin: 200 },
      premium: { base: 2000, perKm: 1200, perMin: 300 },
      van: { base: 3000, perKm: 1500, perMin: 400 }
    };

    const rates = baseRates[vehicleType] || baseRates.standard;

    const distanceFare = distanceKm * rates.perKm;
    const timeFare = durationMin * rates.perMin;
    const totalFare = rates.base + distanceFare + timeFare;

    // Appliquer le multiplicateur de pointe
    const finalFare = Math.max(totalFare * surgeMultiplier, rates.base * 1.2);

    return {
      baseFare: rates.base,
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      surgeMultiplier,
      totalFare: Math.round(finalFare),
      currency: 'XOF',
      vehicleType
    };
  }

  /**
   * Calculer le multiplicateur de pointe
   */
  calculateSurgeMultiplier(demandLevel, supplyLevel, timeOfDay) {
    let multiplier = 1;

    // Multiplicateur basé sur l'heure
    const hour = timeOfDay || new Date().getHours();
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      multiplier *= 1.3; // Heures de pointe
    }

    // Multiplicateur basé sur la demande/offre
    const ratio = demandLevel / Math.max(supplyLevel, 0.1);
    if (ratio > 2) multiplier *= 1.5;
    else if (ratio > 1.5) multiplier *= 1.3;
    else if (ratio > 1.2) multiplier *= 1.2;

    return Math.round(multiplier * 10) / 10;
  }

  /**
   * Calculer la distance entre deux points (formule de Haversine)
   */
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

  /**
   * Valider qu'une adresse est dans la zone de service
   */
  isInServiceArea(lat, lng, serviceArea = null) {
    // Zone de service par défaut (Dakar et environs)
    const defaultBounds = {
      north: 14.8,
      south: 14.6,
      east: -17.3,
      west: -17.5
    };

    const bounds = serviceArea || defaultBounds;

    return lat >= bounds.south && lat <= bounds.north &&
           lng >= bounds.west && lng <= bounds.east;
  }
}

module.exports = new GoogleMapsService();