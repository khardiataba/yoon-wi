// backend/services/matchingService.js
const User = require('../models/User');
const Ride = require('../models/Ride');

class MatchingService {
  constructor(socketManager) {
    this.socketManager = socketManager;
  }

  /**
   * Trouve le meilleur chauffeur pour une course
   * @param {Object} rideRequest - La demande de course
   * @returns {Object|null} Le chauffeur sélectionné ou null
   */
  async findBestDriver(rideRequest) {
    const { pickupLocation, vehicleType, passengerId } = rideRequest;

    // Récupérer tous les chauffeurs actifs
    const activeDrivers = this.socketManager.getActiveDrivers();

    if (activeDrivers.length === 0) {
      return null;
    }

    // Filtrer les chauffeurs disponibles
    const availableDrivers = activeDrivers.filter(driver =>
      driver.status === 'available' &&
      (!vehicleType || driver.vehicleType === vehicleType)
    );

    if (availableDrivers.length === 0) {
      return null;
    }

    // Calculer les scores pour chaque chauffeur
    const scoredDrivers = await Promise.all(
      availableDrivers.map(async (driver) => {
        const score = await this.calculateDriverScore(driver, rideRequest);
        return { ...driver, score };
      })
    );

    // Trier par score décroissant
    scoredDrivers.sort((a, b) => b.score - a.score);

    // Retourner le meilleur chauffeur
    return scoredDrivers[0] || null;
  }

  /**
   * Calcule le score d'un chauffeur pour une course donnée
   * @param {Object} driver - Le chauffeur
   * @param {Object} rideRequest - La demande de course
   * @returns {number} Le score calculé
   */
  async calculateDriverScore(driver, rideRequest) {
    const { pickupLocation, passengerId } = rideRequest;

    let score = 0;

    // 1. Distance (40% du score)
    const distance = this.calculateDistance(
      pickupLocation.latitude,
      pickupLocation.longitude,
      driver.location.latitude,
      driver.location.longitude
    );

    // Score basé sur la distance (plus proche = meilleur score)
    const distanceScore = Math.max(0, 40 - (distance * 8)); // 5km = score 0, 0km = score 40
    score += distanceScore;

    // 2. Rating du chauffeur (30% du score)
    try {
      const driverUser = await User.findById(driver.driverId);
      const rating = driverUser?.rating || 3.0; // Rating par défaut si pas de données
      const ratingScore = (rating / 5.0) * 30; // Rating 5/5 = 30 points
      score += ratingScore;
    } catch (error) {
      score += 15; // Score moyen par défaut
    }

    // 3. Taux d'acceptation récent (15% du score)
    const acceptanceRate = await this.getDriverAcceptanceRate(driver.driverId);
    const acceptanceScore = acceptanceRate * 15;
    score += acceptanceScore;

    // 4. Temps d'attente estimé (10% du score)
    const estimatedWaitTime = distance * 2; // Approximation: 2 min par km
    const waitScore = Math.max(0, 10 - (estimatedWaitTime / 2)); // Moins de 20min = score max
    score += waitScore;

    // 5. Bonus pour chauffeurs vérifiés/réguliers (5% du score)
    try {
      const driverUser = await User.findById(driver.driverId);
      if (driverUser?.isVerified && driverUser?.completedRides > 50) {
        score += 5;
      }
    } catch (error) {
      // Pas de bonus si erreur
    }

    return Math.round(score * 100) / 100; // Arrondir à 2 décimales
  }

  /**
   * Calcule la distance entre deux points GPS
   * @param {number} lat1 - Latitude point 1
   * @param {number} lon1 - Longitude point 1
   * @param {number} lat2 - Latitude point 2
   * @param {number} lon2 - Longitude point 2
   * @returns {number} Distance en km
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Calcule le taux d'acceptation récent d'un chauffeur
   * @param {string} driverId - ID du chauffeur
   * @returns {number} Taux d'acceptation (0-1)
   */
  async getDriverAcceptanceRate(driverId) {
    try {
      // Récupérer les courses récentes (derniers 30 jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentRides = await Ride.find({
        driver: driverId,
        createdAt: { $gte: thirtyDaysAgo }
      }).limit(50);

      if (recentRides.length === 0) return 0.8; // Taux par défaut pour nouveaux chauffeurs

      const acceptedRides = recentRides.filter(ride =>
        ride.status !== 'cancelled' && ride.status !== 'rejected'
      ).length;

      return acceptedRides / recentRides.length;
    } catch (error) {
      return 0.7; // Taux par défaut en cas d'erreur
    }
  }

  /**
   * Envoie une demande de course aux meilleurs chauffeurs
   * @param {Object} rideRequest - La demande de course
   * @returns {Array} Liste des chauffeurs contactés
   */
  async sendRideRequestToDrivers(rideRequest) {
    const bestDriver = await this.findBestDriver(rideRequest);

    if (!bestDriver) {
      return [];
    }

    // Envoyer la demande au meilleur chauffeur
    this.socketManager.emitToUser(bestDriver.driverId, 'ride:new-request', {
      ...rideRequest,
      driverScore: bestDriver.score,
      estimatedArrival: Math.round(bestDriver.distance * 2) // minutes
    });

    return [bestDriver];
  }

  /**
   * Met à jour les préférences d'un chauffeur pour le matching
   * @param {string} driverId - ID du chauffeur
   * @param {Object} preferences - Préférences de matching
   */
  async updateDriverPreferences(driverId, preferences) {
    // Cette méthode pourrait stocker les préférences en base
    // Pour l'instant, on les garde en mémoire dans socketManager
    console.log(`Updated preferences for driver ${driverId}:`, preferences);
  }

  /**
   * Obtient les statistiques de matching
   * @returns {Object} Statistiques
   */
  async getMatchingStats() {
    const activeDrivers = this.socketManager.getActiveDrivers();
    const connectedUsers = this.socketManager.getConnectedUsers();

    return {
      activeDrivers: activeDrivers.length,
      availableDrivers: activeDrivers.filter(d => d.status === 'available').length,
      connectedUsers: connectedUsers.length,
      timestamp: new Date()
    };
  }
}

module.exports = MatchingService;