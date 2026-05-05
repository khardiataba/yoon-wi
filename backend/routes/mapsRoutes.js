// backend/routes/mapsRoutes.js
const express = require('express');
const router = express.Router();
const googleMapsService = require('../services/googleMapsService');
const { authMiddleware } = require('../middleware/auth');

// Calculer un itinéraire
router.post('/route', authMiddleware, async (req, res) => {
  try {
    const { origin, destination, options } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ message: 'Points de départ et d\'arrivée requis' });
    }

    const result = await googleMapsService.calculateRoute(origin, destination, options || {});

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur route calcul itinéraire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Calculer la matrice de distances
router.post('/distance-matrix', authMiddleware, async (req, res) => {
  try {
    const { origins, destinations, options } = req.body;

    if (!origins || !destinations || origins.length === 0 || destinations.length === 0) {
      return res.status(400).json({ message: 'Origines et destinations requis' });
    }

    const result = await googleMapsService.calculateDistanceMatrix(origins, destinations, options || {});

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur route matrice distances:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Géocodage inverse
router.get('/reverse-geocode', authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude et longitude requis' });
    }

    const result = await googleMapsService.reverseGeocode(parseFloat(lat), parseFloat(lng));

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur route géocodage inverse:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Géocodage d'adresse
router.get('/geocode', authMiddleware, async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ message: 'Adresse requise' });
    }

    const result = await googleMapsService.geocodeAddress(address);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur route géocodage:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Recherche de lieux
router.get('/places', authMiddleware, async (req, res) => {
  try {
    const { query, lat, lng, radius } = req.query;

    if (!query || !lat || !lng) {
      return res.status(400).json({ message: 'Requête, latitude et longitude requis' });
    }

    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const searchRadius = radius ? parseInt(radius) : 5000;

    const result = await googleMapsService.searchPlaces(query, location, searchRadius);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur route recherche lieux:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/places/autocomplete', authMiddleware, async (req, res) => {
  try {
    const { input, query, lat, lng, radius } = req.query;
    const searchText = input || query;

    if (!searchText || String(searchText).trim().length < 3) {
      return res.status(400).json({ message: 'Saisissez au moins 3 caractères' });
    }

    const location = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
    const searchRadius = radius ? parseInt(radius) : 12000;

    const result = await googleMapsService.autocompletePlaces(searchText, location, searchRadius);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur route autocompletion lieux:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Calculer le prix d'une course
router.post('/calculate-price', authMiddleware, async (req, res) => {
  try {
    const { distanceKm, durationMin, surgeMultiplier, vehicleType } = req.body;

    if (distanceKm == null || durationMin == null) {
      return res.status(400).json({ message: 'Distance et durée requis' });
    }

    const price = googleMapsService.calculateRidePrice(
      parseFloat(distanceKm),
      parseFloat(durationMin),
      surgeMultiplier || 1,
      vehicleType || 'standard'
    );

    res.json({ success: true, price });
  } catch (error) {
    console.error('Erreur route calcul prix:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Calculer le multiplicateur de pointe
router.post('/surge-multiplier', authMiddleware, async (req, res) => {
  try {
    const { demandLevel, supplyLevel, timeOfDay } = req.body;

    const multiplier = googleMapsService.calculateSurgeMultiplier(
      demandLevel || 1,
      supplyLevel || 1,
      timeOfDay
    );

    res.json({ success: true, multiplier });
  } catch (error) {
    console.error('Erreur route multiplicateur pointe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Vérifier si une adresse est dans la zone de service
router.get('/service-area', authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude et longitude requis' });
    }

    const isInArea = googleMapsService.isInServiceArea(parseFloat(lat), parseFloat(lng));

    res.json({
      success: true,
      isInServiceArea: isInArea,
      message: isInArea ? 'Adresse dans la zone de service' : 'Adresse hors zone de service'
    });
  } catch (error) {
    console.error('Erreur route zone de service:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
