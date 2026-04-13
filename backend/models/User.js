const mongoose = require("mongoose")

const providerDetailsSchema = new mongoose.Schema(
  {
    serviceCategory: String,
    experienceYears: String,
    serviceArea: String,
    locationLabel: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    availability: String,
    vehicleBrand: String,
    vehicleType: String,
    vehiclePlate: String,
    beautySpecialty: String,
    otherServiceDetail: String,
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
    enum: ["pending", "needs_revision", "verified", "cancelled", "suspended"],
    default: "pending"
  },
  reviewNote: {
    type: String,
    default: ""
  },
  safetyReportsCount: {
    type: Number,
    default: 0
  },
  safetySuspendedAt: {
    type: Date,
    default: null
  },
  safetySuspensionReason: {
    type: String,
    default: ""
  },
  safetyLastReportAt: {
    type: Date,
    default: null
  },
  // Rating and Reputation System
  rating: {
    type: Number,
    default: 5.0,
    min: 1.0,
    max: 5.0
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  ratingSum: {
    type: Number,
    default: 0
  },
  completedRides: {
    type: Number,
    default: 0
  },
  cancelledRides: {
    type: Number,
    default: 0
  },
  onTimeRate: {
    type: Number,
    default: 1.0,
    min: 0,
    max: 1
  },
  // Driver/Technician Stats
  totalEarnings: {
    type: Number,
    default: 0
  },
  todayEarnings: {
    type: Number,
    default: 0
  },
  weeklyEarnings: {
    type: Number,
    default: 0
  },
  monthlyEarnings: {
    type: Number,
    default: 0
  },
  // Online Status
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    updatedAt: Date
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
