const express = require("express")
const crypto = require("crypto")
const https = require("https")
const Ride = require("../models/Ride")
const User = require("../models/User")
const { authMiddleware, requireRole, requireVerified } = require("../middleware/auth")
const { computeRideFare, rideCommission } = require("../utils/pricing")
const { createNotification } = require("../services/notificationService")

const router = express.Router()

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
    const { pickup, destination, price, vehicleType, paymentMethod, distanceKm, durationMin } = req.body
    if (!pickup || !destination || !price) {
      return res.status(400).json({ message: "pickup, destination et price requis" })
    }

    const finalPrice = computeRideFare(distanceKm, durationMin)
    const commission = rideCommission(finalPrice)
    const safetyCode = generateSafetyCode()

    const ride = await Ride.create({
      userId: req.user._id,
      pickup: normalizeLocation(pickup),
      destination: normalizeLocation(destination),
      price: finalPrice,
      ...commission,
      distanceKm: distanceKm || null,
      durationMin: durationMin || null,
      vehicleType: vehicleType || "YOONBI Classic",
      paymentMethod: paymentMethod || "Cash",
      safetyCode,
      status: "pending"
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
    const { pickup, destination } = req.body
    if (!pickup || !destination) {
      return res.status(400).json({ message: "pickup et destination requis" })
    }

    const coords = `${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}`
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
              return res.json(fallbackEstimate)
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

// Accepter une course (chauffeur)
router.patch(
  "/:id/accept",
  authMiddleware,
  requireVerified,
  requireRole("driver"),
  async (req, res) => {
    try {
      const ride = await Ride.findById(req.params.id)
      if (!ride) return res.status(404).json({ message: "Course non trouvée" })
      if (ride.status !== "pending") {
        return res.status(400).json({ message: "Course non disponible" })
      }

      ride.status = "accepted"
      ride.driverId = req.user._id
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


    const includeSafetyCode = String(ride.userId || "") === String(req.user._id || "")
    return res.json(await serializeRide(ride, { includeSafetyCode, viewerUserId: req.user._id, viewerRole: req.user.role }))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

router.patch(
  "/:id/start",
  authMiddleware,
  requireVerified,
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

      return res.json(await serializeRide(ride, { viewerUserId: req.user._id, viewerRole: req.user.role }))
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.post("/:id/safety-report", authMiddleware, requireVerified, async (req, res) => {
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
