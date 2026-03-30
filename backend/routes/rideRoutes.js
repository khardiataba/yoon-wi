const express = require("express")
const https = require("https")
const Ride = require("../models/Ride")
const { authMiddleware, requireRole, requireVerified } = require("../middleware/auth")
const { computeRideFare, rideCommission } = require("../utils/pricing")

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

// Créer une nouvelle réservation (client)
router.post("/", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { pickup, destination, price, vehicleType, distanceKm, durationMin } = req.body
    if (!pickup || !destination || !price) {
      return res.status(400).json({ message: "pickup, destination et price requis" })
    }

    const finalPrice = computeRideFare(distanceKm, durationMin)
    const commission = rideCommission(finalPrice)

    const ride = await Ride.create({
      userId: req.user._id,
      pickup: normalizeLocation(pickup),
      destination: normalizeLocation(destination),
      price: finalPrice,
      ...commission,
      distanceKm: distanceKm || null,
      durationMin: durationMin || null,
      vehicleType: vehicleType || "Ndar Express Classic",
      status: "pending"
    })

    return res.status(201).json(ride)
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
    return res.json(rides)
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
      return res.json(rides)
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

      return res.json(ride)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

module.exports = router
