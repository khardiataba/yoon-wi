// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { authMiddleware } = require('../middleware/auth');

// Obtenir le solde du wallet
router.get('/wallet/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const balance = await paymentService.getWalletBalance(userId);
    res.json(balance);
  } catch (error) {
    console.error('Erreur route wallet balance:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir l'historique des transactions
router.get('/wallet/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const history = await paymentService.getTransactionHistory(userId, parseInt(limit), parseInt(offset));
    res.json(history);
  } catch (error) {
    console.error('Erreur route transaction history:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Recharger le wallet
router.post('/wallet/recharge', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, stripeToken } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Montant invalide' });
    }

    if (!stripeToken) {
      return res.status(400).json({ message: 'Token de paiement requis' });
    }

    const result = await paymentService.rechargeWallet(userId, amount, stripeToken);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur route recharge wallet:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Configurer la recharge automatique
router.post('/wallet/auto-recharge', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled, threshold, amount } = req.body;

    const config = {
      enabled: enabled || false,
      threshold: threshold || 5000,
      amount: amount || 10000
    };

    const result = await paymentService.configureAutoRecharge(userId, config);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur route auto-recharge:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Traiter le paiement d'une course
router.post('/ride/:rideId/pay', authMiddleware, async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur est le passager de la course
    const Ride = require('../models/Ride');
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: 'Course non trouvée' });
    }

    if (ride.passenger.toString() !== userId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const result = await paymentService.processRidePayment(rideId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.currentBalance !== undefined ? 402 : 400).json(result);
    }
  } catch (error) {
    console.error('Erreur route pay ride:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Traiter le paiement d'un service
router.post('/service/:serviceRequestId/pay', authMiddleware, async (req, res) => {
  try {
    const { serviceRequestId } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur est le client
    const ServiceRequest = require('../models/ServiceRequest');
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);

    if (!serviceRequest) {
      return res.status(404).json({ message: 'Service non trouvé' });
    }

    if (serviceRequest.client.toString() !== userId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const result = await paymentService.processServicePayment(serviceRequestId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.currentBalance !== undefined ? 402 : 400).json(result);
    }
  } catch (error) {
    console.error('Erreur route pay service:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Remboursement (admin seulement)
router.post('/refund/:reference', authMiddleware, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès admin requis' });
    }

    const { reference } = req.params;
    const { amount, reason } = req.body;

    const result = await paymentService.refundPayment(reference, amount, reason);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur route refund:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;