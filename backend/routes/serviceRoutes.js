const express = require("express")
const crypto = require("crypto")
const ServiceRequest = require("../models/ServiceRequest")
const Message = require("../models/Message")
const User = require("../models/User")
const ProviderGallery = require("../models/ProviderGallery")
const { authMiddleware, requireRole, requireVerified } = require("../middleware/auth")
const { APP_COMMISSION_PERCENT, serviceCommission } = require("../utils/pricing")

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

const professionLabelByServiceCategory = {
  Plomberie: "Plombier",
  Electricite: "Electricien",
  Menuiserie: "Menuisier",
  Maconnerie: "Macon",
  Peinture: "Peintre",
  Soudure: "Soudeur",
  Jardinage: "Jardinier",
  "Coiffure & Beaute": "Coiffure & Beaute",
  "Restauration / Patisserie": "Patissier",
  "Autre service": "Prestataire",
  Coursier: "Livreur",
  "Livraison / Coursier": "Livreur",
  Assistant: "Assistant",
  Traducteur: "Traducteur",
  Imprimeur: "Imprimeur",
  Informatique: "Informaticien",
  "Cours / Soutien": "Formateur",
  Menage: "Agent d'entretien",
  "Baby-sitting": "Baby-sitter",
  "Aide a domicile": "Aide a domicile",
  Evenementiel: "Evenementiel",
  "Autre activite": "Prestataire"
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

const normalizeSearchText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

const providerAliasGroups = {
  artisan: ["artisan", "reparation", "depannage", "travaux"],
  food: ["food", "restaurant", "resto", "gateau", "gateaux", "patisserie", "patissier", "traiteur"],
  beauty: ["beaute", "beautee", "coiffure", "coiffeur", "coiffeuse", "salon", "maquillage", "tresse", "tresses"],
  delivery: ["livreur", "livraison", "coursier", "colis", "document", "express"],
  other: ["autre", "service", "prestataire", "specialiste"]
}

const providerAliasByCategory = {
  Plomberie: ["plombier", "plomberie", "fuite", "robinet", "wc", "toilettes", "tuyau", "tuyaux", "evier", "lavabo"],
  Electricite: ["electricien", "electricite", "courant", "prise", "ampoule", "panne", "installation"],
  Menuiserie: ["menuisier", "menuiserie", "meuble", "meubles", "porte", "portes", "armoire", "dressing", "bois"],
  Maconnerie: ["macon", "maconnerie", "mur", "murs", "carrelage", "terrasse", "beton"],
  Peinture: ["peintre", "peinture", "facade", "murale", "deco", "décoration", "tableau", "tableaux", "art", "portrait"],
  Soudure: ["soudeur", "soudure", "metal", "fer", "grille", "portail"],
  Jardinage: ["jardinier", "jardinage", "pelouse", "plante", "arbre", "arbres"],
  "Coiffure & Beaute": ["coiffure", "coiffeur", "coiffeuse", "beaute", "makeup", "maquillage", "ongles", "tresse", "tresses"],
  "Restauration / Patisserie": ["patissier", "patisserie", "gateau", "gateaux", "repas", "restaurant", "traiteur", "dessert"],
  "Autre service": ["service", "divers", "polyvalent"],
  Coursier: ["livreur", "coursier", "livraison", "colis", "document", "express"],
  "Livraison / Coursier": ["livreur", "coursier", "livraison", "colis", "document", "express"],
  Assistant: ["assistant", "assistance", "aide", "support"],
  Traducteur: ["traducteur", "traduction", "langue", "anglais", "francais", "arabe"],
  Imprimeur: ["imprimeur", "impression", "photocopie", "flyer", "affiche"],
  Informatique: ["informaticien", "informatique", "ordinateur", "pc", "laptop", "reseau", "wifi", "site", "web", "logiciel"],
  "Cours / Soutien": ["cours", "soutien", "prof", "formateur", "formation", "etude"],
  Menage: ["menage", "nettoyage", "proprete", "entretien"],
  "Baby-sitting": ["baby-sitter", "baby sitting", "enfant", "garde"],
  "Aide a domicile": ["aide a domicile", "aide", "domicile", "soin", "accompagnement"],
  Evenementiel: ["evenement", "evenementiel", "deco", "animation", "sono", "fete"],
  "Autre activite": ["activite", "service", "prestataire", "specialiste"]
}

const getProfessionLabel = (provider) => {
  const category = String(provider?.providerDetails?.serviceCategory || provider?.serviceCategory || "").trim()
  const detail = String(provider?.providerDetails?.otherServiceDetail || provider?.otherServiceDetail || "").trim()
  const beautySpecialty = String(provider?.providerDetails?.beautySpecialty || provider?.beautySpecialty || "").trim()

  if (category === "Autre service" && detail) return detail
  if (category === "Autre activite" && detail) return detail
  if (category === "Coiffure & Beaute" && beautySpecialty) return beautySpecialty

  return professionLabelByServiceCategory[category] || category || detail || "Prestataire"
}

const collectProviderKeywords = (provider) => {
  const serviceCategory = String(provider?.providerDetails?.serviceCategory || provider?.serviceCategory || "").trim()
  const family = getProviderFamily(provider)
  const familyAliases = providerAliasGroups[family] || []
  const categoryAliases = providerAliasByCategory[serviceCategory] || []
  const portfolioOfferings = Array.isArray(provider?.portfolio?.offerings) ? provider.portfolio.offerings : []
  const portfolioPreviewItems = Array.isArray(provider?.portfolio?.previewItems) ? provider.portfolio.previewItems : []
  const values = [
    provider?.name,
    provider?.firstName,
    provider?.lastName,
    getProfessionLabel(provider),
    serviceCategory,
    provider?.providerDetails?.serviceArea,
    provider?.providerDetails?.locationLabel,
    provider?.providerDetails?.availability,
    provider?.providerDetails?.beautySpecialty,
    provider?.providerDetails?.otherServiceDetail,
    ...portfolioOfferings.flatMap((item) => [item.title, item.description, item.unit]),
    ...portfolioPreviewItems.flatMap((item) => [
      item.title,
      item.description,
      item.category,
      ...(Array.isArray(item.tags) ? item.tags : [])
    ]),
    ...familyAliases,
    ...categoryAliases
  ]

  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  )
}

const buildPortfolioSummary = (gallery) => {
  if (!gallery) {
    return {
      coverImage: "",
      totalImages: 0,
      previewItems: [],
      offerings: [],
      priceFrom: 0,
      priceTo: 0
    }
  }

  const previewItems = (Array.isArray(gallery.galleryItems) ? gallery.galleryItems : [])
    .slice(0, 3)
    .map((item) => ({
      id: item._id,
      title: item.title || "",
      description: item.description || "",
      mediaType: item.mediaType || (item.videoUrl ? "video" : "image"),
      imageUrl: item.imageUrl || "",
      videoUrl: item.videoUrl || "",
      thumbnailUrl: item.thumbnailUrl || item.imageUrl || "",
      category: item.category || "work",
      tags: Array.isArray(item.tags) ? item.tags : [],
      pricing: {
        startingPrice: Number(item?.pricing?.startingPrice || 0),
        maxPrice: Number(item?.pricing?.maxPrice || 0),
        currency: item?.pricing?.currency || "XOF",
        unit: item?.pricing?.unit || "service",
        durationMinutes: Number(item?.pricing?.durationMinutes || 0)
      }
    }))

  const offerings = (Array.isArray(gallery.offerings) ? gallery.offerings : [])
    .slice(0, 4)
    .map((item, index) => ({
      id: item._id || `offering-${index}`,
      title: item.title || "",
      description: item.description || "",
      startingPrice: Number(item.startingPrice || 0),
      maxPrice: Number(item.maxPrice || 0),
      currency: item.currency || "XOF",
      unit: item.unit || "service"
    }))

  const pricingNumbers = [
    ...previewItems.flatMap((item) => [item.pricing.startingPrice, item.pricing.maxPrice]),
    ...offerings.flatMap((item) => [item.startingPrice, item.maxPrice])
  ]
    .map((value) => Number(value) || 0)
    .filter((value) => value > 0)

  return {
    coverImage: gallery.coverImage || previewItems[0]?.imageUrl || "",
    totalImages: Number(gallery.totalImages || previewItems.length || 0),
    previewItems,
    offerings,
    priceFrom: pricingNumbers.length ? Math.min(...pricingNumbers) : 0,
    priceTo: pricingNumbers.length ? Math.max(...pricingNumbers) : 0
  }
}

const rankProviderAgainstQuery = (provider, query, requestedFamily = null) => {
  const normalizedQuery = normalizeSearchText(query)
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  const keywords = collectProviderKeywords(provider)
  const searchable = normalizeSearchText(keywords.join(" "))
  let score = 0

  if (requestedFamily && provider.serviceFamily === requestedFamily) {
    score += 25
  }

  if (!tokens.length) {
    return score
  }

  for (const token of tokens) {
    if (!token) continue
    if (normalizeSearchText(provider.professionLabel).includes(token)) {
      score += 45
      continue
    }

    if (searchable.includes(token)) {
      score += 20
      continue
    }

    const fuzzyHit = keywords.some((keyword) => normalizeSearchText(keyword).includes(token) || token.includes(normalizeSearchText(keyword)))
    if (fuzzyHit) {
      score += 10
    }
  }

  if (searchable.includes(normalizedQuery)) {
    score += 35
  }

  return score
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
  "Toute la ville de Saint-Louis": { lat: 16.0244, lng: -16.5015 },
  Louga: { lat: 15.6187, lng: -16.2244 },
  Kebemer: { lat: 15.4058, lng: -16.5364 },
  Linguere: { lat: 15.3863, lng: -15.1112 },
  "Richard-Toll": { lat: 16.4625, lng: -15.7042 },
  Dagana: { lat: 16.5167, lng: -15.5 },
  Podor: { lat: 16.6542, lng: -14.9681 },
  "Ross-Bethio": { lat: 16.2687, lng: -15.7935 },
  Mpal: { lat: 16.5322, lng: -16.0047 }
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

const serializeProvider = (provider, viewerCoords = null, portfolio = null) => {
  const plain = typeof provider?.toObject === "function" ? provider.toObject() : { ...provider }
  const coordinates = resolveProviderCoordinates(plain)
  const distanceKm = viewerCoords ? haversineDistanceKm(viewerCoords, coordinates) : null
  const family = getProviderFamily(plain)
  const availability = resolveAvailabilityBadge(plain.providerDetails?.availability)
  const professionLabel = getProfessionLabel(plain)
  const portfolioSummary = buildPortfolioSummary(portfolio)
  return {
    id: String(plain._id || ""),
    userId: String(plain._id || ""),
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
    professionLabel,
    serviceAreaLabel: plain.providerDetails?.serviceArea || "Saint-Louis",
    isOpen: Boolean(plain.providerDetails?.availability),
    highlight: distanceKm != null && distanceKm <= 3,
    portfolio: portfolioSummary
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

const getProviderCommissionBalance = (user) => Math.round(Number(user?.commissionCreditBalance || 0))

const ensurePositiveCommissionCredit = (user) => {
  const balance = getProviderCommissionBalance(user)
  if (balance <= 0) {
    return {
      ok: false,
      balance,
      message: "Credit commission insuffisant. Rechargez par Wave ou Orange Money au 781488070, puis attendez la validation admin."
    }
  }
  return { ok: true, balance }
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
      appCommissionPercent: APP_COMMISSION_PERCENT,
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
      const query = String(req.query.q || "").trim()
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
      })
        .select("firstName lastName name role status profilePhotoUrl providerDetails")
        .sort({ firstName: 1, lastName: 1 })
        .lean()
      const providerIds = providers.map((provider) => provider._id)
      const galleries = await ProviderGallery.find({ provider: { $in: providerIds } })
        .select("provider coverImage totalImages galleryItems offerings")
        .lean()
      const galleryByProviderId = new Map(galleries.map((gallery) => [String(gallery.provider), gallery]))

      const filteredProviders = providers
        .map((provider) => serializeProvider(provider, viewerCoords, galleryByProviderId.get(String(provider._id))))
        .filter((provider) => provider.status === "verified")
        .sort((left, right) => {
          const leftScore = rankProviderAgainstQuery(left, query, providerFamily)
          const rightScore = rankProviderAgainstQuery(right, query, providerFamily)
          if (rightScore !== leftScore) {
            return rightScore - leftScore
          }

          if (providerFamily) {
            if (left.serviceFamily === providerFamily && right.serviceFamily !== providerFamily) return -1
            if (right.serviceFamily === providerFamily && left.serviceFamily !== providerFamily) return 1
          }

          const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY
          const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY
          return leftDistance - rightDistance
        })

      return res.json({
        viewerCoords,
        providerFamily,
        query,
        providers: filteredProviders
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.post(
  "/discussions",
  authMiddleware,
  requireVerified,
  async (req, res) => {
    try {
      const category = String(req.body?.category || "").trim()
      const providerId = String(req.body?.providerId || "").trim()
      const title = String(req.body?.title || "").trim()
      const content = String(req.body?.content || "").trim()

      if (!providerId) {
        return res.status(400).json({ message: "Prestataire requis" })
      }

      if (!content) {
        return res.status(400).json({ message: "Ajoutez un premier message pour lancer la discussion" })
      }

      const provider = await User.findOne({ _id: providerId, role: "technician", status: "verified" })
      if (!provider) {
        return res.status(404).json({ message: "Prestataire introuvable" })
      }

      const safeCategory = Object.keys(serviceFamilyByCategory).includes(category) ? category : "autres"
      const discussionTitle = maskSensitiveContact(title).slice(0, 140) || `Discussion avec ${getProfessionLabel(provider)}`

      let request = await ServiceRequest.findOne({
        clientId: req.user._id,
        technicianId: provider._id,
        status: { $in: ["pending", "quoted", "accepted", "in_progress"] }
      }).sort({ createdAt: -1 })

      if (!request) {
        request = await ServiceRequest.create({
          clientId: req.user._id,
          technicianId: provider._id,
          preferredProviderId: provider._id,
          preferredProviderName: provider.name || `${provider.firstName || ""} ${provider.lastName || ""}`.trim(),
          preferredDistanceKm: null,
          category: safeCategory,
          serviceFamily: getServiceFamily(safeCategory),
          title: discussionTitle,
          description: "Discussion ouverte avant validation de la prestation.",
          clientBudget: 0,
          price: 0,
          quotedPrice: 0,
          appCommissionPercent: APP_COMMISSION_PERCENT,
          appCommissionAmount: 0,
          providerNetAmount: 0,
          platformContributionStatus: "due",
          status: "pending",
          safetyCode: generateSafetyCode()
        })
      }

      const message = await Message.create({
        serviceId: request._id,
        senderId: req.user._id,
        senderRole: req.user.role,
        content: maskSensitiveContact(content).slice(0, 1000)
      })

      return res.status(201).json({
        message: "Discussion ouverte",
        serviceRequest: await serializeServiceRequest(request, req.user.role, req.user._id),
        chatMessage: await message.populate("senderId", "name firstName lastName profilePhotoUrl profilePhoto")
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

      const creditStatus = ensurePositiveCommissionCredit(req.user)
      if (!creditStatus.ok) {
        return res.status(402).json(creditStatus)
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

      const messageParticipants = await Message.distinct("senderId", { serviceId: req.params.id })
      if (messageParticipants.length < 2) {
        return res.status(400).json({
          message: "Une vraie communication client-prestataire est obligatoire avant la clôture de la mission"
        })
      }

      if (!request.appCommissionDebitedAt) {
        const provider = await User.findById(request.technicianId)
        if (provider) {
          const commissionAmount = Math.max(0, Math.round(Number(request.appCommissionAmount || 0)))
          provider.commissionCreditBalance = Math.round(Number(provider.commissionCreditBalance || 0)) - commissionAmount
          provider.commissionCreditUpdatedAt = new Date()
          await provider.save()
          request.appCommissionDebitedAt = new Date()
          request.platformContributionStatus = "paid"
          request.platformContributionAmountPaid = commissionAmount
          request.platformContributionPaymentMethod = "commission_credit"
          request.platformContributionCollectedAt = new Date()
          request.platformContributionReference = `credit:${request._id}`
        }
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
    const participantIds = [request.clientId, request.technicianId, request.preferredProviderId]
      .filter(Boolean)
      .map((value) => value.toString())

    if (!participantIds.includes(req.user._id.toString())) {
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
    const participantIds = [request.clientId, request.technicianId, request.preferredProviderId]
      .filter(Boolean)
      .map((value) => value.toString())

    if (!participantIds.includes(req.user._id.toString())) {
      return res.status(403).json({ message: "Accès non autorisé" })
    }

    const canChatWhilePending = request.status === "pending" && Boolean(request.technicianId || request.preferredProviderId)
    if ((request.status === "pending" && !canChatWhilePending) || request.status === "completed" || request.status === "cancelled") {
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

// Get single service by ID with provider details
router.get("/:id", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { id } = req.params
    const request = await ServiceRequest.findById(id)
    
    if (!request) {
      return res.status(404).json({ message: "Service non trouvé" })
    }

    const viewerId = String(req.user._id || "")
    const isClient = String(request.clientId || "") === viewerId
    const isProvider = String(request.technicianId || "") === viewerId
    
    if (!isClient && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Accès non autorisé" })
    }

    return res.json(await serializeServiceRequest(request, req.user.role, req.user._id))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

module.exports = router
