import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import AppIcon from "../components/AppIcon"
import { resolveMediaUrl } from "../utils/mediaUrl"

const getRideAddress = (location) => location?.name || location?.address || "Adresse indisponible"

const formatDate = (value) => {
  if (!value) return "--/--/----"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--/--/----"
  return date.toLocaleDateString("fr-FR")
}

const getStatusMeta = (status) => {
  if (status === "accepted") return { label: "Acceptée", tone: "text-[#073f78]", iconBg: "bg-[#e8f2fb]" }
  if (status === "ongoing" || status === "in_progress") return { label: "En cours", tone: "text-[#0b6b3a]", iconBg: "bg-[#e7f8ee]" }
  if (status === "completed") return { label: "Terminée", tone: "text-[#17324a]", iconBg: "bg-[#eef4fb]" }
  if (status === "cancelled") return { label: "Annulée", tone: "text-[#244761]", iconBg: "bg-[#eef4fb]" }
  if (status === "quoted") return { label: "Devis", tone: "text-[#795600]", iconBg: "bg-[#fff7db]" }
  return { label: "En attente", tone: "text-[#8a5200]", iconBg: "bg-[#fff2d6]" }
}

const getInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "ND"

const MyBookings = () => {
  const navigate = useNavigate()
  const [rides, setRides] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("rides")

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [ridesRes, servicesRes] = await Promise.all([api.get("/rides"), api.get("/services")])
        if (!mounted) return
        setRides(Array.isArray(ridesRes.data) ? ridesRes.data : [])
        setServices(Array.isArray(servicesRes.data) ? servicesRes.data : [])
      } catch (fetchError) {
        if (mounted) {
          console.error("Erreur de chargement des reservations:", fetchError)
          setError(fetchError.userMessage || "Impossible de recuperer vos reservations.")
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchData()
    return () => {
      mounted = false
    }
  }, [])

  const items = useMemo(
    () => ({
      rides: rides.map((ride) => ({
        id: ride._id,
        kind: "ride",
        title: ride.vehicleType || "Course",
        subtitle: `${getRideAddress(ride.pickup)} → ${getRideAddress(ride.destination)}`,
        status: ride.status || "pending",
        meta: ride.price ? `${Number(ride.price).toLocaleString()} FCFA` : "Tarif sur demande",
        date: formatDate(ride.createdAt),
        person: ride.driver || null,
        personLabel: ride.driver?.name || "",
        safetyCode: ride.safetyCode || null
      })),
      services: services.map((service) => ({
        id: service._id,
        kind: "service",
        title: service.title || `Besoin ${service.category || "service"}`,
        subtitle: service.description || "Demande de service",
        status: service.status || "pending",
        meta: service.quotedPrice
          ? `${Number(service.quotedPrice).toLocaleString()} FCFA`
          : service.clientBudget
            ? `${Number(service.clientBudget).toLocaleString()} FCFA`
            : "Tarif sur demande",
        date: formatDate(service.createdAt),
        person: service.assignedProvider || service.technician || service.preferredProvider || null,
        personLabel:
          service.assignedProvider?.name ||
          service.technician?.name ||
          service.preferredProvider?.name ||
          service.preferredProviderName ||
          "",
        safetyCode: service.safetyCode || null
      }))
    }),
    [rides, services]
  )

  const currentItems = items[activeTab]
  const rideCount = items.rides.length
  const serviceCount = items.services.length

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden px-4 pb-36 pt-5 sm:pb-40 lg:px-6">
      <div className="ndar-shell min-w-0 space-y-4">
        <header className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#06345f_0%,#061b31_100%)] p-5 text-white shadow-[0_28px_80px_rgba(6,27,49,0.28)]">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition-colors hover:bg-white/15"
            aria-label="Retour"
          >
            <AppIcon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="ndar-chip ndar-hero-chip">Historique</div>
          <h1 className="mt-3 font-['Sora'] text-2xl font-extrabold leading-tight sm:text-3xl">Mes réservations</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-[#d5e3f0] sm:text-[15px]">
            Retrouvez ici vos courses et vos services avec un suivi plus clair.
          </p>
        </header>

        <main className="min-w-0 flex-1 space-y-4">
          {error && (
            <div className="rounded-[24px] bg-[#f7fbff] px-4 py-3 text-sm font-bold text-[#0a3760] shadow-[0_18px_45px_rgba(8,35,62,0.08)]">
              {error}
            </div>
          )}

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("rides")}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-[22px] px-3 py-3 text-sm font-black transition-colors sm:px-4 sm:py-3.5 ${
                activeTab === "rides"
                  ? "premium-action"
                  : "bg-white text-[#07335a] shadow-[0_18px_45px_rgba(6,27,49,0.08)]"
              }`}
            >
              <AppIcon name="car" className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">Courses ({rideCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("services")}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-[22px] px-3 py-3 text-sm font-black transition-colors sm:px-4 sm:py-3.5 ${
                activeTab === "services"
                  ? "premium-action"
                  : "bg-white text-[#07335a] shadow-[0_18px_45px_rgba(6,27,49,0.08)]"
              }`}
            >
              <AppIcon name="tools" className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">Services ({serviceCount})</span>
            </button>
          </div>

          <section className="min-w-0">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((index) => (
                  <div key={index} className="h-28 animate-pulse rounded-[28px] bg-white shadow-[0_18px_45px_rgba(6,27,49,0.08)]" />
                ))}
              </div>
            ) : currentItems.length > 0 ? (
              <div className="min-w-0 space-y-3">
                {currentItems.map((item) => {
                  const statusMeta = getStatusMeta(item.status)
                  const avatar = item.person?.profilePhotoUrl
                    ? resolveMediaUrl(item.person.profilePhotoUrl)
                    : null

                  return (
                    <article key={item.id} className="min-w-0 rounded-[28px] bg-white px-4 py-4 shadow-[0_22px_65px_rgba(6,27,49,0.1)]">
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${statusMeta.iconBg}`}>
                            {avatar ? (
                              <img src={avatar} alt={item.personLabel || item.title} className="h-full w-full rounded-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-[#165c96]">{getInitials(item.personLabel || item.title)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black ${statusMeta.tone}`}>{statusMeta.label}</span>
                            </div>
                            <h2 className="mt-1 break-words text-[15px] font-black text-[#061b31]">{item.title}</h2>
                            <p className="mt-1 break-words text-sm font-semibold text-[#244761]">{item.subtitle}</p>
                            <div className="mt-2 text-[13px] font-black text-[#073f78]">{item.meta}</div>
                          </div>
                        </div>
                        <div className="shrink-0 text-left text-xs font-black text-[#244761] sm:text-right">{item.date}</div>
                      </div>

                      {item.personLabel && (
                        <div className="mt-3 rounded-[22px] bg-[#f3f8ff] px-3 py-2 text-sm text-[#061b31]">
                          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#244761]">
                            {item.kind === "ride" ? "Chauffeur" : "Prestataire"}
                          </span>
                          <div className="mt-1 break-words font-black">{item.personLabel}</div>
                        </div>
                      )}

                      {item.safetyCode && (
                        <div className="mt-3 rounded-[22px] bg-[#eaf4ff] px-3 py-2 text-sm font-bold text-[#073f78]">
                          Code de sécurité: <span className="font-bold tracking-[0.2em]">{item.safetyCode}</span>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-[28px] bg-white px-5 py-12 text-center text-[#244761] shadow-[0_22px_65px_rgba(6,27,49,0.1)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf4ff] text-[#073f78]">
                  <AppIcon name="list" className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-black text-[#061b31]">Aucune réservation pour le moment</h2>
                <p className="mt-2 text-sm font-semibold">Commencez par une course ou un service pour voir vos réservations ici.</p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    onClick={() => navigate("/ride")}
                    className="premium-action rounded-[22px] px-5 py-3 text-sm font-black"
                  >
                    Réserver une course
                  </button>
                  <button
                    onClick={() => navigate("/service")}
                    className="rounded-[22px] bg-[#eaf4ff] px-5 py-3 text-sm font-black text-[#073f78]"
                  >
                    Demander un service
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

export default MyBookings
