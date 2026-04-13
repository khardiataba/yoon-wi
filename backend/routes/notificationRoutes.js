const express = require('express')
const { authMiddleware } = require('../middleware/auth')
const Notification = require('../models/Notification')

const router = express.Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 })
    return res.json(notifications)
  } catch (err) {
    console.error('Erreur get notifications:', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, isRead: false })
    return res.json({ success: true, unreadCount: count })
  } catch (err) {
    console.error('Erreur unread count:', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/mark-read', authMiddleware, async (req, res) => {
  try {
    const { notificationIds = [] } = req.body
    const filter = {
      userId: req.user._id,
      _id: { $in: notificationIds }
    }

    await Notification.updateMany(filter, { $set: { isRead: true } })
    return res.json({ success: true, message: 'Notifications marquees comme lues.' })
  } catch (err) {
    console.error('Erreur mark read:', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { $set: { isRead: true } })
    return res.json({ success: true, message: 'Toutes les notifications ont ete marquees comme lues.' })
  } catch (err) {
    console.error('Erreur mark all read:', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
})

// Test endpoint for debugging - create a test notification
router.post('/test-create', authMiddleware, async (req, res) => {
  try {
    const testNotification = new Notification({
      userId: req.user._id,
      title: 'Notification de test',
      message: 'Ceci est une notification de test pour verifier que le systeme fonctionne correctement.',
      category: 'info',
      isRead: false
    })
    await testNotification.save()
    return res.json({
      success: true,
      message: 'Notification de test creee',
      notification: testNotification
    })
  } catch (err) {
    console.error('Erreur creation notification test:', err)
    return res.status(500).json({ message: 'Erreur serveur', error: err.message })
  }
})

module.exports = router
