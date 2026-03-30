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
  appCommissionPercent: { type: Number, default: 12 },
  appCommissionAmount: { type: Number, default: 0 },
  providerNetAmount: { type: Number, default: 0 },
  vehicleType: { type: String, default: "Ndar Express Classic" },
  distanceKm: { type: Number, default: null },
  durationMin: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model("Ride", rideSchema)
