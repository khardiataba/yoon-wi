const express = require("express")
const crypto = require("crypto")
const https = require("https")
const Ride = require("../models/Ride")
const Message = require("../models/Message")
const User = require("../models/User")
const socketManager = require("../socket/socketManager")
const { authMiddleware, requireRole, requireVerified } = require("../middleware/auth")
const { computeRideFare, computeStudentBusFare, normalizeStudentBusZone, rideCommission } = require("../utils/pricing")
const { createNotification } = require("../services/notificationService")
const { getPaginationParams, buildPaginatedResponse } = require("../utils/pagination")
const { validateLocation, validateLocationPair } = require("../utils/locationValidation")

const router = express.Router()
const objectIdRegex = /^[0-9a-fA-F]{24}$/

const validateRideId = (req, res, next) => {
  if (!objectIdRegex.test(String(req.params.id || ""))) {
    return res.status(400).json({ message: "Identifiant de course invalide" })
  }
  return next()
}

const haversineDistanceKm = (pickup, destination) => {
  const toRadians = (value) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const deltaLat = toRadians((destination.lat || 0) - (pickup.lat || 0))
  const deltaLng = toRadians((destination.lng || 0) - (pickup.lng || 0))
  const pickupLat = toRadians(pickup.lat || 0)
  const destinationLat = toRadians(destination.lat || 0)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(pickupLat) * Math.cos(destinationLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const buildFallbackEstimate = (pickup, destination) => {
  const straightDistance = haversineDistanceKm(pickup, destination)
  const adjustedDistance = Math.max(1, Math.round(straightDistance * 1.18 * 10) / 10)
  const durationMin = Math.max(4, Math.round((adjustedDistance / 28) * 60))

  return {
    distanceKm: adjustedDistance,
    durationMin,
    geometry: [
      [pickup.lat, pickup.lng],
      [destination.lat, destination.lng]
    ]
  }
}

const normalizeLocation = (location) => {
  if (!location) return null

  if (typeof location === "string") {
    return { name: location, address: location }
  }

  return {
    name: location.name || location.address || "Point sélectionné",
    address: location.address || location.name || "Point sélectionné",
    lat: location.lat ?? null,
    lng: location.lng ?? null
  }
}

const normalizeRouteGeometry = (geometry) => {
  if (!Array.isArray(geometry)) return []

  return geometry
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null
      const lat = Number(point[0])
      const lng = Number(point[1])
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return [lat, lng]
    })
    .filter(Boolean)
}

const generateSafetyCode = () => crypto.randomInt(1000, 10000).toString()

const buildRideParticipantSummary = (user) => {
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
    phone: plain.phone || ""
  }
}

const loadRideParticipants = async (ride) => {
  const ids = [ride?.userId, ride?.driverId].filter(Boolean).map((value) => String(value))
  if (!ids.length) return { client: null, driver: null }

  const users = await User.find({ _id: { $in: ids } }).select("firstName lastName name role status profilePhotoUrl phone")
  const summaries = new Map(users.map((user) => [String(user._id), buildRideParticipantSummary(user)]))

  return {
    client: summaries.get(String(ride?.userId || "")) || null,
    driver: summaries.get(String(ride?.driverId || "")) || null
  }
}

const serializeRide = async (ride, { includeSafetyCode = false, viewerUserId = null, viewerRole = "client" } = {}) => {
  const plainRide = typeof ride?.toObject === "function" ? ride.toObject() : { ...ride }
  delete plainRide.safetyReports
  const participants = await loadRideParticipants(plainRide)

  if (participants.client) {
    plainRide.client = participants.client
  }

  if (participants.driver) {
    plainRide.driver = participants.driver
  }

  if (!includeSafetyCode) {
    delete plainRide.safetyCode
  } else if (viewerRole !== "admin" && String(plainRide.userId || "") !== String(viewerUserId || "")) {
    delete plainRide.safetyCode
  }
  return plainRide
}

const canAccessRide = (ride, user) => {
  if (!ride || !user) return false
  if (user.role === "admin") return true
  const rideUserId = String(ride.userId || "")
  const rideDriverId = String(ride.driverId || "")
  const userId = String(user._id || "")
  return rideUserId === userId || rideDriverId === userId
}

const getOtherPartyId = (ride, reporterId) => {
  if (!ride) return null
  const reporter = String(reporterId || "")
  const userId = String(ride.userId || "")
  const driverId = String(ride.driverId || "")

  if (reporter && reporter === userId) {
    return driverId || null
  }

  if (reporter && reporter === driverId) {
    return userId || null
  }

  return driverId || userId || null
}

const hasRegisteredBusForDriver = (user) => {
  const vehicleType = String(user?.providerDetails?.vehicleType || "").toLowerCase()
  const vehiclePlate = String(user?.providerDetails?.vehiclePlate || "").trim()
  const looksLikeBus = /bus|minibus|autocar|transport/.test(vehicleType)
  return looksLikeBus && Boolean(vehiclePlate)
}

const maybeSuspendUser = async (userId, reason) => {
  if (!userId) return null

  const targetUser = await User.findById(userId)
  if (!targetUser) return null

  targetUser.safetyReportsCount = (targetUser.safetyReportsCount || 0) + 1
  targetUser.safetyLastReportAt = new Date()

  if (targetUser.safetyReportsCount >= 3) {
    targetUser.status = "suspended"
    targetUser.safetySuspendedAt = new Date()
    targetUser.safetySuspensionReason = reason
    targetUser.reviewNote = reason
  }

  await targetUser.save()
  return targetUser
}

// Créer une nouvelle réservation (client)
router.post("/", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { pickup, destination, price, vehicleType, paymentMethod, distanceKm, durationMin, routeGeometry, rideMode, busZone, busOptions } = req.body
    if (!pickup || !destination || !price) {
      return res.status(400).json({ message: "pickup, destination et price requis" })
    }

    // Validate locations
    const locationValidation = validateLocationPair(pickup, destination)
    if (!locationValidation.valid) {
      return res.status(400).json({ message: "Localisation invalide", errors: locationValidation.errors })
    }

    // Validate price
    if (typeof price !== 'number' || price <= 0 || price > 1000000) {
      return res.status(400).json({ message: "Prix invalide" })
    }

    const normalizedBusZone = normalizeStudentBusZone(busZone)
    const isStudentBus = rideMode === "bus_student" && Boolean(normalizedBusZone)
    const finalPrice = isStudentBus ? computeStudentBusFare(normalizedBusZone) : computeRideFare(distanceKm, durationMin)
    const commission = rideCommission(finalPrice)
    const safetyCode = generateSafetyCode()
    const safeBusOptions = {
      subscriptionPlan: "none",
      reservedSeat: false,
      seats: 1,
      travelDate: null,
      useTransportCredit: false,
      creditAmount: 0,
      amountPaidNow: 0,
      amountRemaining: 0
    }

    if (isStudentBus && busOptions && typeof busOptions === "object") {
      const plan = String(busOptions.subscriptionPlan || "none").trim().toLowerCase()
      safeBusOptions.subscriptionPlan = ["none", "daily", "weekly", "monthly"].includes(plan) ? plan : "none"
      safeBusOptions.reservedSeat = Boolean(busOptions.reservedSeat)
      safeBusOptions.seats = Math.max(1, Math.min(4, Number(busOptions.seats) || 1))
      const parsedTravelDate = busOptions.travelDate ? new Date(busOptions.travelDate) : null
      safeBusOptions.travelDate = parsedTravelDate && !Number.isNaN(parsedTravelDate.getTime()) ? parsedTravelDate : null
      safeBusOptions.useTransportCredit = Boolean(busOptions.useTransportCredit)
      safeBusOptions.creditAmount = Math.max(0, Number(busOptions.creditAmount) || 0)
      safeBusOptions.amountPaidNow = Math.max(0, Number(busOptions.amountPaidNow) || 0)
      safeBusOptions.amountRemaining = Math.max(0, Number(busOptions.amountRemaining) || 0)

      if (safeBusOptions.useTransportCredit) {
        const recomputedRemaining = Math.max(0, finalPrice - safeBusOptions.amountPaidNow)
        safeBusOptions.amountRemaining = recomputedRemaining
      }
    }

    const rideTypeLabelByZone = {
      marche: "Bus Eleves - Jusqu'au marche",
      ville: "Bus Eleves - Ville"
    }
    const availableDrivers = socketManager.findAvailableDrivers(
      { latitude: locationValidation.pickup.lat, longitude: locationValidation.pickup.lng },
      null
    )
    const driverAvailabilityStatus = availableDrivers.length > 0 ? "searching" : "no_driver_available"

    const ride = await Ride.create({
      userId: req.user._id,
      pickup: locationValidation.pickup,
      destination: locationValidation.destination,
      price: finalPrice,
      ...commission,
      distanceKm: locationValidation.distanceKm || distanceKm || null,
      durationMin: durationMin || null,
      vehicleType: isStudentBus ? rideTypeLabelByZone[normalizedBusZone] : (vehicleType || "YOONWI Classic"),
      rideCategory: isStudentBus ? "bus_student" : "standard",
      busZone: isStudentBus ? normalizedBusZone : "",
      busOptions: isStudentBus ? safeBusOptions : undefined,
      paymentMethod: paymentMethod || "Cash",
      routeGeometry: normalizeRouteGeometry(routeGeometry),
      safetyCode,
      status: "pending",
      driverAvailabilityStatus
    })

    return res.status(201).json({
      ...(await serializeRide(ride, { includeSafetyCode: true, viewerUserId: req.user._id, viewerRole: req.user.role })),
      safetyCode,
      safetyHint: "Partage ce code au chauffeur quand tu montes dans le vehicule."
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

// Estimer durée / distance via OSRM (public)
router.post("/estimate", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { pickup, destination, rideMode, busZone } = req.body
    if (!pickup || !destination) {
      return res.status(400).json({ message: "pickup et destination requis" })
    }

    // Validate locations
    const locationValidation = validateLocationPair(pickup, destination)
    if (!locationValidation.valid) {
      return res.status(400).json({ message: "Localisation invalide", errors: locationValidation.errors })
    }

    const normalizedBusZone = normalizeStudentBusZone(busZone)
    if (rideMode === "bus_student" && normalizedBusZone) {
      const suggestedPrice = computeStudentBusFare(normalizedBusZone)
      return res.json({
        distanceKm: null,
        durationMin: null,
        geometry: [],
        suggestedPrice,
        ...rideCommission(suggestedPrice)
      })
    }

    const coords = `${locationValidation.pickup.lng},${locationValidation.pickup.lat};${locationValidation.destination.lng},${locationValidation.destination.lat}`
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`
    const fallbackEstimate = buildFallbackEstimate(pickup, destination)

    https
      .get(url, (resp) => {
        let data = ""
        resp.on("data", (chunk) => (data += chunk))
        resp.on("end", () => {
          try {
            const json = JSON.parse(data)
            if (!json.routes || !json.routes.length) {
              const suggestedPrice = computeRideFare(fallbackEstimate.distanceKm, fallbackEstimate.durationMin)
              return res.json({ ...fallbackEstimate, suggestedPrice, ...rideCommission(suggestedPrice) })
            }
            const route = json.routes[0]
            const distanceKm = Math.round((route.distance / 1000) * 10) / 10
            const durationMin = Math.round(route.duration / 60)
            const geometry = Array.isArray(route.geometry?.coordinates)
              ? route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
              : []
            const suggestedPrice = computeRideFare(distanceKm, durationMin)
            const commission = rideCommission(suggestedPrice)

            return res.json({ distanceKm, durationMin, geometry, suggestedPrice, ...commission })
          } catch (parseError) {
            console.error(parseError)
            const suggestedPrice = computeRideFare(fallbackEstimate.distanceKm, fallbackEstimate.durationMin)
            return res.json({ ...fallbackEstimate, suggestedPrice, ...rideCommission(suggestedPrice) })
          }
        })
      })
      .on("error", (err) => {
        console.error(err)
        const suggestedPrice = computeRideFare(fallbackEstimate.distanceKm, fallbackEstimate.durationMin)
        return res.json({ ...fallbackEstimate, suggestedPrice, ...rideCommission(suggestedPrice) })
      })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

// Lister les courses du user (client ou driver)
router.get("/", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { role, _id } = req.user
    const filter = role === "driver" ? { driverId: _id } : { userId: _id }
    const rides = await Ride.find(filter).sort({ createdAt: -1 })
    return res.json(await Promise.all(rides.map((ride) => serializeRide(ride, { viewerUserId: req.user._id, viewerRole: req.user.role }))))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

// Get single ride by ID
// Courses disponibles (pour chauffeurs)
router.get(
  "/available",
  authMiddleware,
  requireVerified,
  requireRole("driver"),
  async (req, res) => {
    try {
      const rides = await Ride.find({ status: "pending" }).sort({ createdAt: -1 })
      return res.json(await Promise.all(rides.map((ride) => serializeRide(ride, { viewerUserId: req.user._id, viewerRole: req.user.role }))))
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

// Get single ride by ID
router.get("/:id", authMiddleware, requireVerified, validateRideId, async (req, res) => {
  try {
    const { id } = req.params
    const ride = await Ride.findById(id).populate("userId", "name phone email profilePhoto").populate("driverId", "name profilePhoto phone email")

    if (!ride) {
      return res.status(404).json({ message: "Course non trouvée" })
    }

    const isClient = ride.userId._id.toString() === req.user._id.toString()
    const isDriver = ride.driverId?._id.toString() === req.user._id.toString()
    const isAdmin = req.user.role === "admin"

    if (!isClient && !isDriver && !isAdmin) {
      return res.status(403).json({ message: "Accès non autorisé" })
    }

    const serialized = await serializeRide(ride, { viewerUserId: req.user._id, viewerRole: req.user.role })
    return res.json(serialized)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

// Accepter une course (chauffeur)
router.patch(
  "/:id/driver-location",
  authMiddleware,
  requireVerified,
  validateRideId,
  requireRole("driver"),
  async (req, res) => {
    try {
      const ride = await Ride.findById(req.params.id)
      if (!ride) {
        return res.status(404).json({ message: "Course non trouvée" })
      }

      if (String(ride.driverId || "") !== String(req.user._id || "")) {
        return res.status(403).json({ message: "Cette course ne vous est pas attribuée" })
      }

      const locationInput = req.body?.location || req.body || {}
      const locationValidation = validateLocation(
        {
          name: locationInput.name || "Position chauffeur",
          address: locationInput.address || locationInput.name || "Position chauffeur",
          lat: locationInput.lat,
          lng: locationInput.lng
        },
        { checkServiceArea: true }
      )

      if (!locationValidation.valid) {
        return res.status(400).json({ message: "Position chauffeur invalide", errors: locationValidation.errors })
      }

      ride.currentDriverLocation = locationValidation.location
      await ride.save()

      const payload = {
        rideId: ride._id,
        location: ride.currentDriverLocation,
        source: String(req.body?.source || "device").slice(0, 20),
        timestamp: new Date()
      }

      socketManager.notifyRideParticipants(ride._id, "driver:location-update", payload)
      return res.json({
        message: "Position chauffeur mise a jour",
        location: ride.currentDriverLocation
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.patch(
  "/:id/accept",
  authMiddleware,
  requireVerified,
  validateRideId,
  requireRole("driver"),
  async (req, res) => {
    try {
      const ride = await Ride.findById(req.params.id)
      if (!ride) return res.status(404).json({ message: "Course non trouvée" })
      if (ride.status !== "pending") {
        return res.status(400).json({ message: "Course non disponible" })
      }

      if (ride.rideCategory === "bus_student" && !hasRegisteredBusForDriver(req.user)) {
        return res.status(403).json({
          message: "Cette course bus est reservee aux chauffeurs avec bus inscrit (type bus/minibus + immatriculation)."
        })
      }

      ride.status = "accepted"
      ride.driverId = req.user._id
      ride.driverAvailabilityStatus = "driver_assigned"
      await ride.save()

      await createNotification({
        userId: ride.userId,
        title: 'Course acceptée',
        message: 'Votre course a été acceptée par un chauffeur. Il arrive bientôt.',
        category: 'success',
        link: `/ride/${ride._id}`
      })

      await createNotification({
        userId: ride.driverId,
        title: 'Course attribuée',
        message: 'Vous avez accepté la course. Déplacez-vous vers le point de prise en charge.',
        category: 'info',
        link: `/ride/${ride._id}`
      })

      // Emit socket event for real-time update
      socketManager.emitToUser(ride.userId, 'ride:status-update', {
        rideId: ride._id,
        status: 'accepted',
        driverId: ride.driverId,
        timestamp: new Date()
      })
      socketManager.emitToUser(ride.driverId, 'ride:status-update', {
        rideId: ride._id,
        status: 'accepted',
        message: 'Course acceptée avec succès',
        timestamp: new Date()
      })
    return res.json(await serializeRide(ride, { viewerUserId: req.user._id, viewerRole: req.user.role }))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

router.patch(
  "/:id/start",
  authMiddleware,
  requireVerified,
  validateRideId,
  requireRole("driver"),
  async (req, res) => {
    try {
      const { safetyCode } = req.body
      const ride = await Ride.findById(req.params.id).select("+safetyCode")

      if (!ride) {
        return res.status(404).json({ message: "Course non trouvée" })
      }

      if (String(ride.driverId || "") !== String(req.user._id || "")) {
        return res.status(403).json({ message: "Cette course ne vous est pas attribuée" })
      }

      if (ride.status !== "accepted") {
        return res.status(400).json({ message: "La course doit d'abord etre acceptee" })
      }

      if (!safetyCode || String(safetyCode).trim() !== String(ride.safetyCode || "")) {
        return res.status(403).json({ message: "Code de securite invalide" })
      }

      ride.status = "ongoing"
      ride.safetyCodeVerifiedAt = new Date()
      await ride.save()

      await createNotification({
        userId: ride.userId,
        title: 'Course en cours',
        message: 'Le chauffeur a démarré votre course. Bon voyage !',
        category: 'success',
        link: `/ride/${ride._id}`
      })

      // Emit socket event for real-time update
      socketManager.emitToUser(ride.userId, 'ride:status-update', {
        rideId: ride._id,
        status: 'ongoing',
        message: 'Course démarrée',
        timestamp: new Date()
      })
      socketManager.emitToUser(ride.driverId, 'ride:status-update', {
        rideId: ride._id,
        status: 'ongoing',
        message: 'Course démarrée avec succès',
        timestamp: new Date()
      })

      return res.json(await serializeRide(ride, { viewerUserId: req.user._id, viewerRole: req.user.role }))
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
  validateRideId,
  async (req, res) => {
    try {
      const ride = await Ride.findById(req.params.id)

      if (!ride) {
        return res.status(404).json({ message: "Course non trouvée" })
      }

      if (String(ride.driverId || "") !== String(req.user._id || "") && String(ride.userId || "") !== String(req.user._id || "")) {
        return res.status(403).json({ message: "Cette course ne vous concerne pas" })
      }

      if (ride.status !== "ongoing") {
        return res.status(400).json({ message: "Seules les courses en cours peuvent etre terminees" })
      }

      if (ride.paymentStatus !== "paid") {
        return res.status(400).json({ message: "Le paiement client et la commission doivent être réglés avant la clôture" })
      }

      ride.status = "completed"
      await ride.save()

      await createNotification({
        userId: ride.userId,
        title: 'Course terminée',
        message: 'Vous êtes arrivé à destination. Merci d\'avoir utilisé YOON WI !',
        category: 'success',
        link: `/ride/${ride._id}`
      })

      await createNotification({
        userId: ride.driverId,
        title: 'Course terminée',
        message: 'Course complètement. Vous pouvez maintenant accepter une nouvelle course.',
        category: 'success',
        link: `/ride/${ride._id}`
      })

      // Emit socket event for real-time update
      socketManager.emitToUser(ride.userId, 'ride:status-update', {
        rideId: ride._id,
        status: 'completed',
        message: 'Course terminée',
        timestamp: new Date()
      })
      socketManager.emitToUser(ride.driverId, 'ride:status-update', {
        rideId: ride._id,
        status: 'completed',
        message: 'Course terminée',
        timestamp: new Date()
      })

      return res.json(await serializeRide(ride, { viewerUserId: req.user._id, viewerRole: req.user.role }))
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

// Chat messages for a ride
router.get("/:id/messages", authMiddleware, requireVerified, validateRideId, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
    if (!ride) {
      return res.status(404).json({ message: "Course non trouvée" })
    }

    if (!canAccessRide(ride, req.user)) {
      return res.status(403).json({ message: "Accès refusé" })
    }

    const messages = await Message.find({ rideId: req.params.id })
      .sort({ createdAt: 1 })
      .populate("senderId", "name firstName lastName profilePhotoUrl profilePhoto")

    return res.json(messages)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

router.post("/:id/messages", authMiddleware, requireVerified, validateRideId, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
    if (!ride) {
      return res.status(404).json({ message: "Course non trouvée" })
    }

    if (!canAccessRide(ride, req.user)) {
      return res.status(403).json({ message: "Accès refusé" })
    }

    if (!["accepted", "ongoing", "completed"].includes(String(ride.status || ""))) {
      return res.status(400).json({ message: "Conversation indisponible pour ce statut de course" })
    }

    const content = String(req.body?.content || "").trim()
    if (!content) {
      return res.status(400).json({ message: "Le message ne peut pas être vide" })
    }

    const message = await Message.create({
      rideId: req.params.id,
      senderId: req.user._id,
      senderRole: req.user.role,
      content: content.slice(0, 1000)
    })

    const populated = await message.populate("senderId", "name firstName lastName profilePhotoUrl profilePhoto")
    return res.status(201).json(populated)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

router.post("/:id/safety-report", authMiddleware, requireVerified, validateRideId, async (req, res) => {
  try {
    const { type = "incident", message = "", location = {} } = req.body || {}
    const ride = await Ride.findById(req.params.id)

    if (!ride) {
      return res.status(404).json({ message: "Course non trouvée" })
    }

    if (!canAccessRide(ride, req.user)) {
      return res.status(403).json({ message: "Accès refusé" })
    }

    ride.safetyReports.push({
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

    await ride.save()

    const reportReason = "Suspension automatique apres plusieurs signalements de securite."
    const targetUserId = getOtherPartyId(ride, req.user._id)
    const targetUser = await maybeSuspendUser(targetUserId, reportReason)

    if (targetUserId) {
      await createNotification({
        userId: targetUserId,
        title: 'Signalement de sécurité',
        message: 'Un signalement a été enregistré pour votre dernier trajet. Notre équipe examine le dossier.',
        category: 'warning',
        link: `/ride/${ride._id}`
      })
    }

    return res.json({
      message: "Signalement envoyé",
      reportsCount: ride.safetyReports.length,
      targetStatus: targetUser?.status || null,
      targetReportsCount: targetUser?.safetyReportsCount || null,
      suspended: targetUser?.status === "suspended" || false
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

module.exports = router
