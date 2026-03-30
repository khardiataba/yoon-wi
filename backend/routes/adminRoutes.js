const express = require("express")
const User = require("../models/User")
const { authMiddleware, requireRole } = require("../middleware/auth")

const router = express.Router()

const getRequiredDocuments = (user) => {
  if (user.role === "driver") {
    return ["profilePhoto", "idCardFront", "idCardBack", "license", "registrationCard"]
  }

  if (user.role === "technician") {
    return ["profilePhoto", "idCardFront", "idCardBack"]
  }

  return []
}

const getDocumentUrl = (user, documentKey) => {
  if (documentKey === "profilePhoto") return user.profilePhotoUrl
  if (documentKey === "idCardFront") return user.idCardFrontUrl || user.idCardUrl
  if (documentKey === "idCardBack") return user.idCardBackUrl || user.idCardUrl
  if (documentKey === "license") return user.licenseUrl
  if (documentKey === "registrationCard") return user.registrationCardUrl
  return null
}

// Liste des utilisateurs en attente (chauffeurs + techniciens)
router.get(
  "/users/pending",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const pendingUsers = await User.find({
        status: { $in: ["pending", "needs_revision"] },
        role: { $in: ["driver", "technician"] }
      }).select("firstName lastName name email phone role status reviewNote profilePhotoUrl idCardUrl idCardFrontUrl idCardBackUrl licenseUrl registrationCardUrl providerDetails documentChecks")

      return res.json(pendingUsers)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.patch(
  "/users/:id/documents-review",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable" })
      }

      const { documentKey, status, note } = req.body
      const allowedKeys = ["profilePhoto", "idCardFront", "idCardBack", "license", "registrationCard"]
      const allowedStatuses = ["pending", "valid", "rejected"]

      if (!allowedKeys.includes(documentKey)) {
        return res.status(400).json({ message: "Document inconnu" })
      }

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Statut de document invalide" })
      }

      if (!getDocumentUrl(user, documentKey)) {
        return res.status(400).json({ message: "Le document n'a pas encore ete fourni" })
      }

      user.documentChecks[documentKey] = {
        status,
        note: (note || "").trim(),
        reviewedAt: new Date()
      }

      if (status === "rejected") {
        user.status = "needs_revision"
      }

      await user.save()

      return res.json({
        message: "Controle du document enregistre",
        documentKey,
        documentCheck: user.documentChecks[documentKey]
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.patch(
  "/users/:id/verify",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const userId = req.params.id
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable" })
      }

      const requiredDocuments = getRequiredDocuments(user)

      for (const documentKey of requiredDocuments) {
        if (!getDocumentUrl(user, documentKey)) {
          return res.status(400).json({ message: `Document requis manquant: ${documentKey}` })
        }

        if (user.documentChecks?.[documentKey]?.status !== "valid") {
          return res.status(400).json({ message: `Le document ${documentKey} doit etre marque comme valide avant approbation` })
        }
      }

      user.status = "verified"
      user.reviewNote = ""
      await user.save()

      return res.json({ message: "Utilisateur validé", userId: user._id })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.patch(
  "/users/:id/request-revision",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable" })
      }

      const note = String(req.body?.note || "").trim()
      if (!note) {
        return res.status(400).json({ message: "Expliquez ce que la personne doit corriger." })
      }

      user.status = "needs_revision"
      user.reviewNote = note
      await user.save()

      return res.json({ message: "Demande de correction envoyee." })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

router.patch(
  "/users/:id/cancel",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable" })
      }

      const note = String(req.body?.note || "").trim()
      if (!note) {
        return res.status(400).json({ message: "Expliquez pourquoi l'inscription est annulee." })
      }

      user.status = "cancelled"
      user.reviewNote = note
      await user.save()

      return res.json({ message: "Inscription annulee." })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ message: "Erreur serveur" })
    }
  }
)

module.exports = router
