const jwt = require("jsonwebtoken")
const User = require("../models/User")

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant" })
  }

  const token = authHeader.split(" ")[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    if (!user) return res.status(401).json({ message: "Utilisateur non trouvé" })

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ message: "Token invalide" })
  }
}

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Non authentifié" })
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Accès refusé" })
    }
    next()
  }
}

const requireVerified = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Non authentifié" })
  if (req.user.status !== "verified") {
    return res.status(403).json({ message: "Compte non validé" })
  }
  next()
}

module.exports = {
  authMiddleware,
  requireRole,
  requireVerified
}
