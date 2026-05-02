import axios from "axios"

const stripTrailingSlashes = (value) => (value || "").trim().replace(/\/+$/, "")
const isLocalhostHost = (value) => value === "localhost" || value === "127.0.0.1"
const isLocalApiUrl = (value) => /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(String(value || "").trim())
const DEPLOY_FALLBACK_BACKEND = stripTrailingSlashes(import.meta.env.VITE_FALLBACK_BACKEND_URL || "https://yoon-wi.onrender.com")

const withApiSuffix = (value) => {
  const trimmed = stripTrailingSlashes(value)
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`
}

const getSafeConfiguredApiBase = (value) => {
  const trimmed = stripTrailingSlashes(value)
  if (!trimmed) return ""

  if (typeof window !== "undefined" && window.location?.hostname && !isLocalhostHost(window.location.hostname) && isLocalApiUrl(trimmed)) {
    console.warn("Ignoring local VITE_API_URL on a non-local host:", trimmed)
    return ""
  }

  return trimmed
}

const getDefaultApiBase = () => {
  if (typeof window !== "undefined" && window.location?.hostname) {
    const { protocol, hostname, origin } = window.location
    const isLocalhost = isLocalhostHost(hostname)
    if (isLocalhost) {
      return `${protocol}//${hostname}:5000/api`
    }

    const looksLikeLanHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(String(hostname || ""))
    if (looksLikeLanHost) {
      return `${protocol}//${hostname}:5000/api`
    }

    if (DEPLOY_FALLBACK_BACKEND) {
      console.warn(
        `VITE_API_URL is not set. Falling back to ${DEPLOY_FALLBACK_BACKEND}/api. ` +
        "Set VITE_API_URL in frontend env to use your own backend URL."
      )
      return `${DEPLOY_FALLBACK_BACKEND}/api`
    }

    console.warn(
      "VITE_API_URL is not set. Falling back to same-origin /api. " +
        "This only works if your production host also serves the backend or rewrites /api."
    )

    return `${origin}/api`
  }

  return "http://localhost:5000/api"
}

const normalizeBaseURL = (value) => {
  return withApiSuffix(getSafeConfiguredApiBase(value) || getDefaultApiBase())
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
  baseURL: normalizeBaseURL(import.meta.env.VITE_API_URL),
  timeout: 45000
})

export const getApiBaseURL = () => normalizeBaseURL(import.meta.env.VITE_API_URL)
export const getPublicAssetBaseURL = () => String(getApiBaseURL()).replace(/\/api\/?$/, "")

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

    if (error.code === "ECONNABORTED" || String(error.message || "").toLowerCase().includes("timeout")) {
      error.userMessage = "Le serveur met trop de temps a repondre. Reessayez dans quelques secondes."
    } else if (error.response?.status === 404 && requestURL) {
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
