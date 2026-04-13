const express = require('express')
const { authMiddleware, requireRole } = require('../middleware/auth')
const SupportTicket = require('../models/SupportTicket')
const { createNotification, notifyAdmins } = require('../services/notificationService')

const router = express.Router()

router.post('/ticket', authMiddleware, async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body

    if (!subject || !message) {
      return res.status(400).json({ message: 'Sujet et message obligatoires.' })
    }

    const ticket = new SupportTicket({
      userId: req.user._id,
      subject: subject.trim(),
      category: category || 'other',
      priority: priority || 'normal',
      messages: [{
        senderId: req.user._id,
        senderRole: req.user.role,
        message: message.trim()
      }],
      status: 'open'
    })

    await ticket.save()

    await createNotification({
      userId: req.user._id,
      title: 'Ticket support créé',
      message: 'Votre demande de support a bien été prise en compte. Nous revenons vers vous rapidement.',
      category: 'info',
      link: '/support'
    })

    await notifyAdmins({
      title: 'Nouveau ticket support',
      message: `Un nouveau ticket a été soumis par ${req.user.firstName || req.user.name || 'un utilisateur'}.`,
      category: 'info',
      link: '/support'
    })

    return res.json({ success: true, ticket })
  } catch (err) {
    console.error('Erreur creation ticket support:', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.get('/tickets', authMiddleware, async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? {}
      : { userId: req.user._id }

    const tickets = await SupportTicket.find(filter)
      .sort({ updatedAt: -1 })
      .populate('userId', 'firstName lastName email role')
      .lean()

    return res.json(tickets)
  } catch (err) {
    console.error('Erreur list tickets:', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/tickets/:id/respond', authMiddleware, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket introuvable.' })
    }

    if (req.user.role !== 'admin' && !ticket.userId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Acces refuse.' })
    }

    const { message, status } = req.body
    if (!message && !status) {
      return res.status(400).json({ message: 'Message ou statut requis.' })
    }

    if (message) {
      ticket.messages.push({
        senderId: req.user._id,
        senderRole: req.user.role,
        message: message.trim()
      })
    }

    if (status && ['open', 'pending', 'resolved', 'closed'].includes(status)) {
      ticket.status = status
      if (status === 'resolved') {
        ticket.resolvedAt = new Date()
      }
    }

    await ticket.save()

    if (!ticket.userId.equals(req.user._id)) {
      await createNotification({
        userId: ticket.userId,
        title: 'Réponse à votre ticket',
        message: 'Une réponse a été ajoutée à votre demande de support. Consultez la conversation.',
        category: 'info',
        link: '/support'
      })
    }

    return res.json({ success: true, ticket })
  } catch (err) {
    console.error('Erreur repondre au ticket:', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
})

module.exports = router
