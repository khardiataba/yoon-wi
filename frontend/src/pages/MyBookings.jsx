import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import BottomNav from "../components/BottomNav"

const getRideAddress = (location) => location?.name || location?.address || "Adresse indisponible"
const getStatusMeta = (status) => {
  if (status === "accepted") {
    return { label: "En cours", tone: "bg-[#eefaf2] text-[#178b55]", copy: "Votre demande est prise en charge." }
  }
  if (status === "completed") {
    return { label: "Termine", tone: "bg-[#edf3f8] text-[#1260a1]", copy: "Prestation finalisee avec succes." }
  }
  if (status === "cancelled") {
    return { label: "Annule", tone: "bg-[#fff1f1] text-[#c45860]", copy: "Cette demande a ete annulee." }
  }
  return { label: "En attente", tone: "bg-[#fff8ea] text-[#9a7a24]", copy: "Nous recherchons encore le bon partenaire." }
}

const MyBookings = () => {
  const navigate = useNavigate()
  const [rides, setRides] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [ridesRes, servicesRes] = await Promise.all([api.get("/rides"), api.get("/services")])
        if (!isMounted) return

        setRides(Array.isArray(ridesRes.data) ? ridesRes.data : [])
        setServices(Array.isArray(servicesRes.data) ? servicesRes.data : [])
      } catch (fetchError) {
        if (isMounted) {
          console.error("Erreur de chargement des reservations:", fetchError)
          setError(fetchError.userMessage || "Impossible de recuperer vos reservations.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      isMounted = false
    }
  }, [])

  const items = [
    ...rides.map((ride) => ({
      id: ride._id,
      title: ride.vehicleType || "Ndar Express Ride",
      subtitle: `${getRideAddress(ride.pickup)} → ${getRideAddress(ride.destination)}`,
      status: ride.status || "pending",
      meta: ride.price ? `${ride.price.toLocaleString()} FCFA` : "Tarif sur demande",
      icon: "🚕",
      kind: "ride"
    })),
    ...services.map((service) => ({
      id: service._id,
      title: service.title || `Besoin ${service.category}`,
      subtitle: service.description,
      status: service.status || "pending",
      meta: service.price ? `${service.price.toLocaleString()} FCFA` : service.category,
      icon: service.category === "coiffure-beaute" ? "💇" : service.category === "pâtissier" ? "🥐" : "🧰",
      kind: "service"
    }))
  ]

  const highlightedCount = items.filter((item) => item.status === "accepted" || item.status === "pending").length

  return (
    <div className="min-h-screen px-4 pb-28 pt-5">
      <div className="ndar-shell space-y-4">
        <header className="rounded-[38px] border border-[#0b3154] bg-[linear-gradient(180deg,#0d416e_0%,#072a48_100%)] p-5 shadow-[0_24px_60px_rgba(8,35,62,0.30)]">
          <button onClick={() => navigate(-1)} className="mb-4 text-sm font-semibold text-[#f1c778]">← Retour</button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#f6d59a]">Centre de suivi</div>
              <h1 className="mt-4 font-['Sora'] text-3xl font-extrabold text-white">My bookings</h1>
              <p className="mt-2 text-sm text-[#eaf3fb]">Suivez vos courses et demandes avec une lecture beaucoup plus claire des statuts.</p>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-white/10 px-4 py-4 text-right backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d6e7f5]">Actifs</div>
              <div className="mt-2 font-['Sora'] text-2xl font-bold text-white">{highlightedCount}</div>
            </div>
          </div>
        </header>

        {error && <div className="ndar-card rounded-[28px] bg-[#fff1f1] px-5 py-4 text-sm text-[#a54b55]">{error}</div>}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="ndar-card h-28 animate-pulse rounded-[28px]" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="ndar-card rounded-[30px] p-5">
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-[20px] text-3xl ${item.kind === "ride" ? "bg-[#edf5fb]" : "bg-[#fff4df]"}`}>{item.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="truncate font-['Sora'] text-lg font-bold text-[#16324f]">{item.title}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${getStatusMeta(item.status).tone}`}>
                        {getStatusMeta(item.status).label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#70839a]">{item.subtitle}</p>
                    <div className="mt-3 rounded-[18px] bg-[linear-gradient(180deg,#fffdfa_0%,#f7efe3_100%)] px-4 py-3 text-sm text-[#5f7184]">
                      {getStatusMeta(item.status).copy}
                    </div>
                    <div className="mt-3 text-sm font-semibold text-[#165c96]">{item.meta}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="ndar-card rounded-[30px] p-6 text-center">
            <div className="text-5xl">📭</div>
            <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Aucune reservation pour le moment</h2>
            <p className="mt-2 text-sm text-[#70839a]">Commencez par une course, un service artisan ou un rendez-vous beaute.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button onClick={() => navigate("/ride")} className="rounded-[24px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-3 text-sm font-bold text-white">Reserver une course</button>
              <button onClick={() => navigate("/service")} className="rounded-[24px] bg-[#eadcc4] px-5 py-3 text-sm font-bold text-[#0a3760]">Demander un service</button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default MyBookings
