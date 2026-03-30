const mongoose = require("mongoose")

const providerDetailsSchema = new mongoose.Schema(
  {
    serviceCategory: String,
    experienceYears: String,
    serviceArea: String,
    availability: String,
    vehicleType: String,
    vehiclePlate: String,
    beautySpecialty: String,
    hasProfessionalTools: Boolean
  },
  { _id: false }
)

const documentReviewSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["missing", "pending", "valid", "rejected"],
      default: "missing"
    },
    note: {
      type: String,
      default: ""
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
)

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: String,
  profilePhotoUrl: String,
  idCardUrl: String,
  idCardFrontUrl: String,
  idCardBackUrl: String,
  licenseUrl: String,
  registrationCardUrl: String,
  role: {
    type: String,
    enum: ["client", "driver", "technician", "server", "admin"],
    default: "client"
  },
  status: {
    type: String,
    enum: ["pending", "needs_revision", "verified", "cancelled"],
    default: "pending"
  },
  reviewNote: {
    type: String,
    default: ""
  },
  providerDetails: { type: providerDetailsSchema, default: () => ({}) },
  documentChecks: {
    profilePhoto: { type: documentReviewSchema, default: () => ({}) },
    idCardFront: { type: documentReviewSchema, default: () => ({}) },
    idCardBack: { type: documentReviewSchema, default: () => ({}) },
    license: { type: documentReviewSchema, default: () => ({}) },
    registrationCard: { type: documentReviewSchema, default: () => ({}) }
  }
})

module.exports = mongoose.model("User", UserSchema)
