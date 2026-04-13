const express = require("express")
const ProviderGallery = require("../models/ProviderGallery")
const { authMiddleware, requireRole } = require("../middleware/auth")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const router = express.Router()

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/gallery")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "gallery-" + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type. Only images are allowed."))
    }
  }
})

// Get provider's gallery
router.get("/provider/:providerId", async (req, res) => {
  try {
    let gallery = await ProviderGallery.findOne({ provider: req.params.providerId })

    if (!gallery) {
      gallery = new ProviderGallery({ provider: req.params.providerId, galleryItems: [] })
      await gallery.save()
    }

    res.json({ success: true, gallery })
  } catch (error) {
    console.error("Error fetching gallery:", error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Add image to gallery
router.post("/:providerId/upload", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (req.user.id !== req.params.providerId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Not authorized" })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" })
    }

    const { title, description, category = "work", tags = [] } = req.body

    const imageUrl = `/uploads/gallery/${req.file.filename}`

    let gallery = await ProviderGallery.findOne({ provider: req.params.providerId })

    if (!gallery) {
      gallery = new ProviderGallery({
        provider: req.params.providerId,
        galleryItems: [],
        coverImage: imageUrl
      })
    }

    // Add new item to gallery
    gallery.galleryItems.push({
      title: title || "Untitled",
      description: description || "",
      imageUrl: imageUrl,
      thumbnailUrl: imageUrl,
      category: category,
      tags: Array.isArray(tags) ? tags : tags.split(","),
      uploadedAt: new Date()
    })

    gallery.totalImages = gallery.galleryItems.length

    // Set cover image if it's the first one
    if (!gallery.coverImage) {
      gallery.coverImage = imageUrl
    }

    gallery.updatedAt = new Date()
    await gallery.save()

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      gallery
    })
  } catch (error) {
    console.error("Error uploading image:", error)

    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err)
      })
    }

    res.status(500).json({ success: false, error: error.message })
  }
})

// Upload before-after images
router.post("/:providerId/upload-before-after", authMiddleware, upload.array("images", 2), async (req, res) => {
  try {
    if (req.user.id !== req.params.providerId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Not authorized" })
    }

    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ success: false, error: "Please upload both before and after images" })
    }

    const { title, description, tags = [] } = req.body

    const beforeUrl = `/uploads/gallery/${req.files[0].filename}`
    const afterUrl = `/uploads/gallery/${req.files[1].filename}`

    let gallery = await ProviderGallery.findOne({ provider: req.params.providerId })

    if (!gallery) {
      gallery = new ProviderGallery({
        provider: req.params.providerId,
        galleryItems: [],
        coverImage: afterUrl
      })
    }

    gallery.galleryItems.push({
      title: title || "Before & After",
      description: description || "",
      imageUrl: afterUrl,
      thumbnailUrl: afterUrl,
      category: "before-after",
      beforeAfter: {
        beforeUrl: beforeUrl,
        afterUrl: afterUrl
      },
      tags: Array.isArray(tags) ? tags : tags.split(","),
      uploadedAt: new Date()
    })

    gallery.totalImages = gallery.galleryItems.length
    gallery.updatedAt = new Date()
    await gallery.save()

    res.status(201).json({
      success: true,
      message: "Before-after images uploaded successfully",
      gallery
    })
  } catch (error) {
    console.error("Error uploading before-after images:", error)

    if (req.files) {
      req.files.forEach((file) => {
        fs.unlink(file.path, (err) => {
          if (err) console.error("Error deleting file:", err)
        })
      })
    }

    res.status(500).json({ success: false, error: error.message })
  }
})

// Set cover image
router.put("/:providerId/cover", authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.providerId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Not authorized" })
    }

    const { imageUrl } = req.body

    if (!imageUrl) {
      return res.status(400).json({ success: false, error: "Image URL is required" })
    }

    const gallery = await ProviderGallery.findOneAndUpdate(
      { provider: req.params.providerId },
      { coverImage: imageUrl, updatedAt: new Date() },
      { new: true }
    )

    res.json({ success: true, gallery })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete gallery item
router.delete("/:providerId/item/:itemId", authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.providerId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Not authorized" })
    }

    const gallery = await ProviderGallery.findOne({ provider: req.params.providerId })

    if (!gallery) {
      return res.status(404).json({ success: false, error: "Gallery not found" })
    }

    const item = gallery.galleryItems.id(req.params.itemId)

    if (!item) {
      return res.status(404).json({ success: false, error: "Item not found" })
    }

    // Delete file from disk
    const filePath = path.join(__dirname, "../uploads/gallery", item.imageUrl.split("/").pop())
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting file:", err)
    })

    gallery.galleryItems.pull(req.params.itemId)
    gallery.totalImages = gallery.galleryItems.length
    gallery.updatedAt = new Date()
    await gallery.save()

    res.json({ success: true, message: "Item deleted successfully", gallery })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get gallery images by category
router.get("/provider/:providerId/category/:category", async (req, res) => {
  try {
    const gallery = await ProviderGallery.findOne({ provider: req.params.providerId })

    if (!gallery) {
      return res.json({ success: true, items: [] })
    }

    const items = gallery.galleryItems.filter((item) => item.category === req.params.category)

    res.json({ success: true, items })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
