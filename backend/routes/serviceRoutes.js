const express = require("express")
const ServiceRequest = require("../models/ServiceRequest")
const { authMiddleware, requireRole, requireVerified } = require("../middleware/auth")
const { serviceCommission } = require("../utils/pricing")

const router = express.Router()

// Créer une demande de service (client)
router.post("/", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { category, title, description, price } = req.body
    if (!category || !description) {
      return res.status(400).json({ message: "Category et description requis" })
    }

    const safePrice = Number(price) || 0
    const commission = serviceCommission(safePrice)

    const request = await ServiceRequest.create({
      clientId: req.user._id,
      category,
      title,
      description,
      price: safePrice,
      ...commission,
      status: "pending"
    })

    return res.status(201).json(request)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

// Lister les demandes du client ou du technicien
router.get("/", authMiddleware, requireVerified, async (req, res) => {
  try {
    const { role, _id } = req.user
    const filter = role === "technician" ? { technicianId: _id } : { clientId: _id }
    const requests = await ServiceRequest.find(filter).sort({ createdAt: -1 })
    return res.json(requests)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Erreur serveur" })
  }
})

// Demandes disponibles (techniciens)
router.get(
  "/available",
  authMiddleware,
  requireVerified,
  requireRole("technician"),
  async (req, res) => {
    try {
      const requests = await ServiceRequest.find({ status: "pending" }).sort({ createdAt: -1 })
      return res.json(requests)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

// Accepter une demande (technicien)
router.patch(
  "/:id/accept",
  authMiddleware,
  requireVerified,
  requireRole("technician"),
  async (req, res) => {
    try {
      const request = await ServiceRequest.findById(req.params.id)
      if (!request) return res.status(404).json({ message: "Demande non trouvée" })
      if (request.status !== "pending") {
        return res.status(400).json({ message: "Demande non disponible" })
      }

      request.status = "accepted"
      request.technicianId = req.user._id
      await request.save()

      return res.json(request)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

module.exports = router
