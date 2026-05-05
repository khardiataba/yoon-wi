// backend/routes/paymentRoutes.js
const express = require('express')
const router = express.Router()
const paymentService = require('../services/paymentService')
const atomicPaymentService = require('../services/atomicPaymentService')
const { authMiddleware } = require('../middleware/auth')
const { rideCommission } = require('../utils/pricing')

const COMMISSION_PAYMENT_NUMBER = '781488070'

router.get('/commission-credit', authMiddleware, async (req, res) => {
  try {
    return res.json({
      balance: Math.round(Number(req.user?.commissionCreditBalance || 0)),
      currency: 'XOF',
      paymentNumber: COMMISSION_PAYMENT_NUMBER,
      methods: ['Wave', 'Orange Money'],
      instructions: `Rechargez par Wave ou Orange Money au ${COMMISSION_PAYMENT_NUMBER}. L'admin valide ensuite le transfert et crédite votre compte.`
    })
  } catch (error) {
    console.error('Erreur route commission credit:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

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
    const { rideId } = req.params
    const userId = req.user._id
    const Ride = require('../models/Ride')

    // Validate ride ID
    if (!rideId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID de course invalide' })
    }

    // Fetch ride
    const ride = await Ride.findById(rideId)
    if (!ride) {
      return res.status(404).json({ message: 'Course non trouvée' })
    }

    // Check ownership
    if (ride.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' })
    }

    // Check ride status
    if (!['ongoing', 'completed'].includes(String(ride.status || ''))) {
      return res.status(400).json({ message: 'Le paiement est autorisé uniquement pour une course en cours ou terminée' })
    }

    if (ride.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Cette course a déjà été réglée' })
    }

    // Validate price
    if (!ride.price || ride.price <= 0) {
      return res.status(400).json({ message: 'Prix invalide' })
    }

    // Ensure commission values exist and stay aligned to pricing utility
    if (!Number.isFinite(Number(ride.appCommissionAmount)) || Number(ride.appCommissionAmount) <= 0) {
      const commission = rideCommission(ride.price)
      ride.appCommissionPercent = commission.appCommissionPercent
      ride.appCommissionAmount = commission.appCommissionAmount
      ride.providerNetAmount = commission.providerNetAmount
    }

    // Atomic debit
    const result = await atomicPaymentService.atomicDebit(userId, ride.price, {
      description: `Paiement course ${rideId}`,
      reference: rideId,
      referenceType: 'ride',
      paymentMethod: ride.paymentMethod || 'wallet'
    })

    if (!result.success) {
      return res.status(402).json(result)
    }

    // Credit driver
    if (ride.driverId) {
      const driverCommission = Number(ride.appCommissionAmount || 0)
      const driverAmount = Math.max(0, ride.price - driverCommission)
      
      await atomicPaymentService.atomicCredit(ride.driverId, driverAmount, {
        description: `Paiement course ${rideId}`,
        reference: rideId,
        referenceType: 'ride',
        paymentMethod: 'wallet'
      })
    }

    // Update ride payment status
    ride.paymentStatus = 'paid'
    ride.paidAt = new Date()
    await ride.save()

    return res.json({
      success: true,
      message: 'Paiement effectué avec succès',
      newBalance: result.newBalance,
      amount: ride.price,
      transactionId: result.transactionId
    })
  } catch (error) {
    console.error('Payment error:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

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

    if (String(serviceRequest.clientId || '') !== String(userId || '')) {
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

// Stripe Webhook Handler
const StripeWebhookHandler = require('../services/stripeWebhookHandler');

router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return res.status(400).json({ message: 'Missing signature or webhook secret' });
    }

    // Verify signature
    const payload = req.body;
    const isValid = StripeWebhookHandler.verifyWebhookSignature(payload, sig, webhookSecret);

    if (!isValid) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    // Parse event
    let event;
    try {
      event = JSON.parse(payload);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid JSON' });
    }

    // Process event
    const result = await StripeWebhookHandler.processWebhookEvent(event);

    if (result.success) {
      res.json({ received: true });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

module.exports = router;
