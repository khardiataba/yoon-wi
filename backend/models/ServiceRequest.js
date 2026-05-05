const mongoose = require("mongoose")

const locationSchema = new mongoose.Schema(
  {
    name: String,
    address: String,
    lat: Number,
    lng: Number
  },
  { _id: false }
)

const serviceReportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: "incident"
    },
    message: {
      type: String,
      default: ""
    },
    createdByRole: {
      type: String,
      default: "client"
    },
    location: {
      type: locationSchema,
      default: () => ({})
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
)

const ratingSchema = new mongoose.Schema(
  {
    raterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ratedId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },
    type: {
      type: String,
      enum: ["client-to-provider", "provider-to-client"],
      required: true
    },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
)

const ServiceRequestSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true },
    technicianId: { type: String, default: null },
    preferredProviderId: { type: String, default: null },
    preferredProviderName: { type: String, default: "" },
    preferredDistanceKm: { type: Number, default: null },
    clientBudget: { type: Number, default: 0 },
    category: {
      type: String,
      enum: ["menuisier", "ma\u00e7on", "peintre", "p\u00e2tissier", "\u00e9lectricien", "coiffure-beaute", "livreur", "autres"],
      required: true
    },
    serviceFamily: {
      type: String,
      enum: ["artisan", "food", "beauty", "delivery", "other"],
      default: "other"
    },
    title: String,
    description: { type: String, required: true },
    price: { type: Number, default: 0 },
    quotedPrice: { type: Number, default: 0 },
    quoteNote: { type: String, default: "" },
    quotedBy: { type: String, default: null },
    quotedAt: { type: Date, default: null },
    quoteAcceptedAt: { type: Date, default: null },
    appCommissionPercent: { type: Number, default: 10 },
    appCommissionAmount: { type: Number, default: 0 },
    appCommissionDebitedAt: { type: Date, default: null },
    providerNetAmount: { type: Number, default: 0 },
    safetyCode: { type: String, default: null, select: false },
    safetyCodeVerifiedAt: { type: Date, default: null },
    safetyReports: { type: [serviceReportSchema], default: [] },
    ratings: { type: [ratingSchema], default: [] },
    platformContributionStatus: {
      type: String,
      enum: ["due", "paid", "refunded"],
      default: "due"
    },
    platformContributionAmountPaid: {
      type: Number,
      default: 0
    },
    platformContributionPaymentMethod: {
      type: String,
      default: ""
    },
    platformContributionCollectedAt: {
      type: Date,
      default: null
    },
    platformContributionReference: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "quoted", "accepted", "in_progress", "completed", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
)

// Add indexes for performance
ServiceRequestSchema.index({ clientId: 1, createdAt: -1 })
ServiceRequestSchema.index({ technicianId: 1, status: 1 })
ServiceRequestSchema.index({ status: 1, createdAt: -1 })
ServiceRequestSchema.index({ category: 1, status: 1 })

module.exports = mongoose.model("ServiceRequest", ServiceRequestSchema)
