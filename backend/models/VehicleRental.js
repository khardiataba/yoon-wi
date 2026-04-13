const mongoose = require("mongoose")

const VehicleRentalSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    vehicleName: {
      type: String,
      required: true
    },
    vehicleType: {
      type: String,
      enum: ["small", "large"],
      required: true,
      description: "small: moto, scooter, voiture compacte | large: SUV, minibus, van"
    },
    description: String,
    pricePerDay: {
      type: Number,
      required: true
    },
    pricePerHour: {
      type: Number,
      default: null
    },
    capacity: {
      passengers: Number,
      luggage: String
    },
    brand: String,
    model: String,
    year: Number,
    color: String,
    licensePlate: String,
    availabilityStatus: {
      type: String,
      enum: ["available", "rented", "maintenance"],
      default: "available"
    },
    location: {
      address: String,
      lat: Number,
      lng: Number
    },
    features: [String], // Climatisation, Bluetooth, etc.
    insuranceIncluded: {
      type: Boolean,
      default: false
    },
    driverLicenseRequired: {
      type: Boolean,
      default: true
    },
    photoUrl: String,
    additionalPhotos: [String],
    rating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0
    },
    totalRentals: {
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

module.exports = mongoose.model("VehicleRental", VehicleRentalSchema)
