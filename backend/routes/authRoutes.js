const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const { authMiddleware } = require("../middleware/auth")
const upload = require("../middleware/upload")
const { runAutomaticVerification, decideAccountStatus } = require("../services/documentVerification")

const router = express.Router()

const allowedSignupRoles = new Set(["client", "provider", "driver", "other"])
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
const isStrongPassword = (value) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(String(value || "").trim())
const isValidSenegalPhone = (value) => /^(?:\+221|00221)?\s?(7[05678])\s?\d{3}\s?\d{2}\s?\d{2}$/.test(String(value || "").trim())
const isValidPlate = (value) => /^[A-Z]{1,3}-\d{2,4}-[A-Z]{1,3}$/.test(String(value || "").trim().toUpperCase())
const deliveryServiceCategories = new Set(["Coursier", "Livraison / Coursier"])

const normalizeRole = (role) => {
  if (role === "provider") return "technician"
  return role || "client"
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
  otherServiceDetail: String(details.otherServiceDetail || "").trim(),
  hasProfessionalTools: Boolean(details.hasProfessionalTools)
})

const validateSignupPayload = ({ firstName, lastName, email, password, phone, role, providerDetails = {} }) => {
  const errors = []
  const normalizedRole = normalizeRole(role)
  const cleanedFirstName = String(firstName || "").trim()
  const cleanedLastName = String(lastName || "").trim()
  const cleanedEmail = String(email || "").trim()
  const cleanedPassword = String(password || "").trim()
  const cleanedPhone = String(phone || "").trim()
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

  if (!allowedSignupRoles.has(role)) {
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

router.post("/register", async (req, res) => {
  try {
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

    const existing = await User.findOne({ email: validation.cleanedEmail })
    if (existing) {
      return res.status(400).json({ message: "Email déjà utilisé" })
    }

    const hashed = await bcrypt.hash(validation.cleanedPassword, 10)

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
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Identifiants invalides" })
    }

    const match = await bcrypt.compare(password, user.password)
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

router.post(
  "/upload-docs",
  authMiddleware,
  upload.fields([
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

      const automaticChecks = await runAutomaticVerification(files)
      user.documentChecks = {
        ...(user.documentChecks || {}),
        ...automaticChecks
      }

      if (user.status === "needs_revision") {
        user.status = "pending"
      }
      user.reviewNote = ""

      const automaticDecision = decideAccountStatus(user)
      user.status = automaticDecision.status
      user.reviewNote = automaticDecision.reviewNote

      await user.save()

      return res.json({
        profilePhotoUrl: user.profilePhotoUrl,
        idCardFrontUrl: user.idCardFrontUrl,
        idCardBackUrl: user.idCardBackUrl,
        licenseUrl: user.licenseUrl,
        registrationCardUrl: user.registrationCardUrl,
        documentChecks: user.documentChecks
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: err.message || "Erreur serveur" })
    }
  }
)

module.exports = router
