// backend/services/paymentService.js
const { Wallet, Transaction } = require('../models/Wallet');
const User = require('../models/User');
const Ride = require('../models/Ride');
const ServiceRequest = require('../models/ServiceRequest');
const stripePayments = require('../utils/stripePayments');

class PaymentService {
  /**
   * Crédite le wallet d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {number} amount - Montant à créditer
   * @param {string} description - Description de la transaction
   * @param {string} reference - Référence (ID de paiement Stripe, etc.)
   * @param {string} paymentMethod - Méthode de paiement
   * @returns {Object} Résultat de l'opération
   */
  async creditWallet(userId, amount, description, reference, paymentMethod = 'stripe') {
    try {
      const wallet = await Wallet.findOrCreate(userId);

      // Créer la transaction
      const transaction = new Transaction({
        userId,
        type: 'credit',
        amount,
        description,
        reference,
        referenceType: 'stripe_payment',
        paymentMethod,
        status: 'completed'
      });

      await transaction.save();
      await wallet.addBalance(amount, description, reference, 'stripe_payment', paymentMethod);

      return {
        success: true,
        message: 'Wallet crédité avec succès',
        newBalance: wallet.balance,
        transactionId: transaction._id
      };

    } catch (error) {
      console.error('Erreur lors du crédit du wallet:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Débite le wallet d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {number} amount - Montant à débiter
   * @param {string} description - Description de la transaction
   * @param {string} reference - Référence (ID de course, etc.)
   * @param {string} referenceType - Type de référence
   * @returns {Object} Résultat de l'opération
   */
  async debitWallet(userId, amount, description, reference, referenceType = 'ride') {
    try {
      const wallet = await Wallet.findOrCreate(userId);

      if (!wallet.canAfford(amount)) {
        return {
          success: false,
          message: 'Solde insuffisant',
          currentBalance: wallet.balance,
          requiredAmount: amount
        };
      }

      // Créer la transaction
      const transaction = new Transaction({
        userId,
        type: 'debit',
        amount,
        description,
        reference,
        referenceType,
        paymentMethod: 'wallet',
        status: 'completed'
      });

      await transaction.save();
      await wallet.deductBalance(amount, description, reference, referenceType, 'wallet');

      return {
        success: true,
        message: 'Paiement effectué avec succès',
        newBalance: wallet.balance,
        transactionId: transaction._id
      };

    } catch (error) {
      console.error('Erreur lors du débit du wallet:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Traite le paiement d'une course
   * @param {string} rideId - ID de la course
   * @returns {Object} Résultat du paiement
   */
  async processRidePayment(rideId) {
    try {
      const ride = await Ride.findById(rideId).populate('passenger driver');
      if (!ride) {
        throw new Error('Course non trouvée');
      }

      if (ride.status !== 'completed') {
        throw new Error('La course doit être terminée pour effectuer le paiement');
      }

      if (ride.paymentStatus === 'paid') {
        return {
          success: false,
          message: 'Cette course a déjà été payée'
        };
      }

      const passengerId = ride.passenger._id;
      const driverId = ride.driver._id;
      const amount = ride.finalPrice || ride.estimatedPrice;

      // Calculer la commission Yoonbi (1%)
      const commission = Math.round(amount * 0.01);
      const driverAmount = amount - commission;

      // Débiter le passager
      const debitResult = await this.debitWallet(
        passengerId,
        amount,
        `Paiement course ${rideId}`,
        rideId,
        'ride'
      );

      if (!debitResult.success) {
        return debitResult;
      }

      // Créditer le chauffeur
      const creditResult = await this.creditWallet(
        driverId,
        driverAmount,
        `Paiement course ${rideId}`,
        rideId,
        'wallet'
      );

      if (!creditResult.success) {
        // Annuler le débit en cas d'erreur
        await this.refundPayment(rideId, amount, 'Erreur lors du crédit chauffeur');
        return creditResult;
      }

      // Créditer la commission à Yoonbi (compte admin)
      const adminWallet = await Wallet.findOrCreate(process.env.ADMIN_USER_ID || 'admin');
      await adminWallet.addBalance(commission, `Commission course ${rideId}`, rideId, 'ride', 'system');

      // Mettre à jour le statut de paiement de la course
      ride.paymentStatus = 'paid';
      ride.paidAt = new Date();
      await ride.save();

      // Mettre à jour les statistiques des utilisateurs
      await this.updateUserPaymentStats(passengerId, driverId, amount, driverAmount);

      return {
        success: true,
        message: 'Paiement de course traité avec succès',
        amount,
        driverAmount,
        commission,
        passengerNewBalance: debitResult.newBalance,
        driverNewBalance: creditResult.newBalance
      };

    } catch (error) {
      console.error('Erreur lors du traitement du paiement de course:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Traite le paiement d'un service
   * @param {string} serviceRequestId - ID de la demande de service
   * @returns {Object} Résultat du paiement
   */
  async processServicePayment(serviceRequestId) {
    try {
      const serviceRequest = await ServiceRequest.findById(serviceRequestId).populate('client provider');
      if (!serviceRequest) {
        throw new Error('Demande de service non trouvée');
      }

      if (serviceRequest.status !== 'completed') {
        throw new Error('Le service doit être terminé pour effectuer le paiement');
      }

      if (serviceRequest.paymentStatus === 'paid') {
        return {
          success: false,
          message: 'Ce service a déjà été payé'
        };
      }

      const clientId = serviceRequest.client._id;
      const providerId = serviceRequest.provider._id;
      const amount = serviceRequest.finalPrice || serviceRequest.estimatedPrice;

      // Calculer la commission Yoonbi (1%)
      const commission = Math.round(amount * 0.01);
      const providerAmount = amount - commission;

      // Débiter le client
      const debitResult = await this.debitWallet(
        clientId,
        amount,
        `Paiement service ${serviceRequestId}`,
        serviceRequestId,
        'service'
      );

      if (!debitResult.success) {
        return debitResult;
      }

      // Créditer le prestataire
      const creditResult = await this.creditWallet(
        providerId,
        providerAmount,
        `Paiement service ${serviceRequestId}`,
        serviceRequestId,
        'wallet'
      );

      if (!creditResult.success) {
        await this.refundPayment(serviceRequestId, amount, 'Erreur lors du crédit prestataire');
        return creditResult;
      }

      // Créditer la commission
      const adminWallet = await Wallet.findOrCreate(process.env.ADMIN_USER_ID || 'admin');
      await adminWallet.addBalance(commission, `Commission service ${serviceRequestId}`, serviceRequestId, 'service', 'system');

      // Mettre à jour le statut
      serviceRequest.paymentStatus = 'paid';
      serviceRequest.paidAt = new Date();
      await serviceRequest.save();

      await this.updateUserPaymentStats(clientId, providerId, amount, providerAmount);

      return {
        success: true,
        message: 'Paiement de service traité avec succès',
        amount,
        providerAmount,
        commission,
        clientNewBalance: debitResult.newBalance,
        providerNewBalance: creditResult.newBalance
      };

    } catch (error) {
      console.error('Erreur lors du traitement du paiement de service:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Rembourse un paiement
   * @param {string} reference - Référence du paiement
   * @param {number} amount - Montant à rembourser
   * @param {string} reason - Raison du remboursement
   * @returns {Object} Résultat du remboursement
   */
  async refundPayment(reference, amount, reason) {
    try {
      // Trouver la transaction originale
      const originalTransaction = await Transaction.findOne({
        reference,
        type: 'debit',
        status: 'completed'
      });

      if (!originalTransaction) {
        throw new Error('Transaction originale non trouvée');
      }

      // Créer la transaction de remboursement
      const refundTransaction = new Transaction({
        userId: originalTransaction.userId,
        type: 'refund',
        amount,
        description: `Remboursement: ${reason}`,
        reference,
        referenceType: originalTransaction.referenceType,
        paymentMethod: 'wallet',
        status: 'completed',
        metadata: { reason, originalTransactionId: originalTransaction._id }
      });

      await refundTransaction.save();

      // Créditer le wallet
      const wallet = await Wallet.findOrCreate(originalTransaction.userId);
      await wallet.addBalance(amount, `Remboursement: ${reason}`, reference, 'refund', 'wallet');

      return {
        success: true,
        message: 'Remboursement effectué avec succès',
        newBalance: wallet.balance,
        refundTransactionId: refundTransaction._id
      };

    } catch (error) {
      console.error('Erreur lors du remboursement:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Obtient l'historique des transactions d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {number} limit - Nombre maximum de transactions
   * @param {number} offset - Offset pour la pagination
   * @returns {Array} Liste des transactions
   */
  async getTransactionHistory(userId, limit = 20, offset = 0) {
    try {
      const transactions = await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .populate('userId', 'firstName lastName');

      const totalCount = await Transaction.countDocuments({ userId });

      return {
        transactions,
        totalCount,
        hasMore: offset + limit < totalCount
      };

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      throw error;
    }
  }

  /**
   * Obtient le solde du wallet d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Object} Informations du wallet
   */
  async getWalletBalance(userId) {
    try {
      const wallet = await Wallet.findOrCreate(userId);

      return {
        balance: wallet.balance,
        currency: wallet.currency,
        isActive: wallet.isActive,
        autoRecharge: wallet.autoRecharge,
        statistics: wallet.statistics
      };

    } catch (error) {
      console.error('Erreur lors de la récupération du solde:', error);
      throw error;
    }
  }

  /**
   * Met à jour les statistiques de paiement des utilisateurs
   * @param {string} payerId - ID du payeur
   * @param {string} receiverId - ID du receveur
   * @param {number} totalAmount - Montant total
   * @param {number} receiverAmount - Montant reçu par le receveur
   */
  async updateUserPaymentStats(payerId, receiverId, totalAmount, receiverAmount) {
    try {
      // Mettre à jour les statistiques du receveur (chauffeur/prestataire)
      await User.findByIdAndUpdate(receiverId, {
        $inc: {
          totalEarnings: receiverAmount,
          todayEarnings: receiverAmount,
          weeklyEarnings: receiverAmount,
          monthlyEarnings: receiverAmount,
          completedRides: 1
        }
      });

      // Mettre à jour les statistiques du payeur si nécessaire
      // (par exemple, nombre total de courses payées)

    } catch (error) {
      console.error('Erreur lors de la mise à jour des stats utilisateur:', error);
    }
  }

  /**
   * Traite une recharge de wallet via Stripe
   * @param {string} userId - ID de l'utilisateur
   * @param {number} amount - Montant à recharger
   * @param {string} stripeToken - Token Stripe
   * @returns {Object} Résultat de la recharge
   */
  async rechargeWallet(userId, amount, stripeToken) {
    try {
      // Traiter le paiement Stripe
      const stripeResult = await stripePayments.processPayment(amount, stripeToken, `Recharge wallet ${userId}`);

      if (!stripeResult.success) {
        return stripeResult;
      }

      // Créditer le wallet
      const creditResult = await this.creditWallet(
        userId,
        amount,
        'Recharge wallet',
        stripeResult.paymentIntentId,
        'stripe'
      );

      return {
        success: true,
        message: 'Wallet rechargé avec succès',
        amount,
        newBalance: creditResult.newBalance,
        stripePaymentId: stripeResult.paymentIntentId
      };

    } catch (error) {
      console.error('Erreur lors de la recharge du wallet:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Configure la recharge automatique
   * @param {string} userId - ID de l'utilisateur
   * @param {Object} autoRechargeConfig - Configuration de recharge automatique
   * @returns {Object} Résultat de la configuration
   */
  async configureAutoRecharge(userId, autoRechargeConfig) {
    try {
      const wallet = await Wallet.findOrCreate(userId);

      wallet.autoRecharge = {
        enabled: autoRechargeConfig.enabled,
        threshold: autoRechargeConfig.threshold,
        amount: autoRechargeConfig.amount
      };

      await wallet.save();

      return {
        success: true,
        message: 'Recharge automatique configurée',
        autoRecharge: wallet.autoRecharge
      };

    } catch (error) {
      console.error('Erreur lors de la configuration de la recharge automatique:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new PaymentService();