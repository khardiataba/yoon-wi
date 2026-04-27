import { getPublicAssetBaseURL } from "../api"

const ABSOLUTE_URL_REGEX = /^(https?:)?\/\//i

export const resolveMediaUrl = (value) => {
  const path = String(value || "").trim()
  if (!path) return ""

  if (path.startsWith("data:") || path.startsWith("blob:") || ABSOLUTE_URL_REGEX.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${getPublicAssetBaseURL()}${normalizedPath}`
}

