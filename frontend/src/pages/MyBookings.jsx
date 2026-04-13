import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import BottomNav from "../components/BottomNav"

const getRideAddress = (location) => location?.name || location?.address || "Adresse indisponible"

const getAssetUrl = (path) => {
  if (!path) return ""
  const base = String(api.defaults.baseURL || "").replace(/\/api\/?$/, "")
  return `${base}${path}`
}

const getInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "ND"

const getStatusMeta = (status) => {
  if (status === "accepted") {
    return { label: "En cours", tone: "bg-[#eefaf2] text-[#178b55]", copy: "Votre demande est prise en charge." }
  }
  if (status === "quoted") {
    return { label: "Devis", tone: "bg-[#fff7eb] text-[#9a7a24]", copy: "Le prestataire a propose son prix." }
  }
  if (status === "in_progress") {
    return { label: "Verifie", tone: "bg-[#edf5fb] text-[#1260a1]", copy: "Le code de securite a ete confirme." }
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
  const [approvingQuoteId, setApprovingQuoteId] = useState(null)

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

  const refreshBookings = async () => {
    const [ridesRes, servicesRes] = await Promise.all([api.get("/rides"), api.get("/services")])
    setRides(Array.isArray(ridesRes.data) ? ridesRes.data : [])
    setServices(Array.isArray(servicesRes.data) ? servicesRes.data : [])
  }

  const approveQuote = async (serviceId) => {
    try {
      setApprovingQuoteId(serviceId)
      await api.patch(`/services/${serviceId}/approve-quote`)
      await refreshBookings()
    } catch (approvalError) {
      console.error("Impossible de valider le devis:", approvalError)
      setError(approvalError.userMessage || "Impossible de valider le devis pour le moment.")
    } finally {
      setApprovingQuoteId(null)
    }
  }

  const items = [
    ...rides.map((ride) => ({
      id: ride._id,
      title: ride.vehicleType || "Yoonbi Ride",
      subtitle: `${getRideAddress(ride.pickup)} → ${getRideAddress(ride.destination)}`,
      status: ride.status || "pending",
      meta: ride.price ? `${ride.price.toLocaleString()} FCFA • ${ride.paymentMethod || "Cash"}` : "Tarif sur demande",
      iconSymbol: "🚗",
      kind: "ride",
      person: ride.driver || null,
      personLabel: ride.driver?.name || "",
      safetyCode: ride.safetyCode || null
    })),
    ...services.map((service) => ({
      id: service._id,
      title: service.title || `Besoin ${service.category}`,
      subtitle: service.description,
      status: service.status || "pending",
      meta: [
        service.quotedPrice ? `Prix proposé: ${service.quotedPrice.toLocaleString()} FCFA` : service.clientBudget ? `Budget indicatif: ${service.clientBudget.toLocaleString()} FCFA` : service.category,
        service.preferredProviderName ? `Cible: ${service.preferredProviderName}` : null,
        service.preferredDistanceKm != null ? `${Number(service.preferredDistanceKm).toFixed(1)} km` : null,
        service.platformContributionStatus ? `Contribution: ${service.platformContributionStatus}` : null,
        service.platformContributionAmountPaid ? `Paye: ${Number(service.platformContributionAmountPaid).toLocaleString()} FCFA` : null
      ]
        .filter(Boolean)
        .join(" • "),
      iconSymbol:
        service.category === "coiffure-beaute" ? "💇" :
        service.category === "pâtissier" ? "🥐" :
        service.category === "livreur" ? "🛵" :
        service.category === "électricien" ? "💡" :
        service.category === "maçon" ? "🧱" :
        service.category === "peintre" ? "🎨" :
        service.category === "menuisier" ? "🪚" :
        service.category === "autres" ? "🧩" :
        "🔧",
      kind: "service",
      person: service.assignedProvider || service.technician || service.preferredProvider || null,
      personLabel:
        service.assignedProvider?.name ||
        service.technician?.name ||
        service.preferredProvider?.name ||
        service.preferredProviderName ||
        "",
      safetyCode: service.safetyCode || null,
      quotedPrice: service.quotedPrice || 0,
      quoteNote: service.quoteNote || "",
      pricingStatus: service.status || "pending"
    }))
  ]

  const highlightedCount = items.filter((item) => item.status === "accepted" || item.status === "pending" || item.status === "in_progress").length

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
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] ${item.kind === "ride" ? "bg-[#edf5fb]" : "bg-[#fff4df]"}`}>
                    {item.person?.profilePhotoUrl ? (
                      <img src={getAssetUrl(item.person.profilePhotoUrl)} alt={item.personLabel || item.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-['Sora'] text-sm font-bold text-[#1260a1]">{getInitials(item.personLabel || item.title)}</span>
                    )}
                  </div>
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
                    {item.personLabel && (
                      <div className="mt-3 rounded-[18px] bg-[#f7fbff] px-4 py-3 text-sm text-[#16324f]">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">
                          {item.kind === "ride" ? "Chauffeur affecte" : "Prestataire affecte"}
                        </div>
                        <div className="mt-1 font-semibold">{item.personLabel}</div>
                      </div>
                    )}
                    {item.kind === "service" && item.safetyCode && (
                      <div className="mt-3 rounded-[18px] border border-[#cfe3f5] bg-[#f7fbff] px-4 py-3 text-sm text-[#1260a1]">
                        Code de securite: <span className="font-bold tracking-[0.2em]">{item.safetyCode}</span>
                      </div>
                    )}
                    {item.kind === "service" && item.pricingStatus === "quoted" && item.quotedPrice > 0 && (
                      <div className="mt-3 rounded-[18px] border border-[#d8caa7] bg-[#fff7eb] px-4 py-3 text-sm text-[#8b6d2f]">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7a24]">Devis du prestataire</div>
                        <div className="mt-1 font-semibold">{item.quotedPrice.toLocaleString()} FCFA</div>
                        {item.quoteNote && <div className="mt-1 text-xs text-[#6f5a28]">{item.quoteNote}</div>}
                        <button
                          type="button"
                          onClick={() => approveQuote(item.id)}
                          disabled={approvingQuoteId === item.id}
                          className="mt-3 rounded-2xl bg-[linear-gradient(135deg,#a97a18_0%,#8b6d2f_100%)] px-4 py-2 text-xs font-bold text-white"
                        >
                          {approvingQuoteId === item.id ? "Validation..." : "Accepter le devis"}
                        </button>
                      </div>
                    )}
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
