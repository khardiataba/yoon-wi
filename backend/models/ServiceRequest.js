const mongoose = require("mongoose")

const ServiceRequestSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true },
    technicianId: { type: String, default: null },
    category: {
      type: String,
      enum: ["menuisier", "maçon", "peintre", "pâtissier", "électricien", "coiffure-beaute", "livreur"],
      required: true
    },
    title: String,
    description: { type: String, required: true },
    price: { type: Number, default: 0 },
    appCommissionPercent: { type: Number, default: 15 },
    appCommissionAmount: { type: Number, default: 0 },
    providerNetAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model("ServiceRequest", ServiceRequestSchema)
