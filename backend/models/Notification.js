const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  category: { type: String, enum: ['info', 'warning', 'success', 'security'], default: 'info' },
  link: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: () => new Date() }
})

module.exports = mongoose.model('Notification', NotificationSchema)
