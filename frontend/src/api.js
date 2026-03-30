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
