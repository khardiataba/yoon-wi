const Notification = require('../models/Notification')
const User = require('../models/User')
const socketManager = require('../socket/socketManager')

const buildNotificationPayload = (notification) => ({
  _id: notification._id,
  userId: notification.userId,
  title: notification.title,
  message: notification.message,
  category: notification.category,
  link: notification.link,
  metadata: notification.metadata,
  isRead: notification.isRead,
  createdAt: notification.createdAt
})

const createNotification = async ({ userId, title, message, category = 'info', link = '', metadata = {} }) => {
  const notification = await Notification.create({
    userId,
    title,
    message,
    category,
    link,
    metadata
  })

  socketManager.emitToUser(userId, 'notification:new', buildNotificationPayload(notification))
  return notification
}

const createNotifications = async (userIds, payload) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return []
  }

  return Promise.all(
    userIds.map((userId) => createNotification({ userId, ...payload }))
  )
}

const notifyAdmins = async (payload) => {
  const admins = await User.find({ role: 'admin' }).select('_id')
  const adminIds = admins.map((admin) => admin._id)
  return createNotifications(adminIds, payload)
}

module.exports = {
  createNotification,
  createNotifications,
  notifyAdmins
}
