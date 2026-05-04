// backend/services/ratingService.js
const User = require('../models/User');
const Ride = require('../models/Ride');
const ServiceRequest = require('../models/ServiceRequest');

class RatingService {
  /**
   * Ajoute une notation pour une course
   * @param {string} rideId - ID de la course
   * @param {string} raterId - ID de la personne qui note
   * @param {string} ratedId - ID de la personne notée
   * @param {number} rating - Note (1-5)
   * @param {string} comment - Commentaire optionnel
   * @param {string} type - Type de notation ('passenger-to-driver' ou 'driver-to-passenger')
   * @returns {Object} Résultat de l'opération
   */
  async addRating(rideId, raterId, ratedId, rating, comment = '', type = 'passenger-to-driver') {
    try {
      // Validation de la note
      if (rating < 1 || rating > 5) {
        throw new Error('La note doit être entre 1 et 5');
      }

      // Vérifier que la course existe et est terminée
      const ride = await Ride.findById(rideId);
      if (!ride) {
        throw new Error('Course non trouvée');
      }

      if (ride.status !== 'completed') {
        throw new Error('La course doit être terminée pour pouvoir noter');
      }

      // Vérifier que la personne qui note a participé à la course
      const isPassengerToDriver = type === 'passenger-to-driver';
      const isDriverToPassenger = type === 'driver-to-passenger';
      const isValidRater = (isPassengerToDriver && String(ride.userId || '') === String(raterId || '')) ||
                          (isDriverToPassenger && String(ride.driverId || '') === String(raterId || ''));

      const expectedRatedId = isPassengerToDriver ? ride.driverId : ride.userId;

      if (!isValidRater) {
        throw new Error('Vous n\'êtes pas autorisé à noter cette course');
      }

      if (!expectedRatedId || String(expectedRatedId || '') !== String(ratedId || '')) {
        throw new Error('Utilisateur noté invalide pour cette course');
      }

      // Créer l'objet de notation
      const ratingData = {
        rideId,
        raterId,
        ratedId,
        rating,
        comment: comment.trim(),
        type,
        createdAt: new Date()
      };

      // Ajouter la notation à la course
      if (!ride.ratings) {
        ride.ratings = [];
      }

      // Vérifier si une notation existe déjà
      const existingRating = ride.ratings.find(r =>
        r.raterId.toString() === raterId && r.type === type
      );

      if (existingRating) {
        // Mettre à jour la notation existante
        existingRating.rating = rating;
        existingRating.comment = comment;
        existingRating.createdAt = new Date();
      } else {
        // Ajouter une nouvelle notation
        ride.ratings.push(ratingData);
      }

      await ride.save();

      // Mettre à jour les statistiques de l'utilisateur noté
      await this.updateUserRating(ratedId, rating, existingRating ? 'update' : 'add');

      return {
        success: true,
        message: 'Notation ajoutée avec succès',
        rating: ratingData
      };

    } catch (error) {
      console.error('Erreur lors de l\'ajout de la notation:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Ajoute une notation pour une demande de service
   * @param {string} serviceRequestId - ID de la demande de service
   * @param {string} raterId - ID de la personne qui note
   * @param {string} ratedId - ID de la personne notée
   * @param {number} rating - Note (1-5)
   * @param {string} comment - Commentaire optionnel
   * @param {string} type - Type de notation
   * @returns {Object} Résultat de l'opération
   */
  async addServiceRating(serviceRequestId, raterId, ratedId, rating, comment = '', type = 'client-to-provider') {
    try {
      // Validation similaire à addRating
      if (rating < 1 || rating > 5) {
        throw new Error('La note doit être entre 1 et 5');
      }

      const serviceRequest = await ServiceRequest.findById(serviceRequestId);
      if (!serviceRequest) {
        throw new Error('Demande de service non trouvée');
      }

      if (serviceRequest.status !== 'completed') {
        throw new Error('Le service doit être terminé pour pouvoir noter');
      }

      // Validation du rater
      const isClientToProvider = type === 'client-to-provider';
      const isProviderToClient = type === 'provider-to-client';
      const isValidRater = (isClientToProvider && String(serviceRequest.clientId || '') === String(raterId || '')) ||
                          (isProviderToClient && String(serviceRequest.technicianId || '') === String(raterId || ''));

      const expectedRatedId = isClientToProvider ? serviceRequest.technicianId : serviceRequest.clientId;

      if (!isValidRater) {
        throw new Error('Vous n\'êtes pas autorisé à noter ce service');
      }

      if (!expectedRatedId || String(expectedRatedId || '') !== String(ratedId || '')) {
        throw new Error('Utilisateur noté invalide pour ce service');
      }

      const ratingData = {
        serviceRequestId,
        raterId,
        ratedId,
        rating,
        comment: comment.trim(),
        type,
        createdAt: new Date()
      };

      if (!serviceRequest.ratings) {
        serviceRequest.ratings = [];
      }

      const existingRating = serviceRequest.ratings.find(r =>
        r.raterId.toString() === raterId && r.type === type
      );

      if (existingRating) {
        existingRating.rating = rating;
        existingRating.comment = comment;
        existingRating.createdAt = new Date();
      } else {
        serviceRequest.ratings.push(ratingData);
      }

      await serviceRequest.save();
      await this.updateUserRating(ratedId, rating, existingRating ? 'update' : 'add');

      return {
        success: true,
        message: 'Notation ajoutée avec succès',
        rating: ratingData
      };

    } catch (error) {
      console.error('Erreur lors de l\'ajout de la notation de service:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Met à jour les statistiques de notation d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {number} newRating - Nouvelle note
   * @param {string} action - 'add' ou 'update'
   */
  async updateUserRating(userId, newRating, action = 'add') {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      if (action === 'add') {
        user.totalRatings += 1;
        user.ratingSum += newRating;
      } else if (action === 'update') {
        // Pour la mise à jour, on recalcule complètement (simplifié)
        // En production, il faudrait stocker l'ancienne note
        user.ratingSum = user.ratingSum - (user.rating || 5) + newRating;
      }

      // Recalculer la moyenne
      user.rating = user.ratingSum / user.totalRatings;

      // S'assurer que la note reste entre 1 et 5
      user.rating = Math.max(1, Math.min(5, user.rating));

      await user.save();

    } catch (error) {
      console.error('Erreur lors de la mise à jour du rating utilisateur:', error);
    }
  }

  /**
   * Récupère les statistiques de notation d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Object} Statistiques de notation
   */
  async getUserRatingStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Récupérer les notations récentes
      const recentRatings = await this.getRecentRatings(userId);

      return {
        overallRating: user.rating,
        totalRatings: user.totalRatings,
        completedRides: user.completedRides,
        cancelledRides: user.cancelledRides,
        onTimeRate: user.onTimeRate,
        recentRatings: recentRatings.slice(0, 10), // 10 dernières notations
        ratingDistribution: await this.getRatingDistribution(userId)
      };

    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error);
      throw error;
    }
  }

  /**
   * Récupère les notations récentes d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Array} Liste des notations récentes
   */
  async getRecentRatings(userId) {
    try {
      // Récupérer les notations depuis les courses
      const rideRatings = await Ride.find({
        $or: [
          { userId },
          { driverId: userId }
        ],
        'ratings.ratedId': userId
      })
      .select('ratings createdAt')
      .sort({ createdAt: -1 })
      .limit(20);

      // Récupérer les notations depuis les services
      const serviceRatings = await ServiceRequest.find({
        $or: [
          { clientId: userId },
          { technicianId: userId }
        ],
        'ratings.ratedId': userId
      })
      .select('ratings createdAt')
      .sort({ createdAt: -1 })
      .limit(20);

      // Combiner et trier
      const allRatings = [];

      rideRatings.forEach(ride => {
        ride.ratings.forEach(rating => {
          if (rating.ratedId.toString() === userId) {
            allRatings.push({
              ...rating.toObject(),
              date: ride.createdAt,
              type: 'ride'
            });
          }
        });
      });

      serviceRatings.forEach(service => {
        service.ratings.forEach(rating => {
          if (rating.ratedId.toString() === userId) {
            allRatings.push({
              ...rating.toObject(),
              date: service.createdAt,
              type: 'service'
            });
          }
        });
      });

      return allRatings
        .sort((a, b) => b.date - a.date)
        .slice(0, 10);

    } catch (error) {
      console.error('Erreur lors de la récupération des notations récentes:', error);
      return [];
    }
  }

  /**
   * Récupère la distribution des notes
   * @param {string} userId - ID de l'utilisateur
   * @returns {Object} Distribution des notes
   */
  async getRatingDistribution(userId) {
    try {
      const ratings = await this.getRecentRatings(userId);

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      ratings.forEach(rating => {
        const roundedRating = Math.round(rating.rating);
        if (distribution[roundedRating] !== undefined) {
          distribution[roundedRating]++;
        }
      });

      return distribution;

    } catch (error) {
      console.error('Erreur lors de la récupération de la distribution:', error);
      return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    }
  }

  /**
   * Signale un problème avec une notation
   * @param {string} ratingId - ID de la notation
   * @param {string} reporterId - ID du rapporteur
   * @param {string} reason - Raison du signalement
   * @returns {Object} Résultat de l'opération
   */
  async reportRating(ratingId, reporterId, reason) {
    try {
      // Cette fonctionnalité pourrait être étendue avec un système de modération
      console.log(`Rating ${ratingId} reported by ${reporterId}: ${reason}`);

      return {
        success: true,
        message: 'Signalement enregistré'
      };

    } catch (error) {
      console.error('Erreur lors du signalement:', error);
      return {
        success: false,
        message: 'Erreur lors du signalement'
      };
    }
  }
}

module.exports = new RatingService();
