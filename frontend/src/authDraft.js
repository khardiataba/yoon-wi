export const AUTH_DRAFT_KEY = "ndar_express_auth_draft"

export const readAuthDraft = () => {
  try {
    const value = sessionStorage.getItem(AUTH_DRAFT_KEY)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.error("Impossible de lire le brouillon d'authentification:", error)
    return null
  }
}

export const saveAuthDraft = (payload) => {
  try {
    sessionStorage.setItem(AUTH_DRAFT_KEY, JSON.stringify(payload))
  } catch (error) {
    console.error("Impossible de sauvegarder le brouillon d'authentification:", error)
  }
}

export const clearAuthDraft = () => {
  try {
    sessionStorage.removeItem(AUTH_DRAFT_KEY)
  } catch (error) {
    console.error("Impossible d'effacer le brouillon d'authentification:", error)
  }
}
