const express = require("express")
const VehicleRental = require("../models/VehicleRental")
const User = require("../models/User")
const { authMiddleware, requireRole, requireVerified } = require("../middleware/auth")
const haversineDistanceKm = require("../utils/distance")

const router = express.Router()

// Get all vehicle rentals with filters
router.get("/", async (req, res) => {
  try {
    const { vehicleType, lat, lng, maxDistance = 50 } = req.query

    let query = { availabilityStatus: "available" }

    if (vehicleType) {
      query.vehicleType = vehicleType
    }

    const rentals = await VehicleRental.find(query)
      .populate("provider", "name rating profilePhotoUrl")
      .lean()

    // Filter by distance if coordinates provided
    let filtered = rentals
    if (lat && lng) {
      filtered = rentals.filter((rental) => {
        if (!rental.location || !rental.location.lat) return false
        const distance = haversineDistanceKm(
          { lat: parseFloat(lat), lng: parseFloat(lng) },
          { lat: rental.location.lat, lng: rental.location.lng }
        )
        return distance <= parseFloat(maxDistance)
      })
    }

    // Sort by rating and distance
    filtered.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating
      return (a.distance || 0) - (b.distance || 0)
    })

    res.json({
      success: true,
      rentals: filtered,
      count: filtered.length
    })
  } catch (error) {
    console.error("Error fetching rentals:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get vehicle rental by ID
router.get("/:id", async (req, res) => {
  try {
    const rental = await VehicleRental.findById(req.params.id)
      .populate("provider", "name email phone rating profilePhotoUrl providerDetails")

    if (!rental) {
      return res.status(404).json({ success: false, error: "Vehicle not found" })
    }

    res.json({ success: true, rental })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get rentals by vehicle type
router.get("/type/:typeQuery", async (req, res) => {
  try {
    const { typeQuery } = req.params
    const { lat, lng } = req.query

    const rentals = await VehicleRental.find({
      vehicleType: typeQuery,
      availabilityStatus: "available"
    })
      .populate("provider", "name rating profilePhotoUrl")
      .lean()

    let filtered = rentals
    if (lat && lng) {
      filtered = rentals.filter((rental) => {
        if (!rental.location || !rental.location.lat) return false
        const distance = haversineDistanceKm(
          { lat: parseFloat(lat), lng: parseFloat(lng) },
          { lat: rental.location.lat, lng: rental.location.lng }
        )
        return distance <= 50
      })
    }

    res.json({ success: true, rentals: filtered, count: filtered.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create new rental (Provider only)
router.post("/", authMiddleware, requireRole("technician"), async (req, res) => {
  try {
    const { vehicleName, vehicleType, pricePerDay, pricePerHour, capacity, brand, model, color, features } = req.body

    if (!vehicleName || !vehicleType || !pricePerDay) {
      return res.status(400).json({ success: false, error: "Missing required fields" })
    }

    if (!["small", "large"].includes(vehicleType)) {
      return res.status(400).json({ success: false, error: "Invalid vehicle type" })
    }

    const provider = await User.findById(req.user.id)
    if (!provider || !provider.providerDetails?.coordinates) {
      return res.status(400).json({ success: false, error: "Please set your location first" })
    }

    const rental = new VehicleRental({
      provider: req.user.id,
      vehicleName,
      vehicleType,
      pricePerDay,
      pricePerHour: pricePerHour || null,
      capacity: capacity || {},
      brand,
      model,
      color,
      features: features || [],
      location: {
        address: provider.providerDetails?.locationLabel || "Location not set",
        lat: provider.providerDetails.coordinates.lat,
        lng: provider.providerDetails.coordinates.lng
      }
    })

    await rental.save()

    res.status(201).json({
      success: true,
      message: "Vehicle rental created successfully",
      rental
    })
  } catch (error) {
    console.error("Error creating rental:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update rental
router.put("/:id", authMiddleware, requireRole("technician"), async (req, res) => {
  try {
    const rental = await VehicleRental.findById(req.params.id)

    if (!rental) {
      return res.status(404).json({ success: false, error: "Rental not found" })
    }

    if (rental.provider.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not authorized" })
    }

    const updatedRental = await VehicleRental.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    )

    res.json({
      success: true,
      message: "Rental updated successfully",
      rental: updatedRental
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete rental
router.delete("/:id", authMiddleware, requireRole("technician"), async (req, res) => {
  try {
    const rental = await VehicleRental.findById(req.params.id)

    if (!rental) {
      return res.status(404).json({ success: false, error: "Rental not found" })
    }

    if (rental.provider.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not authorized" })
    }

    await VehicleRental.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Rental deleted successfully"
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get rentals by provider
router.get("/provider/:providerId", async (req, res) => {
  try {
    const rentals = await VehicleRental.find({ provider: req.params.providerId })
      .populate("provider", "name rating profilePhotoUrl")

    res.json({ success: true, rentals })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
