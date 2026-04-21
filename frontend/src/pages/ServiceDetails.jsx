/**
 * Service Details & Tracking Page
 * Shows provider details, communication, and task progress
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const getInitials = (name) => {
  return String(name || '').split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || 'ND'
}

const getAssetUrl = (path) => {
  if (!path) return ''
  const base = String(api.defaults.baseURL || '').replace(/\/api\/?$/, '')
  return `${base}${path}`
}

export default function ServiceDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [service, setService] = useState(null)
  const [provider, setProvider] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sendingMsg, setSendingMsg] = useState(false)
  const [contributionStatus, setContributionStatus] = useState(null)

  // Load service details
  useEffect(() => {
    const loadService = async () => {
      try {
        setLoading(true)
        const serviceRes = await api.get(`/services/${id}`)
        setService(serviceRes.data)
        setProvider(serviceRes.data.technicianId || null)

        // Load messages
        const msgRes = await api.get(`/services/${id}/messages`)
        setMessages(msgRes.data || [])

        // Check contribution status
        if (serviceRes.data.platformContributionStatus) {
          setContributionStatus(serviceRes.data.platformContributionStatus)
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }

    if (id) loadService()
  }, [id])

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      setSendingMsg(true)
      await api.post(`/services/${id}/messages`, { content: newMessage })
      setNewMessage('')
      // Reload messages
      const msgRes = await api.get(`/services/${id}/messages`)
      setMessages(msgRes.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur d\'envoi')
    } finally {
      setSendingMsg(false)
    }
  }

  // Verify contribution before starting
  const verifyContribution = async () => {
    try {
      const res = await api.post(`/services/${id}/verify-contribution`)
      if (res.data.success) {
        setContributionStatus('paid')
        return true
      }
      return false
    } catch (err) {
      setError(err.response?.data?.message || 'Contributions non vérifiée')
      return false
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  if (error) return <div className="min-h-screen p-4 flex items-center justify-center text-red-500">{error}</div>

  if (!service) return <div className="min-h-screen p-4">Service non trouvé</div>

  const clientId = typeof service.clientId === "object" ? service.clientId?._id : service.clientId
  const isClient = String(clientId || "") === String(user?._id || "")
  const canCloseMission = contributionStatus === "paid" && messages.length > 0

  return (
    <div className="min-h-screen bg-[#f7f1e6] pb-24">
      {/* Header */}
      <div className="bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] text-white p-4 rounded-b-[30px] shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-2xl bg-white/20 text-white font-semibold"
          >
            ← Retour
          </button>
          <h1 className="text-xl font-bold">Détails Service</h1>
          <div className="w-10"></div>
        </div>

        {/* Service Info */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{service.title || service.category}</h2>
            <p className="text-sm text-white/80">{service.description}</p>
            <div className="flex gap-3 text-sm">
              <span className="bg-white/20 px-3 py-1 rounded-full">
                {service.status === 'accepted' ? 'En cours' : service.status === 'completed' ? 'Terminé' : 'En attente'}
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full">{service.price?.toLocaleString() || '?'} FCFA</span>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Provider Card (if accepted) */}
        {provider && (
          <div className="bg-white rounded-[30px] p-6 shadow-lg border-2 border-[#d7ae49]">
            <h3 className="text-lg font-bold mb-4 text-[#16324f]">Prestataire</h3>
            <div className="flex gap-4 items-start">
              {/* Provider Photo */}
              <div className="flex-shrink-0">
                {(provider.profilePhotoUrl || provider.profilePhoto) ? (
                  <img
                    src={getAssetUrl(provider.profilePhotoUrl || provider.profilePhoto)}
                    alt={provider.name}
                    className="w-24 h-24 rounded-[20px] object-cover shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-[20px] bg-[#1260a1] text-white flex items-center justify-center text-3xl font-bold">
                    {getInitials(provider.name)}
                  </div>
                )}
              </div>

              {/* Provider Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="text-xl font-bold text-[#16324f]">{provider.name}</h4>
                  <p className="text-sm text-[#70839a]">{provider.role === 'driver' ? 'Chauffeur' : provider.role === 'technician' ? 'Technicien' : 'Prestataire'}</p>
                </div>

                {/* Rating */}
                {provider.rating && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#165c96]">{provider.rating.toFixed(1)}</span>
                    <span className="text-sm text-[#70839a]">({provider.totalRatings} avis)</span>
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-2 pt-2 border-t border-[#e6dccf]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#70839a]">Tel</span>
                    <a href={`tel:${provider.phone}`} className="text-[#1260a1] font-semibold hover:underline">
                      {provider.phone}
                    </a>
                  </div>
                  {provider.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#70839a]">Email</span>
                      <a href={`mailto:${provider.email}`} className="text-[#1260a1] font-semibold hover:underline">
                        {provider.email}
                      </a>
                    </div>
                  )}
                  {provider.address && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#70839a]">Adresse</span>
                      <span className="text-[#70839a]">{provider.address}</span>
                    </div>
                  )}
                  
                  {/* GPS Coordinates - New */}
                  {provider.providerDetails?.coordinates?.lat && provider.providerDetails?.coordinates?.lng && (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#70839a]">GPS</span>
                        <span className="text-[#165c96] font-semibold">Localisation GPS</span>
                      </div>
                      <div className="ml-6 space-y-1 mt-1">
                        <p className="text-xs text-[#70839a]">Lat: {provider.providerDetails.coordinates.lat.toFixed(4)}</p>
                        <p className="text-xs text-[#70839a]">Lng: {provider.providerDetails.coordinates.lng.toFixed(4)}</p>
                        <a 
                          href={`https://maps.google.com/?q=${provider.providerDetails.coordinates.lat},${provider.providerDetails.coordinates.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1260a1] text-xs font-semibold hover:underline block mt-2"
                        >
                          Ouvrir dans Google Maps
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* Service Area - New */}
                  {provider.providerDetails?.serviceArea && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#70839a]">Zone</span>
                      <span className="text-[#70839a] text-sm">Zone: <span className="font-semibold text-[#165c96]">{provider.providerDetails.serviceArea}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contribution Status */}
        {isClient && service.status === 'accepted' && (
          <div className="bg-white rounded-[30px] p-6 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-[#16324f]">Contribution Plateforme</h3>
            {contributionStatus === 'paid' ? (
              <div className="bg-[#eefaf2] border-2 border-[#18c56e] rounded-[20px] p-4">
                <p className="text-[#178b55] font-semibold">Contribution payée</p>
                <p className="text-sm text-[#70839a] mt-1">{(service.appCommissionAmount || 0).toLocaleString()} FCFA</p>
              </div>
            ) : (
              <div className="bg-[#fff1f1] border-2 border-[#c45860] rounded-[20px] p-4">
                <p className="text-[#c45860] font-semibold">Contribution en attente</p>
                <p className="text-sm text-[#70839a] mt-1">{(service.appCommissionAmount || 0).toLocaleString()} FCFA</p>
                <button
                  onClick={verifyContribution}
                  className="mt-3 w-full bg-[#1260a1] text-white font-bold py-2 rounded-[20px] hover:opacity-90"
                >
                  Vérifier le paiement
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chat Section */}
        {service.status === 'accepted' && (
          <div className="bg-white rounded-[30px] p-6 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-[#16324f]">Communication</h3>
            <div className="mb-4 rounded-[18px] border border-[#dce7f0] bg-[#f8fbff] px-4 py-3 text-sm text-[#5f7184]">
              Clôture possible uniquement après contribution validée et échange réel entre client et prestataire.
            </div>

            {/* Messages */}
            <div className="bg-[#f7f1e6] rounded-[20px] p-4 h-64 overflow-y-auto mb-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-[#70839a] text-center py-20">Aucun message. Commencez la conversation!</p>
              ) : (
                messages.map((msg, idx) => {
                  const senderId = typeof msg.senderId === "object" ? msg.senderId?._id : msg.senderId
                  const mine = String(senderId || "") === String(user?._id || "")
                  return (
                  <div key={idx} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs px-4 py-2 rounded-[20px] ${
                        mine
                          ? 'bg-[#1260a1] text-white rounded-br-none'
                          : 'bg-white text-[#16324f] rounded-bl-none border border-[#e6dccf]'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${mine ? 'text-white/60' : 'text-[#70839a]'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )})
              )}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Votre message..."
                className="flex-1 rounded-[20px] border border-[#e6dccf] px-4 py-3 text-sm outline-none focus:border-[#1260a1]"
              />
              <button
                onClick={handleSendMessage}
                disabled={sendingMsg || !newMessage.trim()}
                className="bg-[#1260a1] text-white font-bold px-6 py-3 rounded-[20px] hover:opacity-90 disabled:opacity-50"
              >
                {sendingMsg ? '...' : 'Envoyer'}
              </button>
            </div>
          </div>
        )}

        {/* Service Status Timeline */}
        <div className="bg-white rounded-[30px] p-6 shadow-lg">
          <h3 className="text-lg font-bold mb-4 text-[#16324f]">Progression</h3>
          <div className="space-y-4">
            {[
              { step: 'Demande créée', completed: true, icon: '✓' },
              { step: 'Prestataire accepté', completed: service.status !== 'pending', icon: service.status !== 'pending' ? '✓' : '...' },
              { step: 'Contribution vérifiée', completed: contributionStatus === 'paid' && service.status !== 'pending', icon: contributionStatus === 'paid' ? '✓' : '...' },
              { step: 'Communication active', completed: messages.length > 0, icon: messages.length > 0 ? '✓' : '...' },
              { step: 'Prêt à clôturer', completed: canCloseMission, icon: canCloseMission ? '✓' : '...' },
              { step: 'Terminé', completed: service.status === 'completed', icon: service.status === 'completed' ? '✓' : '...' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  item.completed ? 'bg-[#18c56e] text-white' : 'bg-[#e6dccf] text-[#70839a]'
                }`}>
                  {item.icon}
                </div>
                <span className={item.completed ? 'text-[#18c56e] font-semibold' : 'text-[#70839a]'}>{item.step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
