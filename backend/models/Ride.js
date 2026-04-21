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

const rideSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  pickup: { type: locationSchema, required: true },
  destination: { type: locationSchema, required: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "ongoing", "completed", "cancelled"],
    default: "pending"
  },
  price: { type: Number, required: true },
  appCommissionPercent: { type: Number, default: 1 },
  appCommissionAmount: { type: Number, default: 0 },
  providerNetAmount: { type: Number, default: 0 },
  vehicleType: { type: String, default: "YOONWI Classic" },
  rideCategory: {
    type: String,
    enum: ["standard", "bus_student"],
    default: "standard"
  },
  busZone: {
    type: String,
    enum: ["", "police", "ville"],
    default: ""
  },
  busOptions: {
    type: busOptionsSchema,
    default: () => ({})
  },
  paymentMethod: { type: String, enum: ["Cash", "Wave", "OM", "Card"], default: "Cash" },
  distanceKm: { type: Number, default: null },
  durationMin: { type: Number, default: null },
  safetyCode: { type: String, default: null, select: false },
  safetyCodeVerifiedAt: { type: Date, default: null },
  safetyReports: { type: [safetyReportSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
})

// Add indexes for performance
rideSchema.index({ userId: 1, createdAt: -1 })
rideSchema.index({ driverId: 1, status: 1 })
rideSchema.index({ status: 1, createdAt: -1 })
rideSchema.index({ userId: 1, status: 1 })

module.exports = mongoose.model("Ride", rideSchema)
