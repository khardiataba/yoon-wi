// backend/routes/userRoutes.js
const express = require("express")
const router = express.Router()
const { authMiddleware } = require("../middleware/auth")
const User = require("../models/User")
const upload = require("../middleware/upload")

// Get user profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password")
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }
    res.json({ success: true, user })
  } catch (error) {
    console.error("Erreur obtenir profil:", error)
    res.status(500).json({ message: "Erreur serveur" })
  }
})

// Update user profile
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phone, providerDetails, profilePhotoUrl } = req.body
    const userId = req.user.id
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    const updateData = {}
    
    // Mettre à jour le nom et prénom si fournis
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    
    // Mettre à jour le nom complet automatiquement
    if (firstName !== undefined || lastName !== undefined) {
      updateData.name = `${firstName || user.firstName} ${lastName || user.lastName}`.trim()
    }
    
    // Mettre à jour le téléphone
    if (phone !== undefined) updateData.phone = phone
    
    // Mettre à jour la photo de profil
    if (profilePhotoUrl !== undefined) updateData.profilePhotoUrl = profilePhotoUrl
    
    // Mise à jour des détails du prestataire (pour drivers et technicians)
    if (providerDetails) {
      updateData.providerDetails = {
        ...user.providerDetails?.toObject?.() || user.providerDetails || {},
        ...providerDetails,
        // Assurez-vous que les coordonnées sont valides
        coordinates: providerDetails.coordinates ? {
          lat: Number(providerDetails.coordinates.lat) || 0,
          lng: Number(providerDetails.coordinates.lng) || 0
        } : user.providerDetails?.coordinates
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password")

    res.json({ 
      success: true, 
      user: updatedUser, 
      message: "Profil mis à jour avec succès"
    })
  } catch (error) {
    console.error("Erreur mise à jour profil:", error)
    res.status(500).json({ message: "Erreur serveur" })
  }
})

// Delete user account
router.delete("/account", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id

    const user = await User.findByIdAndDelete(userId)

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    res.json({ success: true, message: "Compte supprimé avec succès" })
  } catch (error) {
    console.error("Erreur suppression compte:", error)
    res.status(500).json({ message: "Erreur serveur" })
  }
})

// Delete user information
router.delete("/info/:field", authMiddleware, async (req, res) => {
  try {
    const { field } = req.params
    const userId = req.user.id
    const allowedFields = ["phone", "address", "city", "zipCode", "profileImage"]

    if (!allowedFields.includes(field)) {
      return res.status(400).json({ message: "Champ non autorisé" })
    }

    const updateData = { [field]: null }
    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password")

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" })
    }

    res.json({ success: true, user, message: `${field} supprimé avec succès` })
  } catch (error) {
    console.error("Erreur suppression information:", error)
    res.status(500).json({ message: "Erreur serveur" })
  }
})

module.exports = router
