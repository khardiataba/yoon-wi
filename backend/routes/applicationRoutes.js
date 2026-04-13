const express = require("express")
const Application = require("../models/Applications")
const { authMiddleware, requireRole } = require("../middleware/auth")

const router = express.Router()

// Créer une candidature
router.post(
  "/",
  authMiddleware,
  requireRole(["driver", "technician"]),
  async (req, res) => {
    try {
      const { name, phone, jobType, experience, idCard, drivingLicense } = req.body

      // Validation des champs requis
      if (!name || !phone || !jobType) {
        return res.status(400).json({ message: "Nom, téléphone et type de poste requis" })
      }

      // Vérifier si l'utilisateur a déjà une candidature
      const existingApplication = await Application.findOne({ userId: req.user._id })
      if (existingApplication) {
        return res.status(400).json({ message: "Vous avez déjà une candidature en cours" })
      }

      const application = new Application({
        userId: req.user._id,
        name: String(name).trim(),
        phone: String(phone).trim(),
        jobType: String(jobType).trim(),
        experience: String(experience || "").trim(),
        idCard: idCard || null,
        drivingLicense: drivingLicense || null,
        status: "pending"
      })

      await application.save()

      return res.status(201).json({
        message: "Candidature soumise avec succès",
        applicationId: application._id
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

// Récupérer ses propres candidatures
router.get(
  "/my-applications",
  authMiddleware,
  async (req, res) => {
    try {
      const applications = await Application.find({ userId: req.user._id })
        .sort({ createdAt: -1 })

      return res.json(applications)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

// Liste des candidatures (admin seulement)
router.get(
  "/",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const applications = await Application.find({})
        .populate("userId", "firstName lastName email phone")
        .sort({ createdAt: -1 })

      return res.json(applications)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

// Mettre à jour le statut d'une candidature (admin)
router.patch(
  "/:id/status",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { status } = req.body
      const allowedStatuses = ["pending", "approved", "rejected"]

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Statut invalide" })
      }

      const application = await Application.findById(req.params.id)
      if (!application) {
        return res.status(404).json({ message: "Candidature introuvable" })
      }

      application.status = status
      await application.save()

      return res.json({
        message: "Statut mis à jour",
        application
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

module.exports = router