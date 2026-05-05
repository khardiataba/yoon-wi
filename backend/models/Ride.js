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

const safetyReportSchema = new mongoose.Schema(
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

const busOptionsSchema = new mongoose.Schema(
  {
    subscriptionPlan: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none"
    },
    reservedSeat: { type: Boolean, default: false },
    seats: { type: Number, default: 1 },
    travelDate: { type: Date, default: null },
    useTransportCredit: { type: Boolean, default: false },
    creditAmount: { type: Number, default: 0 },
    amountPaidNow: { type: Number, default: 0 },
    amountRemaining: { type: Number, default: 0 }
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
      enum: ["passenger-to-driver", "driver-to-passenger"],
      required: true
    },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
)

const rideSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  pickup: { type: locationSchema, required: true },
  destination: { type: locationSchema, required: true },
  currentDriverLocation: { type: locationSchema, default: null },
  routeGeometry: {
    type: [[Number]],
    default: []
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "ongoing", "completed", "cancelled"],
    default: "pending"
  },
  driverAvailabilityStatus: {
    type: String,
    enum: ["searching", "no_driver_available", "driver_assigned"],
    default: "searching"
  },
  price: { type: Number, required: true },
  appCommissionPercent: { type: Number, default: 10 },
  appCommissionAmount: { type: Number, default: 0 },
  appCommissionDebitedAt: { type: Date, default: null },
  providerNetAmount: { type: Number, default: 0 },
  vehicleType: { type: String, default: "YOONWI Classic" },
  rideCategory: {
    type: String,
    enum: ["standard", "bus_student"],
    default: "standard"
  },
  busZone: {
    type: String,
    enum: ["", "marche", "police", "ville"],
    default: ""
  },
  busOptions: {
    type: busOptionsSchema,
    default: () => ({})
  },
  paymentMethod: { type: String, enum: ["Cash", "Wave", "OM", "Card"], default: "Cash" },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "refunded"],
    default: "pending"
  },
  paidAt: { type: Date, default: null },
  distanceKm: { type: Number, default: null },
  durationMin: { type: Number, default: null },
  safetyCode: { type: String, default: null, select: false },
  safetyCodeVerifiedAt: { type: Date, default: null },
  safetyReports: { type: [safetyReportSchema], default: [] },
  ratings: { type: [ratingSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
})

// Add indexes for performance
rideSchema.index({ userId: 1, createdAt: -1 })
rideSchema.index({ driverId: 1, status: 1 })
rideSchema.index({ status: 1, createdAt: -1 })
rideSchema.index({ userId: 1, status: 1 })

module.exports = mongoose.model("Ride", rideSchema)
