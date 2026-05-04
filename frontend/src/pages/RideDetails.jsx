import { useCallback, useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import api from "../api"
import { useAuth } from "../context/AuthContext"
import RatingModal from "../components/RatingModal"
import { ratingAPI } from "../api"

export default function RideDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ride, setRide] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [sendingMsg, setSendingMsg] = useState(false)
  const [paying, setPaying] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [ratingOpen, setRatingOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadRide = useCallback(async () => {
    const response = await api.get(`/rides/${id}`)
    setRide(response.data)
  }, [id])

  const loadMessages = useCallback(async () => {
    const response = await api.get(`/rides/${id}/messages`)
    setMessages(Array.isArray(response.data) ? response.data : [])
  }, [id])

  useEffect(() => {
    let cancelled = false
    const bootstrap = async () => {
      try {
        setLoading(true)
        setError("")
        await Promise.all([loadRide(), loadMessages()])
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.response?.data?.message || "Impossible de charger la course.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (id) bootstrap()
    return () => {
      cancelled = true
    }
  }, [id, loadRide, loadMessages])

  useEffect(() => {
    const timer = setInterval(() => {
      loadRide()
      loadMessages()
    }, 10000)
    return () => clearInterval(timer)
  }, [loadRide, loadMessages])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    try {
      setSendingMsg(true)
      setError("")
      await api.post(`/rides/${id}/messages`, { content: newMessage.trim() })
      setNewMessage("")
      await loadMessages()
    } catch (sendError) {
      setError(sendError.response?.data?.message || "Impossible d'envoyer le message.")
    } finally {
      setSendingMsg(false)
    }
  }

  const handlePayRide = async () => {
    try {
      setPaying(true)
      setError("")
      setStatusMessage("")
      await api.post(`/payments/ride/${id}/pay`)
      await loadRide()
      setStatusMessage("Paiement validé. La course peut être clôturée.")
    } catch (payError) {
      setError(payError.response?.data?.message || "Paiement impossible pour le moment.")
    } finally {
      setPaying(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
  if (error && !ride) return <div className="min-h-screen p-4 flex items-center justify-center text-red-500">{error}</div>
  if (!ride) return <div className="min-h-screen p-4">Course non trouvee.</div>

  const rideStatusLabel =
    ride.status === "accepted"
      ? "Acceptee"
      : ride.status === "ongoing"
        ? "En cours"
        : ride.status === "completed"
          ? "Terminee"
        : "En attente"

  const ridePaymentStatus = String(ride.paymentStatus || "pending")
  const isClient = String(ride?.userId?._id || ride?.userId || "") === String(user?._id || "")
  const messagingOpen = ["accepted", "ongoing", "completed"].includes(String(ride.status || ""))
  const canPayNow = isClient && ["ongoing", "completed"].includes(String(ride.status || "")) && ridePaymentStatus !== "paid"
  const canRateDriver = isClient && ride.status === "completed" && (ride.driverId || ride.driver?._id)
  const driverId = ride.driver?._id || ride.driverId
  const driverName = ride.driver?.name || "Chauffeur"

  return (
    <div className="min-h-screen bg-[#f7f1e6] pb-24">
      <div className="bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] text-white p-4 rounded-b-[30px] shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-2xl bg-white/20 text-white font-semibold">
            Retour
          </button>
          <h1 className="text-xl font-bold">Details course</h1>
          <div className="w-10"></div>
        </div>
        <h2 className="text-2xl font-bold">{ride.vehicleType || "Course"}</h2>
        <div className="flex gap-3 mt-2 text-sm">
          <span className="bg-white/20 px-3 py-1 rounded-full">{rideStatusLabel}</span>
          <span className="bg-white/20 px-3 py-1 rounded-full">{Number(ride.price || 0).toLocaleString()} FCFA</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {error && <div className="rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}
        {statusMessage && <div className="rounded-2xl bg-[#eefaf2] px-4 py-3 text-sm text-[#178b55]">{statusMessage}</div>}
        <div className="bg-white rounded-[28px] p-5 shadow-lg">
          <h3 className="text-lg font-bold text-[#16324f] mb-3">Trajet</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold text-[#16324f]">Depart</div>
              <div className="text-[#70839a]">{ride.pickup?.address || ride.pickup?.name || "-"}</div>
            </div>
            <div>
              <div className="font-semibold text-[#16324f]">Destination</div>
              <div className="text-[#70839a]">{ride.destination?.address || ride.destination?.name || "-"}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-2xl bg-[#f8fbff] p-3">
                <div className="text-xs uppercase tracking-[0.16em] text-[#5a8fd1]">Distance</div>
                <div className="mt-1 font-semibold text-[#16324f]">{ride.distanceKm ? `${ride.distanceKm} km` : "--"}</div>
              </div>
              <div className="rounded-2xl bg-[#f8fbff] p-3">
                <div className="text-xs uppercase tracking-[0.16em] text-[#5a8fd1]">Duree</div>
                <div className="mt-1 font-semibold text-[#16324f]">{ride.durationMin ? `${ride.durationMin} min` : "--"}</div>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-[#f8fbff] p-3">
              <div className="text-xs uppercase tracking-[0.16em] text-[#5a8fd1]">Paiement</div>
              <div className={`mt-1 font-semibold ${ridePaymentStatus === "paid" ? "text-[#178b55]" : "text-[#c45860]"}`}>
                {ridePaymentStatus === "paid" ? "Réglé" : "En attente"}
              </div>
              <div className="mt-1 text-xs text-[#70839a]">
                Commission app: {Number(ride.appCommissionPercent || 10)}% ({Number(ride.appCommissionAmount || 0).toLocaleString()} FCFA)
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[28px] p-5 shadow-lg">
          <h3 className="text-lg font-bold text-[#16324f] mb-3">Actions</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => navigate(`/ride/${ride._id}/tracking`)}
              className="rounded-2xl bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-4 py-3 text-sm font-bold text-white"
            >
              Ouvrir suivi course
            </button>
            <button
              onClick={() => navigate("/driver")}
              className="rounded-2xl bg-white border border-[#dce7f0] px-4 py-3 text-sm font-bold text-[#1260a1]"
            >
              Retour dashboard chauffeur
            </button>
            {canPayNow && (
              <button
                onClick={handlePayRide}
                disabled={paying}
                className="rounded-2xl bg-[#18c56e] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {paying ? "Paiement..." : "Payer maintenant"}
              </button>
            )}
            {canRateDriver && (
              <button
                onClick={() => setRatingOpen(true)}
                className="rounded-2xl bg-[#fff7eb] px-4 py-3 text-sm font-bold text-[#9a7a24]"
              >
                Donner des étoiles
              </button>
            )}
          </div>
        </div>

        {messagingOpen && (
          <div className="bg-white rounded-[28px] p-5 shadow-lg">
            <h3 className="text-lg font-bold text-[#16324f] mb-3">Chat client/chauffeur</h3>
            <div className="h-56 overflow-y-auto rounded-2xl bg-[#f7f1e6] p-3 space-y-2">
              {messages.length === 0 ? (
                <p className="py-16 text-center text-sm text-[#70839a]">Aucun message pour le moment.</p>
              ) : (
                messages.map((msg) => {
                  const senderId = typeof msg.senderId === "object" ? msg.senderId?._id : msg.senderId
                  const mine = String(senderId || "") === String(user?._id || "")
                  return (
                    <div key={msg._id || `${msg.createdAt}-${senderId}`} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${mine ? "bg-[#1260a1] text-white" : "bg-white text-[#16324f] border border-[#e2eaf2]"}`}>
                        <p>{msg.content}</p>
                        <p className={`mt-1 text-xs ${mine ? "text-white/70" : "text-[#70839a]"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSendMessage()}
                placeholder="Écrire un message..."
                className="flex-1 rounded-2xl border border-[#dce7f0] px-4 py-3 text-sm outline-none focus:border-[#1260a1]"
              />
              <button
                onClick={handleSendMessage}
                disabled={sendingMsg || !newMessage.trim()}
                className="rounded-2xl bg-[#1260a1] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {sendingMsg ? "..." : "Envoyer"}
              </button>
            </div>
          </div>
        )}
      </div>

      <RatingModal
        isOpen={ratingOpen}
        onClose={() => setRatingOpen(false)}
        title="Noter le chauffeur"
        subtitle="Votre note aide les prochains clients."
        type="ride"
        targetName={driverName}
        onSubmit={({ rating, comment }) => ratingAPI.addRideRating(ride._id, driverId, rating, comment, "passenger-to-driver")}
      />
    </div>
  )
}
