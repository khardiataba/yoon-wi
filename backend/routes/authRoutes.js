const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const { authMiddleware } = require("../middleware/auth")
const upload = require("../middleware/upload")
const { runAutomaticVerification, decideAccountStatus } = require("../services/documentVerification")

const router = express.Router()

const normalizeRole = (role) => {
  if (role === "provider") return "technician"
  return role || "client"
}

const sanitizeProviderDetails = (details = {}) => ({
  serviceCategory: details.serviceCategory || "",
  experienceYears: details.experienceYears || "",
  serviceArea: details.serviceArea || "",
  availability: details.availability || "",
  vehicleType: details.vehicleType || "",
  vehiclePlate: details.vehiclePlate || "",
  beautySpecialty: details.beautySpecialty || "",
  hasProfessionalTools: Boolean(details.hasProfessionalTools)
})

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

    const normalizedRole = normalizeRole(role)
    const resolvedFirstName = firstName || String(name || "").split(" ")[0] || ""
    const resolvedLastName = lastName || String(name || "").split(" ").slice(1).join(" ") || ""
    const fullName = `${resolvedFirstName} ${resolvedLastName}`.trim()

    if (!resolvedFirstName || !resolvedLastName) {
      return res.status(400).json({ message: "Le nom et le prenom sont requis" })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(400).json({ message: "Email déjà utilisé" })
    }

    const hashed = await bcrypt.hash(password, 10)

    const user = await User.create({
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      name: fullName,
      email,
      password: hashed,
      phone,
      role: normalizedRole,
      providerDetails: sanitizeProviderDetails(providerDetails),
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
