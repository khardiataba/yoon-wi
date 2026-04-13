import axios from "axios"

const getDefaultApiBase = () => {
  if (typeof window !== "undefined" && window.location?.hostname) {
    const protocol = window.location.protocol || "http:"
    const hostname = window.location.hostname
    return `${protocol}//${hostname}:5000/api`
  }

  return "http://localhost:5000/api"
}

const normalizeBaseURL = (value) => {
  const trimmed = (value || getDefaultApiBase()).trim().replace(/\/+$/, "")
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`
}

const getStoredToken = () => {
  try {
    return localStorage.getItem("token")
  } catch (error) {
    console.error("Impossible de lire le token local:", error)
    return null
  }
}

const api = axios.create({
  baseURL: normalizeBaseURL(process.env.REACT_APP_API_URL),
  timeout: 15000
})

api.interceptors.request.use(
  (config) => {
    try {
      const token = getStoredToken()
      if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.error("Erreur pendant la preparation de la requete:", error)
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const fallbackMessage = "Une erreur reseau est survenue."
    const baseURL = error.config?.baseURL || ""
    const requestURL = error.config?.url ? `${baseURL}${error.config.url}` : ""
    const serverMessage = error.response?.data?.message

    if (error.response?.status === 404 && requestURL) {
      error.userMessage = `Route introuvable (404): ${requestURL}`
    } else {
      error.userMessage = serverMessage || error.message || fallbackMessage
    }

    error.debugURL = requestURL
    return Promise.reject(error)
  }
)

export default api

// ==================== NOUVELLES FONCTIONS API ====================

// Système de notation
export const ratingAPI = {
  // Ajouter une notation pour une course
  addRideRating: (rideId, ratedId, rating, comment, type = 'passenger-to-driver') =>
    api.post(`/ratings/ride/${rideId}`, { ratedId, rating, comment, type }),

  // Ajouter une notation pour un service
  addServiceRating: (serviceRequestId, ratedId, rating, comment, type = 'client-to-provider') =>
    api.post(`/ratings/service/${serviceRequestId}`, { ratedId, rating, comment, type }),

  // Obtenir les statistiques de notation d'un utilisateur
  getUserRatingStats: (userId) =>
    api.get(`/ratings/stats/${userId}`),

  // Signaler une notation
  reportRating: (ratingId, reason) =>
    api.post(`/ratings/report/${ratingId}`, { reason })
};

// Système de cartes et géolocalisation
export const mapsAPI = {
  // Calculer un itinéraire
  calculateRoute: (origin, destination, options) =>
    api.post('/maps/route', { origin, destination, options }),

  // Calculer la matrice de distances
  calculateDistanceMatrix: (origins, destinations, options) =>
    api.post('/maps/distance-matrix', { origins, destinations, options }),

  // Géocodage inverse
  reverseGeocode: (lat, lng) =>
    api.get('/maps/reverse-geocode', { params: { lat, lng } }),

  // Géocodage d'adresse
  geocodeAddress: (address) =>
    api.get('/maps/geocode', { params: { address } }),

  // Recherche de lieux
  searchPlaces: (query, lat, lng, radius) =>
    api.get('/maps/places', { params: { query, lat, lng, radius } }),

  // Calculer le prix d'une course
  calculatePrice: (distanceKm, durationMin, surgeMultiplier, vehicleType) =>
    api.post('/maps/calculate-price', { distanceKm, durationMin, surgeMultiplier, vehicleType }),

  // Calculer le multiplicateur de pointe
  calculateSurgeMultiplier: (demandLevel, supplyLevel, timeOfDay) =>
    api.post('/maps/surge-multiplier', { demandLevel, supplyLevel, timeOfDay }),

  // Vérifier la zone de service
  checkServiceArea: (lat, lng) =>
    api.get('/maps/service-area', { params: { lat, lng } })
};

export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  markRead: (notificationIds) => api.post('/notifications/mark-read', { notificationIds }),
  createTestNotification: () => api.post('/notifications/test-create')
};

export const supportAPI = {
  createTicket: (subject, message, category, priority) =>
    api.post('/support/ticket', { subject, message, category, priority }),
  fetchTickets: () => api.get('/support/tickets'),
  respondTicket: (ticketId, message, status) =>
    api.post(`/support/tickets/${ticketId}/respond`, { message, status })
};

// Fonctions utilitaires pour le formatage
export const formatters = {
  formatAmount: (amount, currency = 'XOF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(amount);
  },

  formatDate: (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  formatRating: (rating) => {
    return rating ? rating.toFixed(1) : '0.0';
  }
};
