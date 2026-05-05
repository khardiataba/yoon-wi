const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const User = require("../models/User")
const { authMiddleware } = require("../middleware/auth")
const upload = require("../middleware/upload")

const router = express.Router()

const BCRYPT_ROUNDS = Math.min(Math.max(Number(process.env.BCRYPT_ROUNDS) || 10, 10), 12)
const LOGIN_USER_FIELDS = [
  "_id",
  "firstName",
  "lastName",
  "name",
  "email",
  "password",
  "phone",
  "role",
  "status",
  "reviewNote",
  "safetyReportsCount",
  "safetySuspendedAt",
  "safetySuspensionReason",
  "safetyLastReportAt",
  "profilePhotoUrl",
  "idCardUrl",
  "idCardFrontUrl",
  "idCardBackUrl",
  "licenseUrl",
  "registrationCardUrl",
  "providerDetails",
  "documentChecks"
].join(" ")

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next)
}

const allowedSignupRoles = new Set(["client", "provider", "driver", "other", "technician", "server"])
const allowedProviderCategories = new Set([
  "Plomberie",
  "Electricite",
  "Menuiserie",
  "Maconnerie",
  "Peinture",
  "Soudure",
  "Jardinage",
  "Coiffure & Beaute",
  "Restauration / Patisserie",
  "Livraison / Coursier",
  "Coursier",
  "Autre service",
  "Assistant",
  "Traducteur",
  "Imprimeur",
  "Informatique",
  "Cours / Soutien",
  "Menage",
  "Baby-sitting",
  "Aide a domicile",
  "Evenementiel",
  "Autre activite"
])

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim())
const normalizeEmail = (value) => String(value || "").trim().toLowerCase()
const getPrimaryFrontendBaseUrl = () => {
  const raw = String(process.env.FRONTEND_URL || "http://localhost:3000")
  const first = raw
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean)
  return (first || "http://localhost:3000").replace(/\/+$/, "")
}
const buildEmailLookup = (value) => {
  const rawEmail = String(value || "").trim()
  const normalizedEmail = normalizeEmail(rawEmail)
  const candidates = Array.from(new Set([normalizedEmail, rawEmail].filter(Boolean)))

  return candidates.length === 1 ? { email: candidates[0] } : { email: { $in: candidates } }
}
const isStrongPassword = (value) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(String(value || "").trim())
const normalizeSenegalPhone = (value) => {
  const raw = String(value || "").trim()
  if (!raw) return ""

  const keepLeadingPlus = raw.startsWith("+")
  const compact = raw.replace(/[^\d+]/g, "")
  const normalized = keepLeadingPlus ? `+${compact.replace(/\+/g, "")}` : compact.replace(/\+/g, "")

  if (normalized.startsWith("+221")) {
    return `+221${normalized.slice(4)}`
  }

  if (normalized.startsWith("00221")) {
    return `+221${normalized.slice(5)}`
  }

  if (/^7\d{8}$/.test(normalized)) {
    return `+221${normalized}`
  }

  return normalized
}

const isValidSenegalPhone = (value) => /^\+2217[05678]\d{7}$/.test(normalizeSenegalPhone(value))
const isValidPlate = (value) => /^[A-Z]{1,3}-\d{2,4}-[A-Z]{1,3}$/.test(String(value || "").trim().toUpperCase())
const deliveryServiceCategories = new Set(["Coursier", "Livraison / Coursier"])

const normalizeRole = (role) => {
  const cleanedRole = String(role || "").trim().toLowerCase()
  if (cleanedRole === "provider" || cleanedRole === "other" || cleanedRole === "server") return "technician"
  return cleanedRole || "client"
}

const sanitizeProviderDetails = (details = {}) => ({
  serviceCategory: String(details.serviceCategory || "").trim(),
  experienceYears: String(details.experienceYears || "").trim(),
  serviceArea: String(details.serviceArea || "").trim(),
  locationLabel: String(details.locationLabel || "").trim(),
  coordinates:
    details.coordinates && Number.isFinite(Number(details.coordinates.lat)) && Number.isFinite(Number(details.coordinates.lng))
      ? {
          lat: Number(details.coordinates.lat),
          lng: Number(details.coordinates.lng)
        }
      : undefined,
  availability: String(details.availability || "").trim(),
  vehicleBrand: String(details.vehicleBrand || "").trim(),
  vehicleType: String(details.vehicleType || "").trim(),
  vehiclePlate: String(details.vehiclePlate || "").trim().toUpperCase(),
  beautySpecialty: String(details.beautySpecialty || "").trim(),
  otherServiceDetail: String(details.otherServiceDetail || details.otherServiceName || "").trim(),
  hasProfessionalTools: Boolean(details.hasProfessionalTools)
})

const validateSignupPayload = ({ firstName, lastName, email, password, phone, role, providerDetails = {} }) => {
  const errors = []
  const cleanedRole = String(role || "").trim().toLowerCase()
  const normalizedRole = normalizeRole(cleanedRole)
  const cleanedFirstName = String(firstName || "").trim()
  const cleanedLastName = String(lastName || "").trim()
  const cleanedEmail = normalizeEmail(email)
  const cleanedPassword = String(password || "").trim()
  const cleanedPhone = normalizeSenegalPhone(phone)
  const normalizedProviderDetails = sanitizeProviderDetails(providerDetails)

  if (!cleanedFirstName || !cleanedLastName) {
    errors.push("Le prenom et le nom sont obligatoires.")
  }

  if (!cleanedEmail || !isValidEmail(cleanedEmail)) {
    errors.push("Veuillez saisir un email valide.")
  }

  if (!cleanedPassword || !isStrongPassword(cleanedPassword)) {
    errors.push("Le mot de passe doit contenir au moins 8 caracteres avec une lettre et un chiffre.")
  }

  if (!cleanedPhone || !isValidSenegalPhone(cleanedPhone)) {
    errors.push("Veuillez saisir un numero senegalais valide.")
  }

  if (!allowedSignupRoles.has(cleanedRole)) {
    errors.push("Role d'inscription invalide.")
  }

  if (normalizedRole === "technician") {
    if (!allowedProviderCategories.has(normalizedProviderDetails.serviceCategory)) {
      errors.push("Choisissez un domaine professionnel valide.")
    }

    if (!normalizedProviderDetails.serviceArea) {
      errors.push("La zone de couverture est obligatoire.")
    }

    if (!normalizedProviderDetails.availability) {
      errors.push("Les disponibilites sont obligatoires.")
    }

    if (!normalizedProviderDetails.experienceYears) {
      errors.push("Le niveau d'experience est obligatoire.")
    }

    if (!normalizedProviderDetails.hasProfessionalTools) {
      errors.push("Confirmez disposer du materiel necessaire.")
    }

    if (normalizedProviderDetails.serviceCategory === "Coiffure & Beaute" && !normalizedProviderDetails.beautySpecialty) {
      errors.push("Precisez votre specialite beaute.")
    }

    if (
      ["Autre service", "Autre activite", "Menage", "Baby-sitting", "Aide a domicile", "Evenementiel", "Cours / Soutien"].includes(
        normalizedProviderDetails.serviceCategory
      ) &&
      !normalizedProviderDetails.otherServiceDetail
    ) {
      errors.push("Precisez votre activite ou votre domaine de service.")
    }

    if (deliveryServiceCategories.has(normalizedProviderDetails.serviceCategory)) {
      if (!normalizedProviderDetails.vehicleBrand || !normalizedProviderDetails.vehicleType || !normalizedProviderDetails.vehiclePlate) {
        errors.push("Les prestataires de livraison doivent renseigner le vehicule et son immatriculation.")
      }

      if (normalizedProviderDetails.vehiclePlate && !isValidPlate(normalizedProviderDetails.vehiclePlate)) {
        errors.push("Le format de l'immatriculation est invalide.")
      }
    }
  }

  if (normalizedRole === "driver") {
    if (!normalizedProviderDetails.vehicleBrand || !normalizedProviderDetails.vehicleType || !normalizedProviderDetails.vehiclePlate) {
      errors.push("Les chauffeurs doivent renseigner le vehicule et son immatriculation.")
    }

    if (normalizedProviderDetails.vehiclePlate && !isValidPlate(normalizedProviderDetails.vehiclePlate)) {
      errors.push("Le format de l'immatriculation est invalide.")
    }

    if (!normalizedProviderDetails.serviceArea) {
      errors.push("La zone de couverture est obligatoire.")
    }

    if (!normalizedProviderDetails.availability) {
      errors.push("Les disponibilites sont obligatoires.")
    }

    if (!normalizedProviderDetails.experienceYears) {
      errors.push("Le niveau d'experience est obligatoire.")
    }

    if (!normalizedProviderDetails.hasProfessionalTools) {
      errors.push("Confirmez disposer du vehicule et des moyens necessaires.")
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    normalizedRole,
    normalizedProviderDetails,
    cleanedFirstName,
    cleanedLastName,
    cleanedEmail,
    cleanedPassword,
    cleanedPhone
  }
}

const serializeUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  reviewNote: user.reviewNote,
  safetyReportsCount: user.safetyReportsCount || 0,
  safetySuspendedAt: user.safetySuspendedAt || null,
  safetySuspensionReason: user.safetySuspensionReason || "",
  safetyLastReportAt: user.safetyLastReportAt || null,
  profilePhotoUrl: user.profilePhotoUrl,
  idCardFrontUrl: user.idCardFrontUrl || user.idCardUrl || "",
  idCardBackUrl: user.idCardBackUrl || user.idCardUrl || "",
  licenseUrl: user.licenseUrl,
  registrationCardUrl: user.registrationCardUrl,
  providerDetails: user.providerDetails || {},
  documentChecks: user.documentChecks || {}
})

const createToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  )
}

const buildPendingDocumentChecks = (files = {}) => {
  const nextChecks = {}
  const documentKeys = ["profilePhoto", "idCardFront", "idCardBack", "license", "registrationCard"]

  documentKeys.forEach((documentKey) => {
    if (files[documentKey]?.[0]) {
      nextChecks[documentKey] = {
        status: "pending",
        note: "Document recu. Validation admin requise.",
        reviewedAt: null
      }
    }
  })

  return nextChecks
}

router.post("/register", asyncHandler(async (req, res) => {
    const { firstName, lastName, name, email, password, phone, role, providerDetails } = req.body
    if ((!firstName && !name) || !email || !password) {
      return res.status(400).json({ message: "Nom, email et mot de passe requis" })
    }

    const resolvedFirstName = firstName || String(name || "").split(" ")[0] || ""
    const resolvedLastName = lastName || String(name || "").split(" ").slice(1).join(" ") || ""
    const fullName = `${resolvedFirstName} ${resolvedLastName}`.trim()

    const validation = validateSignupPayload({
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      email,
      password,
      phone,
      role,
      providerDetails
    })

    if (!validation.ok) {
      return res.status(400).json({ message: validation.errors[0], errors: validation.errors })
    }

    const normalizedRole = validation.normalizedRole

    const existing = await User.exists(buildEmailLookup(validation.cleanedEmail))
    if (existing) {
      return res.status(400).json({ message: "Email déjà utilisé" })
    }

    const hashed = await bcrypt.hash(validation.cleanedPassword, BCRYPT_ROUNDS)

    const user = await User.create({
      firstName: validation.cleanedFirstName,
      lastName: validation.cleanedLastName,
      name: fullName,
      email: validation.cleanedEmail,
      password: hashed,
      phone: validation.cleanedPhone,
      role: normalizedRole,
      providerDetails: validation.normalizedProviderDetails,
      status: ["driver", "technician"].includes(normalizedRole) ? "pending" : "verified"
    })

    const token = createToken(user)
    return res.status(201).json({ user: serializeUser(user), token })
}))

router.post("/login", asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" })
    }

    const normalizedEmail = normalizeEmail(email)
    const user = await User.findOne(buildEmailLookup(email)).select(LOGIN_USER_FIELDS).lean()
    if (!user) {
      return res.status(400).json({ message: "Identifiants invalides" })
    }

    const match = await bcrypt.compare(String(password), user.password)
    if (!match) {
      return res.status(400).json({ message: "Identifiants invalides" })
    }

    if (user.status === "cancelled") {
      return res.status(403).json({ message: "Inscription annulee. Merci de recommencer avec des informations correctes." })
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Compte suspendu pour raison de sécurité. Contactez le support." })
    }

    const token = createToken(user)
    return res.json({ user: serializeUser(user), token })
}))

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ message: "Email requis" })
    }

    const normalizedEmail = normalizeEmail(email)
    const user = await User.exists(buildEmailLookup(email))
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ message: "Si l'email existe, un lien de réinitialisation a été envoyé" })
    }

    // Generate reset token (valid for 30 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000)
        }
      }
    )

    // In production, send email here
    const resetUrl = `${getPrimaryFrontendBaseUrl()}/reset-password/${resetToken}`
    console.log(`[PASSWORD RESET] ${normalizedEmail}: ${resetUrl}`)

    return res.json({ message: "Si l'email existe, un lien de réinitialisation a été envoyé" })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params
    const { password } = req.body

    if (!token || !password) {
      return res.status(400).json({ message: "Token et nouveau mot de passe requis" })
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caracteres avec une lettre et un chiffre" })
    }

    // Hash token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json({ message: "Lien de réinitialisation invalide ou expiré" })
    }

    // Update password
    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS)
    user.passwordResetToken = null
    user.passwordResetExpires = null
    user.lastPasswordChangeAt = new Date()
    await user.save()

    return res.json({ message: "Mot de passe réinitialisé avec succès" })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

router.get("/me", authMiddleware, async (req, res) => {
  return res.json(serializeUser(req.user))
})

router.patch("/me", authMiddleware, async (req, res) => {
  try {
    const { phone, providerDetails = {} } = req.body || {}

    if (typeof phone === "string") {
      req.user.phone = phone.trim()
    }

    const nextProviderDetails = sanitizeProviderDetails({
      ...(req.user.providerDetails ? req.user.providerDetails.toObject?.() || req.user.providerDetails : {}),
      ...providerDetails
    })

    req.user.providerDetails = nextProviderDetails
    await req.user.save()

    return res.json(serializeUser(req.user))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: err.message || "Erreur serveur" })
  }
})

router.post("/upload-docs", authMiddleware,upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "idCardFront", maxCount: 1 },
    { name: "idCardBack", maxCount: 1 },
    { name: "license", maxCount: 1 },
    { name: "registrationCard", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const user = req.user
      const files = req.files || {}

      if (files.profilePhoto && files.profilePhoto[0]) {
        user.profilePhotoUrl = `/uploads/${files.profilePhoto[0].filename}`
      }
      if (files.idCardFront && files.idCardFront[0]) {
        user.idCardFrontUrl = `/uploads/${files.idCardFront[0].filename}`
      }
      if (files.idCardBack && files.idCardBack[0]) {
        user.idCardBackUrl = `/uploads/${files.idCardBack[0].filename}`
      }
      if (files.license && files.license[0]) {
        user.licenseUrl = `/uploads/${files.license[0].filename}`
      }
      if (files.registrationCard && files.registrationCard[0]) {
        user.registrationCardUrl = `/uploads/${files.registrationCard[0].filename}`
      }

      const pendingChecks = buildPendingDocumentChecks(files)
      user.documentChecks = {
        ...(user.documentChecks || {}),
        ...pendingChecks
      }

      if (["driver", "technician"].includes(user.role) && !["cancelled", "suspended"].includes(user.status)) {
        user.status = "pending"
      }
      user.reviewNote = "Documents recus. Validation admin requise."

      await user.save()

      return res.json({
        profilePhotoUrl: user.profilePhotoUrl,
        idCardFrontUrl: user.idCardFrontUrl,
        idCardBackUrl: user.idCardBackUrl,
        licenseUrl: user.licenseUrl,
        registrationCardUrl: user.registrationCardUrl,
        documentChecks: user.documentChecks,
        verificationStatus: user.status,
        reviewNote: user.reviewNote
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: err.message || "Erreur serveur" })
    }
  }
)

module.exports = router
