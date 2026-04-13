// backend/routes/ratingRoutes.js
const express = require('express');
const router = express.Router();
const ratingService = require('../services/ratingService');
const { authMiddleware } = require('../middleware/auth');

// Ajouter una notation pour una course
router.post('/ride/:rideId', authMiddleware, async (req, res) => {
  try {
    const { rideId } = req.params;
    const { ratedId, rating, comment, type } = req.body;
    const raterId = req.user.id;

    const result = await ratingService.addRating(rideId, raterId, ratedId, rating, comment, type);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur route rating ride:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajouter une notation pour un service
router.post('/service/:serviceRequestId', authMiddleware, async (req, res) => {
  try {
    const { serviceRequestId } = req.params;
    const { ratedId, rating, comment, type } = req.body;
    const raterId = req.user.id;

    const result = await ratingService.addServiceRating(serviceRequestId, raterId, ratedId, rating, comment, type);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur route rating service:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les statistiques de notation d'un utilisateur
router.get('/stats/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await ratingService.getUserRatingStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Erreur route rating stats:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Signaler une notation
router.post('/report/:ratingId', authMiddleware, async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { reason } = req.body;
    const reporterId = req.user.id;

    const result = await ratingService.reportRating(ratingId, reporterId, reason);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur route report rating:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;