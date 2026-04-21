const express = require("express")
const crypto = require("crypto")
const ServiceRequest = require("../models/ServiceRequest")
const Message = require("../models/Message")
const User = require("../models/User")
const { authMiddleware, requireRole, requireVerified } = require("../middleware/auth")
const { serviceCommission } = require("../utils/pricing")
const { createCheckoutSession, getStripeConfig } = require("../utils/stripePayments")

const router = express.Router()

const serviceFamilyByCategory = {
  menuisier: "artisan",
  "maçon": "artisan",
  peintre: "artisan",
  "pâtissier": "food",
  "électricien": "artisan",
  "coiffure-beaute": "beauty",
  livreur: "delivery",
  autres: "other"
}

const serviceLabelByFamily = {
  artisan: "Artisan",
  food: "Restauration",
  beauty: "Beauté",
  delivery: "Livraison",
  other: "Autres services"
}

const providerFamilyByServiceCategory = {
  Plomberie: "artisan",
  Electricite: "artisan",
  Menuiserie: "artisan",
  Maconnerie: "artisan",
  Peinture: "artisan",
  Soudure: "artisan",
  Jardinage: "other",
  "Coiffure & Beaute": "beauty",
  "Restauration / Patisserie": "food",
  "Autre service": "other",
  Coursier: "delivery",
  "Livraison / Coursier": "delivery",
  Assistant: "other",
  Traducteur: "other",
  Imprimeur: "other",
  Informatique: "other",
  "Cours / Soutien": "other",
  Menage: "other",
  "Baby-sitting": "other",
  "Aide a domicile": "other",
  Evenementiel: "other",
  "Autre activite": "other"
}

const getServiceFamily = (category) => serviceFamilyByCategory[String(category || "").trim()] || "other"

const getProviderFamily = (user) => {
  const serviceCategory = String(user?.providerDetails?.serviceCategory || "").trim()
  return providerFamilyByServiceCategory[serviceCategory] || "other"
}

const areaCoordinates = {
  "Centre-ville": { lat: 16.0244, lng: -16.5015 },
  "Guet-Ndar": { lat: 16.0188, lng: -16.4919 },
  Hydrobase: { lat: 16.042, lng: -16.5065 },
  Sor: { lat: 16.0068, lng: -16.5205 },
  Balacoss: { lat: 16.0149, lng: -16.5072 },
  Ndioloffene: { lat: 16.0312, lng: -16.5078 },
  "Universite / Sanar": { lat: 16.0567, lng: -16.4568 },
  Gandon: { lat: 16.018, lng: -16.3728 },
  "Toute la ville de Saint-Louis": { lat: 16.0244, lng: -16.5015 }
}

const familyCoordinates = {
  artisan: { lat: 16.0244, lng: -16.5015 },
  food: { lat: 16.0308, lng: -16.5001 },
  beauty: { lat: 16.0149, lng: -16.5072 },
  delivery: { lat: 16.0262, lng: -16.4992 },
  other: { lat: 16.0244, lng: -16.5015 }
}

const haversineDistanceKm = (left, right) => {
  if (!left || !right) return null

  const toRadians = (value) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const deltaLat = toRadians((right.lat || 0) - (left.lat || 0))
  const deltaLng = toRadians((right.lng || 0) - (left.lng || 0))
  const leftLat = toRadians(left.lat || 0)
  const rightLat = toRadians(right.lat || 0)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const normalizeCoordinates = (location, fallback = null) => {
  if (!location) return fallback

  const lat = Number(location.lat)
  const lng = Number(location.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng }
  }

  return fallback
}

const resolveProviderCoordinates = (provider) => {
  const directCoordinates = normalizeCoordinates(provider?.providerDetails?.coordinates)
  if (directCoordinates) return directCoordinates

  const area = String(provider?.providerDetails?.serviceArea || "").trim()
  return areaCoordinates[area] || familyCoordinates[getProviderFamily(provider)] || familyCoordinates.other
}

const resolveAvailabilityBadge = (availability) => {
  const value = String(availability || "").trim()
  if (!value) return { label: "Disponible", tone: "available" }
  if (/temps plein|etendue/i.test(value)) return { label: "Tres disponible", tone: "high" }
  if (/7h|jour/i.test(value)) return { label: "Disponible", tone: "available" }
  if (/5h/i.test(value)) return { label: "Partiel", tone: "medium" }
  return { label: value, tone: "available" }
}

const buildUserSummary = (user) => {
  const plain = typeof user?.toObject === "function" ? user.toObject() : { ...user }

  return {
    id: plain._id,
    name: plain.name || `${plain.firstName || ""} ${plain.lastName || ""}`.trim(),
    firstName: plain.firstName || "",
    lastName: plain.lastName || "",
    role: plain.role,
    status: plain.status,
    profilePhotoUrl: plain.profilePhotoUrl || "",
    phone: plain.phone || "",
    serviceCategory: plain.providerDetails?.serviceCategory || "",
    serviceArea: plain.providerDetails?.serviceArea || "",
    locationLabel: plain.providerDetails?.locationLabel || plain.providerDetails?.serviceArea || "Saint-Louis",
    coordinates: normalizeCoordinates(plain.providerDetails?.coordinates),
    availability: plain.providerDetails?.availability || "",
    experienceYears: plain.providerDetails?.experienceYears || "",
    beautySpecialty: plain.providerDetails?.beautySpecialty || "",
    otherServiceDetail: plain.providerDetails?.otherServiceDetail || "",
    hasProfessionalTools: Boolean(plain.providerDetails?.hasProfessionalTools)
  }
}

const serializeProvider = (provider, viewerCoords = null) => {
  const plain = typeof provider?.toObject === "function" ? provider.toObject() : { ...provider }
  const coordinates = resolveProviderCoordinates(plain)
  const distanceKm = viewerCoords ? haversineDistanceKm(viewerCoords, coordinates) : null
  const family = getProviderFamily(plain)
  const availability = resolveAvailabilityBadge(plain.providerDetails?.availability)

  return {
    id: plain._id,
    userId: plain._id,
    name: plain.name || `${plain.firstName || ""} ${plain.lastName || ""}`.trim(),
    firstName: plain.firstName || "",
    lastName: plain.lastName || "",
    role: plain.role,
    status: plain.status,
    profilePhotoUrl: plain.profilePhotoUrl || "",
    serviceCategory: plain.providerDetails?.serviceCategory || "",
    serviceArea: plain.providerDetails?.serviceArea || "",
    availability: plain.providerDetails?.availability || "",
    availabilityLabel: availability.label,
    availabilityTone: availability.tone,
    experienceYears: plain.providerDetails?.experienceYears || "",
    beautySpecialty: plain.providerDetails?.beautySpecialty || "",
    otherServiceDetail: plain.providerDetails?.otherServiceDetail || "",
    hasProfessionalTools: Boolean(plain.providerDetails?.hasProfessionalTools),
    locationLabel: plain.providerDetails?.locationLabel || plain.providerDetails?.serviceArea || "Saint-Louis",
    coordinates,
    distanceKm,
    distanceLabel: distanceKm != null ? `${distanceKm.toFixed(1)} km` : null,
    estimatedArrivalMin: distanceKm != null ? Math.max(5, Math.round(distanceKm * 6)) : null,
    serviceFamily: family,
    serviceFamilyLabel: serviceLabelByFamily[family] || "Service",
    serviceAreaLabel: plain.providerDetails?.serviceArea || "Saint-Louis",
    isOpen: Boolean(plain.providerDetails?.availability),
    highlight: distanceKm != null && distanceKm <= 3
  }
}

const generateSafetyCode = () => crypto.randomInt(1000, 10000).toString()

const applyQuotedPrice = (request, quotedPrice) => {
  const finalPrice = Math.max(0, Number(quotedPrice) || 0)
  const commission = serviceCommission(finalPrice)
  request.quotedPrice = finalPrice
  request.price = finalPrice
  request.quoteAcceptedAt = null
  request.appCommissionPercent = commission.appCommissionPercent
  request.appCommissionAmount = commission.appCommissionAmount
  request.providerNetAmount = commission.providerNetAmount
  return request
}

const buildParticipantSummary = (user) => {
  if (!user) return null
  const plain = typeof user.toObject === "function" ? user.toObject() : { ...user }
  return {
    id: plain._id,
    name: plain.name || `${plain.firstName || ""} ${plain.lastName || ""}`.trim(),
    firstName: plain.firstName || "",
    lastName: plain.lastName || "",
    role: plain.role,
    status: plain.status,
    profilePhotoUrl: plain.profilePhotoUrl || "",
    serviceCategory: plain.providerDetails?.serviceCategory || "",
    serviceArea: plain.providerDetails?.serviceArea || "",
    locationLabel: plain.providerDetails?.locationLabel || plain.providerDetails?.serviceArea || "Saint-Louis",
    coordinates: normalizeCoordinates(plain.providerDetails?.coordinates),
    availability: plain.providerDetails?.availability || "",
    experienceYears: plain.providerDetails?.experienceYears || "",
    beautySpecialty: plain.providerDetails?.beautySpecialty || "",
    otherServiceDetail: plain.providerDetails?.otherServiceDetail || "",
    hasProfessionalTools: Boolean(plain.providerDetails?.hasProfessionalTools)
  }
}

const loadServiceParticipants = async (request) => {
  const ids = [request?.clientId, request?.technicianId, request?.preferredProviderId]
    .filter(Boolean)
    .map((value) => String(value))

  if (!ids.length) {
    return { client: null, technician: null, preferredProvider: null }
  }

  const users = await User.find({ _id: { $in: ids } }).select(
    "firstName lastName name role status profilePhotoUrl providerDetails"
  )
  const summaries = new Map(users.map((user) => [String(user._id), buildParticipantSummary(user)]))

  return {
    client: summaries.get(String(request?.clientId || "")) || null,
    technician: summaries.get(String(request?.technicianId || "")) || null,
    preferredProvider: summaries.get(String(request?.preferredProviderId || "")) || null
  }
}

const serializeServiceRequest = async (request, viewerRole = "client", viewerUserId = null) => {
  const plain = typeof request?.toObject === "function" ? request.toObject() : { ...request }
  const isPrivilegedViewer = ["technician", "server", "admin"].includes(viewerRole)
  const participants = await loadServiceParticipants(plain)

  if (!isPrivilegedViewer) {
    delete plain.appCommissionPercent
    delete plain.appCommissionAmount
    delete plain.providerNetAmount
    delete plain.platformContributionStatus
    delete plain.platformContributionAmountPaid
    delete plain.platformContributionPaymentMethod
    delete plain.platformContributionCollectedAt
    delete plain.platformContributionReference
  }

  const assignedProvider = participants.technician || participants.preferredProvider || null

  if (assignedProvider) {
    plain.assignedProvider = assignedProvider
  }

  if (isPrivilegedViewer || String(plain.clientId || "") === String(participants.client?.id || "")) {
    plain.client = participants.client
  }

  if (isPrivilegedViewer || String(plain.technicianId || "") === String(participants.technician?.id || "")) {
    plain.technician = participants.technician
  }

  if (String(plain.preferredProviderId || "") === String(participants.preferredProvider?.id || "")) {
    plain.preferredProvider = participants.preferredProvider
  }

  if (!isPrivilegedViewer && String(plain.clientId || "") !== String(participants.client?.id || "")) {
    delete plain.client
  }

  if (!isPrivilegedViewer && String(plain.technicianId || "") !== String(participants.technician?.id || "")) {
    delete plain.technician
  }

  if (!isPrivilegedViewer && String(plain.preferredProviderId || "") !== String(participants.preferredProvider?.id || "")) {
    delete plain.preferredProvider
  }

  if (!isPrivilegedViewer && String(plain.clientId || "") !== String(viewerUserId || "")) {
    delete plain.safetyCode
  }

  return plain
}

const maskSensitiveContact = (text) => {
  const value = String(text || "")
  return value
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, "[contact masqué]")
    .replace(/(?:whatsapp|wa|tel|tél|telephone|phone)\s*[:\-]?\s*[\+\d][\d\s().-]{6,}/gi, "[contact masqué]")
}

// Créer une demande de service (client)
router.post("/", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { category, title, description, preferredProviderId, preferredProviderName, preferredDistanceKm } = req.body
    const serviceFamily = getServiceFamily(category)
    const allowedCategories = Object.keys(serviceFamilyByCategory)

    if (!category || !description) {
      return res.status(400).json({ message: "Category et description requis" })
    }

    if (!allowedCategories.includes(String(category).trim())) {
      return res.status(400).json({ message: "Categorie de service invalide" })
    }

    const safetyCode = generateSafetyCode()

    const request = await ServiceRequest.create({
      clientId: req.user._id,
      category,
      serviceFamily,
      title: maskSensitiveContact(title).slice(0, 140),
      description: maskSensitiveContact(description).slice(0, 1000),
      clientBudget: 0,
      price: 0,
      quotedPrice: 0,
      appCommissionPercent: 0,
      appCommissionAmount: 0,
      providerNetAmount: 0,
      platformContributionStatus: "due",
      status: "pending",
      safetyCode,
      preferredProviderId: preferredProviderId || null,
      preferredProviderName: String(preferredProviderName || "").trim(),
      preferredDistanceKm: Number.isFinite(Number(preferredDistanceKm)) ? Number(preferredDistanceKm) : null
    })

    return res.status(201).json({
      ...(await serializeServiceRequest(request, req.user.role, req.user._id)),
      safetyCode,
      safetyHint: "Partage ce code uniquement au prestataire qui va vraiment prendre ta demande."
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

// Lister les demandes du client ou du technicien
router.get("/", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { role, _id } = req.user
    const filter = ["technician", "server"].includes(role) ? { technicianId: _id } : { clientId: _id }
    const requests = await ServiceRequest.find(filter).sort({ createdAt: -1 })
    const serializedRequests = await Promise.all(
      requests.map((request) => serializeServiceRequest(request, req.user.role, req.user._id))
    )
    return res.json(serializedRequests)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

router.get(
  "/providers",
  authMiddleware,
  requireVerified,
  async (req, res) => {
    try {
      const category = String(req.query.category || "").trim()
      const providerFamily = category ? getServiceFamily(category) : null
      const viewerCoords = normalizeCoordinates(
        {
          lat: req.query.lat,
          lng: req.query.lng
        },
        familyCoordinates.other
      )
      const providers = await User.find({
        role: "technician",
        status: "verified"
      }).sort({ firstName: 1, lastName: 1 })

      const filteredProviders = providers
        .map((provider) => serializeProvider(provider, viewerCoords))
        .filter((provider) => {
          if (!providerFamily) return true
          return provider.serviceFamily === providerFamily
        })
        .filter((provider) => provider.status === "verified")
        .sort((left, right) => {
          const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY
          const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY
          return leftDistance - rightDistance
        })

      return res.json({
        viewerCoords,
        providerFamily,
        providers: filteredProviders
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

// Demandes disponibles (techniciens)
router.get("/available",authMiddleware,requireVerified,requireRole(["technician", "server"]), async (req, res) => {
    try {
      const providerFamily = getProviderFamily(req.user)
      const requests = await ServiceRequest.find({ status: "pending" }).sort({ createdAt: -1 })
      const filteredRequests = requests.filter((request) => {
        const family = request.serviceFamily || getServiceFamily(request.category)
        const matchesAssignedProvider =
          !request.preferredProviderId || String(request.preferredProviderId) === String(req.user._id || "")
        return family === providerFamily && matchesAssignedProvider
      })

      const serializedRequests = await Promise.all(
        filteredRequests.map(async (request) => ({
          ...(await serializeServiceRequest(request, req.user.role, req.user._id)),
          serviceFamilyLabel: serviceLabelByFamily[request.serviceFamily || getServiceFamily(request.category)] || "Service"
        }))
      )

      return res.json(serializedRequests)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

// Accepter une demande (technicien)
router.patch( "/:id/accept", authMiddleware,requireVerified,requireRole(["technician", "server"]),async (req, res) => {
    try {
      const request = await ServiceRequest.findById(req.params.id)
      if (!request) return res.status(404).json({ message: "Demande non trouvée" })
      if (request.status !== "pending") {
        return res.status(400).json({ message: "Demande non disponible" })
      }

      const quotedPrice = Number(req.body?.quotedPrice)
      if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) {
        return res.status(400).json({ message: "Le prix proposé doit être supérieur à zéro" })
      }

      request.technicianId = req.user._id
      request.status = "quoted"
      request.quotedBy = req.user._id
      request.quotedAt = new Date()
      request.quoteAcceptedAt = null
      request.quoteNote = String(req.body?.quoteNote || "").trim().slice(0, 300)
      applyQuotedPrice(request, quotedPrice)
      await request.save()

      return res.json(await serializeServiceRequest(request, req.user.role, req.user._id))
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.patch(
  "/:id/approve-quote",
  authMiddleware,
  requireVerified,
  async (req, res) => {
    try {
      const request = await ServiceRequest.findById(req.params.id)
      if (!request) return res.status(404).json({ message: "Demande non trouvée" })

      if (String(request.clientId || "") !== String(req.user._id || "")) {
        return res.status(403).json({ message: "Accès refusé" })
      }

      if (request.status !== "quoted") {
        return res.status(400).json({ message: "Aucun devis à valider" })
      }

      request.status = "accepted"
      request.quoteAcceptedAt = new Date()
      await request.save()

      return res.json(await serializeServiceRequest(request, req.user.role, req.user._id))
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.patch(
  "/:id/start",
  authMiddleware,
  requireVerified,
  requireRole(["technician", "server"]),
  async (req, res) => {
    try {
      const { safetyCode } = req.body || {}
      const request = await ServiceRequest.findById(req.params.id).select("+safetyCode")
      if (!request) {
        return res.status(404).json({ message: "Demande non trouvée" })
      }

      if (String(request.technicianId || "") !== String(req.user._id || "")) {
        return res.status(403).json({ message: "Cette mission ne vous est pas attribuée" })
      }

      if (request.status !== "accepted") {
        return res.status(400).json({ message: "La mission doit d'abord être acceptée" })
      }

      if (!safetyCode || String(safetyCode).trim() !== String(request.safetyCode || "")) {
        return res.status(403).json({ message: "Code de sécurité invalide" })
      }

      request.status = "in_progress"
      request.safetyCodeVerifiedAt = new Date()
      await request.save()

      return res.json(await serializeServiceRequest(request, req.user.role, req.user._id))
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.patch(
  "/:id/confirm-payment",
  authMiddleware,
  requireVerified,
  async (req, res) => {
    try {
      const request = await ServiceRequest.findById(req.params.id)
      if (!request) {
        return res.status(404).json({ message: "Demande non trouvée" })
      }

      const isTechnician = String(request.technicianId || "") === String(req.user._id || "")
      const isAdmin = req.user.role === "admin"
      if (!isTechnician && !isAdmin) {
        return res.status(403).json({ message: "Accès refusé" })
      }

      const paymentMethod = String(req.body?.paymentMethod || "").trim()
      const reference = String(req.body?.reference || "").trim()
      const amountPaid = Number(req.body?.amountPaid)
      const expectedAmount = Number(request.appCommissionAmount) || 0

      const allowedPaymentMethods = ["Wave", "Orange Money", "Free Money", "Cash"]
      if (!allowedPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({ message: "Choisissez un mode de paiement valide" })
      }

      if (!reference || reference.length < 3) {
        return res.status(400).json({ message: "La reference de paiement est obligatoire" })
      }

      if (!Number.isFinite(amountPaid) || amountPaid < 0) {
        return res.status(400).json({ message: "Le montant de contribution est obligatoire" })
      }

      if (expectedAmount > 0 && amountPaid !== expectedAmount) {
        return res.status(400).json({ message: `Le montant saisi doit être exactement de ${expectedAmount} FCFA` })
      }

      request.platformContributionStatus = "paid"
      request.platformContributionAmountPaid = amountPaid
      request.platformContributionPaymentMethod = paymentMethod
      request.platformContributionCollectedAt = new Date()
      request.platformContributionReference = `${paymentMethod}:${reference}`
      await request.save()

      return res.json({
        message: "Contribution enregistrée",
        request: await serializeServiceRequest(request, req.user.role, req.user._id)
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.post(
  "/:id/online-payment-session",
  authMiddleware,
  requireVerified,
  requireRole(["technician", "server", "admin"]),
  async (req, res) => {
    try {
      const request = await ServiceRequest.findById(req.params.id)
      if (!request) {
        return res.status(404).json({ message: "Demande non trouvée" })
      }

      const isAssignedTechnician = String(request.technicianId || "") === String(req.user._id || "")
      const isAdmin = req.user.role === "admin"
      if (!isAssignedTechnician && !isAdmin) {
        return res.status(403).json({ message: "Accès refusé" })
      }

      if (request.platformContributionStatus === "paid") {
        return res.json({
          message: "La contribution est deja reglee",
          checkoutUrl: null,
          sessionId: null,
          platformContributionStatus: request.platformContributionStatus
        })
      }

      const { enabled } = getStripeConfig()
      if (!enabled) {
        return res.status(503).json({
          message: "Le paiement en ligne n'est pas encore configure sur le serveur"
        })
      }

      const amount = Number(request.appCommissionAmount) || 0
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: "Le montant de contribution est invalide" })
      }

      const frontendBaseUrl = String(process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")
      const successUrl = `${frontendBaseUrl}/technician?payment=stripe_success&serviceRequestId=${request._id}`
      const cancelUrl = `${frontendBaseUrl}/technician?payment=stripe_cancel&serviceRequestId=${request._id}`
      const serviceLabel = `Contribution YOONBI - ${request.category || "service"}`

      const session = await createCheckoutSession({
        amount,
        serviceRequestId: request._id,
        serviceLabel,
        customerEmail: req.user.email || "",
        successUrl,
        cancelUrl
      })

      return res.json({
        message: "Session de paiement creee",
        checkoutUrl: session.url,
        sessionId: session.id,
        platformContributionStatus: request.platformContributionStatus
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: err.message || "Impossible de creer la session de paiement" })
    }
  }
)

router.get(
  "/:id/payment-status",
  authMiddleware,
  requireVerified,
  async (req, res) => {
    try {
      const request = await ServiceRequest.findById(req.params.id)
      if (!request) {
        return res.status(404).json({ message: "Demande non trouvée" })
      }

      const isOwner = String(request.clientId || "") === String(req.user._id || "")
      const isTechnician = String(request.technicianId || "") === String(req.user._id || "")
      const isAdmin = req.user.role === "admin"
      if (!isOwner && !isTechnician && !isAdmin) {
        return res.status(403).json({ message: "Accès refusé" })
      }

      return res.json({
        platformContributionStatus: request.platformContributionStatus,
        platformContributionAmountPaid: request.platformContributionAmountPaid,
        platformContributionPaymentMethod: request.platformContributionPaymentMethod,
        platformContributionCollectedAt: request.platformContributionCollectedAt,
        platformContributionReference: request.platformContributionReference,
        appCommissionPercent: request.appCommissionPercent,
        appCommissionAmount: request.appCommissionAmount,
        providerNetAmount: request.providerNetAmount
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.patch(
  "/:id/complete",
  authMiddleware,
  requireVerified,
  requireRole(["technician", "server"]),
  async (req, res) => {
    try {
      const request = await ServiceRequest.findById(req.params.id)
      if (!request) {
        return res.status(404).json({ message: "Demande non trouvée" })
      }

      if (String(request.technicianId || "") !== String(req.user._id || "")) {
        return res.status(403).json({ message: "Cette mission ne vous est pas attribuée" })
      }

      if (request.status !== "in_progress") {
        return res.status(400).json({ message: "La mission doit d'abord être démarree avec le code de sécurité" })
      }

      if (request.platformContributionStatus !== "paid") {
        return res.status(400).json({ message: "La contribution obligatoire de l'application doit être réglée avant la clôture" })
      }

      const messageParticipants = await Message.distinct("senderId", { serviceId: req.params.id })
      if (messageParticipants.length < 2) {
        return res.status(400).json({
          message: "Une vraie communication client-prestataire est obligatoire avant la clôture de la mission"
        })
      }

      request.status = "completed"
      await request.save()

      return res.json({
        message: "Mission terminée",
        request: await serializeServiceRequest(request, req.user.role, req.user._id)
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.post("/:id/safety-report", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { type = "incident", message = "", location = {} } = req.body || {}
    const request = await ServiceRequest.findById(req.params.id)

    if (!request) {
      return res.status(404).json({ message: "Demande non trouvée" })
    }

    const isOwner = String(request.clientId || "") === String(req.user._id || "")
    const isTechnician = String(request.technicianId || "") === String(req.user._id || "")
    const isAdmin = req.user.role === "admin"
    if (!isOwner && !isTechnician && !isAdmin) {
      return res.status(403).json({ message: "Accès refusé" })
    }

    request.safetyReports.push({
      type,
      message: String(message).slice(0, 500),
      createdByRole: req.user.role,
      location: {
        name: location.name || "Position inconnue",
        address: location.address || location.name || "",
        lat: location.lat ?? null,
        lng: location.lng ?? null
      }
    })

    await request.save()

    const reportReason = "Suspension automatique apres plusieurs signalements de securite."
    const targetUserId = String(request.clientId || "") === String(req.user._id || "")
      ? request.technicianId
      : request.clientId
    const targetUser = targetUserId ? await User.findById(targetUserId) : null

    if (targetUser) {
      targetUser.safetyReportsCount = (targetUser.safetyReportsCount || 0) + 1
      targetUser.safetyLastReportAt = new Date()
      if (targetUser.safetyReportsCount >= 3) {
        targetUser.status = "suspended"
        targetUser.safetySuspendedAt = new Date()
        targetUser.safetySuspensionReason = reportReason
        targetUser.reviewNote = reportReason
      }
      await targetUser.save()
    }

    return res.json({
      message: "Signalement envoyé",
      reportsCount: request.safetyReports.length,
      targetStatus: targetUser?.status || null,
      targetReportsCount: targetUser?.safetyReportsCount || null,
      suspended: targetUser?.status === "suspended" || false
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

// Get messages for a service
router.get("/:id/messages", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { id } = req.params
    const request = await ServiceRequest.findById(id)
    
    if (!request) {
      return res.status(404).json({ message: "Service non trouvé" })
    }

    // Check authorization
    if (request.clientId.toString() !== req.user._id.toString() &&
        request.technicianId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Accès non autorisé" })
    }

    const messages = await Message.find({ serviceId: id }).sort({ createdAt: 1 }).populate("senderId", "name firstName lastName profilePhotoUrl profilePhoto")
    return res.json(messages)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

// Send message for a service
router.post("/:id/messages", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { id } = req.params
    const { content } = req.body

    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: "Le message ne peut pas être vide" })
    }

    const request = await ServiceRequest.findById(id)
    if (!request) {
      return res.status(404).json({ message: "Service non trouvé" })
    }

    // Check authorization
    if (request.clientId.toString() !== req.user._id.toString() &&
        request.technicianId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Accès non autorisé" })
    }

    //Only allow messages for accepted services
    if (request.status === "pending" || request.status === "completed" || request.status === "cancelled") {
      return res.status(400).json({ message: "Conversation non disponible pour ce statut" })
    }

    const message = await Message.create({
      serviceId: id,
      senderId: req.user._id,
      senderRole: req.user.role,
      content: String(content).trim()
    })

    const populated = await message.populate("senderId", "name firstName lastName profilePhotoUrl profilePhoto")
    return res.status(201).json(populated)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

// Verify platform contribution is paid
router.post("/:id/verify-contribution", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { id } = req.params
    const request = await ServiceRequest.findById(id)
    
    if (!request) {
      return res.status(404).json({ message: "Service non trouvé" })
    }

    // Check authorization - client only
    if (request.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Accès non autorisé" })
    }

    // Check if contribution is already paid
    if (request.platformContributionStatus === "paid") {
      return res.json({ success: true, message: "Contribution déjà payée" })
    }

    // Mark as paid if service is accepted
    if (request.status === "accepted" || request.status === "in_progress" || request.status === "completed") {
      request.platformContributionStatus = "paid"
      request.platformContributionPaidAt = new Date()
      await request.save()
      
      return res.json({ 
        success: true, 
        message: "Contribution vérifiée et marquée payée",
        amount: request.appCommissionAmount
      })
    }

    return res.status(400).json({ message: "Service doit être accepté pour vérifier la contribution" })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

// Get single service by ID with provider details
router.get("/:id", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { id } = req.params
    const request = await ServiceRequest.findById(id)
      .populate("clientId", "name firstName lastName phone email")
      .populate("technicianId", "name firstName lastName profilePhotoUrl profilePhoto phone email rating role address providerDetails")
    
    if (!request) {
      return res.status(404).json({ message: "Service non trouvé" })
    }

    // Check authorization
    const isClient = request.clientId._id.toString() === req.user._id.toString()
    const isProvider = request.technicianId?._id.toString() === req.user._id.toString()
    
    if (!isClient && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Accès non autorisé" })
    }

    const response = {
      _id: request._id,
      title: request.title,
      description: request.description,
      category: request.category,
      status: request.status,
      price: request.price,
      appCommissionAmount: request.appCommissionAmount,
      appCommissionPercent: request.appCommissionPercent,
      providerNetAmount: request.providerNetAmount,
      platformContributionStatus: request.platformContributionStatus,
      clientId: request.clientId,
      technicianId: request.technicianId,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      location: request.location
    }

    return res.json(response)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

module.exports = router
