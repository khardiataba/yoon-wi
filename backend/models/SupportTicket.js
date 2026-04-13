const mongoose = require('mongoose')

const ticketMessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['client', 'driver', 'technician', 'admin'], required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() }
  },
  { _id: false }
)

const SupportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  category: {
    type: String,
    enum: ['ride', 'payment', 'security', 'technical', 'other'],
    default: 'other'
  },
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  status: { type: String, enum: ['open', 'pending', 'resolved', 'closed'], default: 'open' },
  messages: { type: [ticketMessageSchema], default: [] },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
  resolvedAt: { type: Date, default: null }
})

SupportTicketSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('SupportTicket', SupportTicketSchema)
