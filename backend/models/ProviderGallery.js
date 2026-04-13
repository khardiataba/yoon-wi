const mongoose = require("mongoose")

const GalleryItemSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    imageUrl: {
      type: String,
      required: true
    },
    thumbnailUrl: String,
    category: {
      type: String,
      default: "work"
      // work: exemples de travaux/services réalisés
      // portfolio: portfolio
      // before-after: avant/après
      // team: équipe/personnel
      // facility: installations
    },
    beforeAfter: {
      beforeUrl: String,
      afterUrl: String
    },
    tags: [String],
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
)

const ProviderGallerySchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    galleryItems: [GalleryItemSchema],
    coverImage: String,
    totalImages: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model("ProviderGallery", ProviderGallerySchema)
