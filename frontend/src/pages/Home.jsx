import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import BottomNav from "../components/BottomNav"
import MapPicker from "../components/MapPicker"
import api from "../api"

const featureCards = [
  {
    key: "rides",
    title: "Rides & Deliveries",
    subtitle: "Courses rapides, livraisons locales et depots urgents.",
    accent: "from-[#165c96] to-[#2e78ba]",
    emoji: "🚕",
    action: "/ride"
  },
  {
    key: "artisan",
    title: "Trusted Technicians",
    subtitle: "Artisans verifies pour depannage, installation et travaux.",
    accent: "from-[#d7ae49] to-[#f0cf72]",
    emoji: "🧰",
    action: "/service"
  },
  {
    key: "food",
    title: "Food & Bakeries",
    subtitle: "Commandes de repas, gateaux et livraisons gourmandes.",
    accent: "from-[#18c56e] to-[#54db98]",
    emoji: "🥐",
    action: "/service"
  },
  {
    key: "delivery",
    title: "Livreur Express",
    subtitle: "Colis, documents et courses urgentes en ville.",
    accent: "from-[#ef7f87] to-[#f5a16f]",
    emoji: "🛵",
    action: "/service"
  }
]

const discoveryCatalog = [
  {
    id: "resto-saint-louis",
    title: "Le Palmier Grill",
    description: "Poulet braise, chawarma et plats senegalais prets en moins de 20 min.",
    type: "restaurant",
    category: "pâtissier",
    area: "Sud de l'ile",
    eta: "15-20 min",
    isOpen: true,
    price: 5500,
    accent: "bg-[#eefaf2]",
    icon: "🍗",
    coords: { lat: 16.0308, lng: -16.5001 }
  },
  {
    id: "bakery-hydrobase",
    title: "Maison Khadija Bakery",
    description: "Gateaux, viennoiseries et commandes d'anniversaire.",
    type: "restaurant",
    category: "pâtissier",
    area: "Hydrobase",
    eta: "25 min",
    isOpen: true,
    price: 8000,
    accent: "bg-[#fff6e2]",
    icon: "🥐",
    coords: { lat: 16.042, lng: -16.5065 }
  },
  {
    id: "taxi-ndar",
    title: "Course rapide Ndar Express",
    description: "Depart immediat pour vos trajets urbains et depots urgents.",
    type: "mobility",
    category: "rides",
    area: "Centre-ville",
    eta: "7 min",
    isOpen: true,
    price: 2500,
    accent: "bg-[#edf5fb]",
    icon: "🚕",
    coords: { lat: 16.0283, lng: -16.4976 }
  },
  {
    id: "electricien-guet",
    title: "Electricien Express",
    description: "Depannage, prises, luminaires et petites urgences maison.",
    type: "service",
    category: "électricien",
    area: "Guet-Ndar",
    eta: "30 min",
    isOpen: true,
    price: 7000,
    accent: "bg-[#fff1f1]",
    icon: "💡",
    coords: { lat: 16.0188, lng: -16.4919 }
  },
  {
    id: "livreur-centre",
    title: "Livreur Flash Ndar",
    description: "Livraison de colis, documents et courses urgentes avec prise en charge rapide.",
    type: "service",
    category: "livreur",
    area: "Centre-ville",
    eta: "18 min",
    isOpen: true,
    price: 3000,
    accent: "bg-[#eef4ff]",
    icon: "🛵",
    coords: { lat: 16.0262, lng: -16.4992 }
  },
  {
    id: "beaute-balacoss",
    title: "Studio Beaute Balacoss",
    description: "Coiffure, maquillage et mise en beaute a domicile.",
    type: "service",
    category: "coiffure-beaute",
    area: "Balacoss",
    eta: "40 min",
    isOpen: false,
    price: 12000,
    accent: "bg-[#fff2f7]",
    icon: "💇",
    coords: { lat: 16.0149, lng: -16.5072 }
  },
  {
    id: "menuiserie-sor",
    title: "Atelier Sor Menuiserie",
    description: "Reparation, placards, portes et finitions bois.",
    type: "service",
    category: "menuisier",
    area: "Sor",
    eta: "45 min",
    isOpen: true,
    price: 15000,
    accent: "bg-[#f6f0e6]",
    icon: "🪚",
    coords: { lat: 16.0068, lng: -16.5205 }
  }
]

const serviceFamilies = [
  { key: "mobility", title: "Mobility", subtitle: "Taxi et livraison", color: "bg-[#165c96]", icon: "🚘", route: "/ride" },
  { key: "artisan", title: "Artisan Services", subtitle: "Depannage maison", color: "bg-[#d7ae49]", icon: "🧰", route: "/service" },
  { key: "food", title: "Restaurants & Cafes", subtitle: "Repas et gateaux", color: "bg-[#18c56e]", icon: "🍽️", route: "/service" },
  { key: "beauty", title: "Coiffure & Beaute", subtitle: "Salon, maquillage, soins", color: "bg-[#ef7f87]", icon: "💇", route: "/service" },
  { key: "delivery", title: "Livreur", subtitle: "Colis et courses urgentes", color: "bg-[#5a86d6]", icon: "🛵", route: "/service" }
]

const quickFilters = ["Ouvert maintenant", "Livraison", "Trajet rapide", "Artisan", "Beaute", "Livreur"]
const formatServiceTitle = (service) => service.title || `Besoin de ${service.category}`
const defaultClientLocation = { lat: 16.0244, lng: -16.5015, name: "Votre position", address: "Saint-Louis" }
const getSuggestedCategory = (item) => {
  if (!item) return "artisan"
  if (item.type === "restaurant") return "food"
  if (item.category === "livreur") return "delivery"
  if (item.category === "coiffure-beaute") return "beauty"
  return "artisan"
}

const Home = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [query, setQuery] = useState("")
  const [activeSlide, setActiveSlide] = useState(0)
  const [services, setServices] = useState([])
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [clientLocation, setClientLocation] = useState(defaultClientLocation)
  const [selectedDiscoveryId, setSelectedDiscoveryId] = useState(discoveryCatalog[0].id)
  const [mapRoute, setMapRoute] = useState([])
  const [mapDistanceKm, setMapDistanceKm] = useState(null)
  const [mapDurationMin, setMapDurationMin] = useState(null)

  const filteredFamilies = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    if (!lowered) return serviceFamilies

    return serviceFamilies.filter((item) => {
      const target = `${item.title} ${item.subtitle}`.toLowerCase()
      return target.includes(lowered)
    })
  }, [query])

  const filteredDiscovery = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    if (!lowered) return discoveryCatalog

    return discoveryCatalog.filter((item) => {
      const target = `${item.title} ${item.description} ${item.area} ${item.category} ${item.type}`.toLowerCase()
      return target.includes(lowered)
    })
  }, [query])

  const selectedDiscovery =
    filteredDiscovery.find((item) => item.id === selectedDiscoveryId) ||
    discoveryCatalog.find((item) => item.id === selectedDiscoveryId) ||
    filteredDiscovery[0] ||
    discoveryCatalog[0]

  const openRestaurants = filteredDiscovery.filter((item) => item.type === "restaurant" && item.isOpen)
  const availableServices = filteredDiscovery.filter((item) => item.type === "service")
  const suggestedNeeds = filteredDiscovery.slice(0, 5)
  const smartActions = [
    {
      id: "go-home",
      title: "Rentrer a la maison",
      subtitle: "Relancer rapidement une course vers votre point favori.",
      actionLabel: "Commander",
      route: "/ride"
    },
    {
      id: "food-now",
      title: "Commander un repas",
      subtitle: "Voir les restos ouverts et les options les plus rapides.",
      actionLabel: "Explorer",
      route: "/service",
      state: { suggestedCategory: "food" }
    },
    {
      id: "book-service",
      title: "Trouver un artisan",
      subtitle: "Depannage, beaute ou autre besoin du quotidien.",
      actionLabel: "Voir",
      route: "/service"
    },
    {
      id: "delivery-now",
      title: "Trouver un livreur",
      subtitle: "Colis, documents ou achat express a faire livrer rapidement.",
      actionLabel: "Demander",
      route: "/service",
      state: { suggestedCategory: "delivery" }
    }
  ]

  useEffect(() => {
    let isMounted = true

    const fetchDashboard = async () => {
      try {
        setLoading(true)
        setError(null)
        const [ridesRes, servicesRes] = await Promise.allSettled([api.get("/rides"), api.get("/services")])

        if (!isMounted) return

        if (ridesRes.status === "fulfilled") {
          setRides(Array.isArray(ridesRes.value.data) ? ridesRes.value.data : [])
        }

        if (servicesRes.status === "fulfilled") {
          setServices(Array.isArray(servicesRes.value.data) ? servicesRes.value.data : [])
        }

        if (ridesRes.status === "rejected" && servicesRes.status === "rejected") {
          setError(ridesRes.reason?.userMessage || servicesRes.reason?.userMessage || "Impossible de charger le tableau de bord.")
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError.userMessage || "Une erreur est survenue pendant le chargement.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    try {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setClientLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            name: "Votre position",
            address: "Position actuelle"
          })
        },
        () => {
          setClientLocation(defaultClientLocation)
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    } catch (geoError) {
      console.error("Erreur de geolocalisation:", geoError)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((current) => (current + 1) % featureCards.length)
    }, 3500)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let cancelled = false

    const estimateDiscoveryRoute = async () => {
      if (!selectedDiscovery?.coords || !clientLocation?.lat || !clientLocation?.lng) return

      try {
        const response = await api.post("/rides/estimate", {
          pickup: clientLocation,
          destination: {
            lat: selectedDiscovery.coords.lat,
            lng: selectedDiscovery.coords.lng,
            name: selectedDiscovery.title,
            address: selectedDiscovery.area
          }
        })

        if (cancelled) return

        setMapRoute(Array.isArray(response.data.geometry) ? response.data.geometry : [])
        setMapDistanceKm(response.data.distanceKm ?? null)
        setMapDurationMin(response.data.durationMin ?? null)
      } catch (routeError) {
        if (!cancelled) {
          console.error("Erreur de calcul de route:", routeError)
          setMapRoute([
            [clientLocation.lat, clientLocation.lng],
            [selectedDiscovery.coords.lat, selectedDiscovery.coords.lng]
          ])
          setMapDistanceKm(null)
          setMapDurationMin(null)
        }
      }
    }

    estimateDiscoveryRoute()

    return () => {
      cancelled = true
    }
  }, [clientLocation, selectedDiscovery])

  const activeServices = [...rides, ...services].slice(0, 4)

  return (
    <div className="min-h-screen px-4 pb-28 pt-5 lg:px-6">
      <div className="ndar-shell space-y-4">
        <header className="rounded-[36px] border border-[#0b3154] bg-[linear-gradient(180deg,#0d416e_0%,#072a48_100%)] p-5 shadow-[0_24px_60px_rgba(8,35,62,0.30)]">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-['Sora'] text-[34px] font-extrabold leading-none text-white">
                Ndar<span className="text-[#f1c778]">Express</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-[#f3f8fc]">
                <span>📍</span>
                <span>{clientLocation.address || "Saint-Louis"}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6e7f5]">Bonjour</div>
              <div className="mt-1 text-sm font-bold text-white">{user?.name || "Client"}</div>
              <button
                onClick={() => {
                  try {
                    logout()
                    navigate("/login", { replace: true })
                  } catch (logoutError) {
                    console.error("Erreur pendant la deconnexion:", logoutError)
                  }
                }}
                className="mt-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#fff4e4]"
              >
                Deconnexion
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-[#082f50] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <span className="text-[#eef5fb]">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un resto, une course, un artisan, un livreur, une coiffure..."
              className="w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-[#dbe8f3]"
            />
          </div>
        </header>

        <section className="ndar-card overflow-hidden rounded-[36px] p-3">
          <div className="mb-3 flex flex-col gap-3 px-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="ndar-chip">A proximite</div>
              <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Carte & itineraire</h2>
              <p className="text-sm text-[#70839a]">Reperez vos besoins autour de vous avec une experience plus premium.</p>
            </div>
            <button
              onClick={() => navigate(selectedDiscovery?.type === "mobility" ? "/ride" : "/service", {
                state: selectedDiscovery?.type === "mobility"
                  ? undefined
                  : { suggestedCategory: getSuggestedCategory(selectedDiscovery), suggestedListing: selectedDiscovery }
              })}
              className="rounded-full bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white"
            >
              Commander
            </button>
          </div>

          <div className="h-[290px] overflow-hidden rounded-[28px]">
            <MapPicker
              center={clientLocation}
              initialPickup={clientLocation}
              initialDestination={
                selectedDiscovery?.coords
                  ? {
                      lat: selectedDiscovery.coords.lat,
                      lng: selectedDiscovery.coords.lng,
                      name: selectedDiscovery.title,
                      address: selectedDiscovery.area
                    }
                  : null
              }
              routeGeometry={mapRoute}
              readOnly
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 px-1 pb-2 sm:grid-cols-3">
            <div className="ndar-route-badge rounded-[24px] p-4 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Selection</div>
              <div className="mt-2 text-sm font-bold text-[#16324f]">{selectedDiscovery?.title || "Aucune"}</div>
            </div>
            <div className="ndar-route-badge rounded-[24px] p-4 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Distance</div>
              <div className="mt-2 text-sm font-bold text-[#16324f]">{mapDistanceKm ? `${mapDistanceKm} km` : "--"}</div>
            </div>
            <div className="rounded-[24px] bg-[linear-gradient(180deg,#e7f1f9_0%,#dcebf8_100%)] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Duree</div>
              <div className="mt-2 text-sm font-bold text-[#165c96]">{mapDurationMin ? `${mapDurationMin} min` : selectedDiscovery?.eta || "--"}</div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[36px] p-1">
          <div className={`min-h-[240px] rounded-[32px] bg-gradient-to-br ${featureCards[activeSlide].accent} p-6 text-white shadow-[0_28px_70px_rgba(8,35,62,0.22)] transition-all duration-500`}>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">Yango style, Ndar spirit</p>
                <h1 className="mt-3 max-w-[220px] font-['Sora'] text-3xl font-extrabold leading-tight">{featureCards[activeSlide].title}</h1>
                <p className="mt-3 max-w-[250px] text-sm text-white/85">{featureCards[activeSlide].subtitle}</p>
              </div>
              <div className="text-6xl drop-shadow-lg">{featureCards[activeSlide].emoji}</div>
            </div>
            <button
              onClick={() => navigate(featureCards[activeSlide].action)}
              className="rounded-2xl bg-white/18 px-4 py-3 text-sm font-semibold backdrop-blur"
            >
              Ouvrir ce service
            </button>
          </div>
          <div className="mt-4 flex justify-center gap-2">
            {featureCards.map((card, index) => (
              <button
                key={card.key}
                onClick={() => setActiveSlide(index)}
                className={`h-2.5 rounded-full transition-all ${index === activeSlide ? "w-6 bg-[#165c96]" : "w-2.5 bg-white/70"}`}
                aria-label={`Afficher ${card.title}`}
              />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredFamilies.map((item) => (
            <button
              key={item.key}
              onClick={() => navigate(item.route, { state: { suggestedCategory: item.key } })}
              className={`ndar-lift ${item.color} min-h-[138px] rounded-[28px] p-4 text-left text-white shadow-[0_22px_45px_rgba(8,35,62,0.16)]`}
            >
              <div className="text-3xl">{item.icon}</div>
              <h2 className="mt-5 font-['Sora'] text-lg font-bold leading-tight">{item.title}</h2>
              <p className="mt-2 text-xs text-white/85">{item.subtitle}</p>
            </button>
          ))}
        </section>

        <section className="ndar-panel-beige rounded-[32px] p-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {quickFilters.map((filter) => (
              <span key={filter} className="whitespace-nowrap rounded-full bg-white/70 px-3 py-2 text-xs font-semibold text-[#0a3760] shadow-[0_8px_20px_rgba(112,79,34,0.08)]">
                {filter}
              </span>
            ))}
          </div>
        </section>

        <section className="ndar-card rounded-[32px] p-5">
          <div className="mb-4">
            <div className="ndar-chip">Pour vous</div>
            <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Actions intelligentes</h2>
            <p className="text-sm text-[#70839a]">Des raccourcis pensés pour aller plus vite selon vos usages les plus probables.</p>
          </div>
          <div className="space-y-3">
            {smartActions.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.route, item.state ? { state: item.state } : undefined)}
                className="ndar-lift flex w-full flex-col gap-3 rounded-[26px] border border-[#e6dccf] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-4 text-left sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-semibold text-[#16324f]">{item.title}</div>
                  <div className="mt-1 text-sm text-[#70839a]">{item.subtitle}</div>
                </div>
                <div className="rounded-full bg-[#edf3f8] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1260a1]">
                  {item.actionLabel}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="ndar-card rounded-[30px] p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Restos ouverts</h2>
              <p className="text-sm text-[#70839a]">Les options disponibles maintenant autour de vous.</p>
            </div>
            <button onClick={() => navigate("/service", { state: { suggestedCategory: "food" } })} className="text-sm font-semibold text-[#165c96]">
              Voir plus
            </button>
          </div>

          <div className="space-y-3">
            {openRestaurants.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedDiscoveryId(item.id)
                  navigate("/service", { state: { suggestedCategory: "food", suggestedListing: item } })
                }}
                className="flex w-full items-center gap-4 rounded-[24px] border border-[#e5edf4] bg-white px-4 py-4 text-left shadow-sm"
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${item.accent}`}>{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold text-[#16324f]">{item.title}</div>
                  <div className="mt-1 truncate text-sm text-[#70839a]">{item.description}</div>
                  <div className="mt-2 text-xs font-semibold text-[#18c56e]">Ouvert • {item.area} • {item.eta}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#165c96]">{item.price.toLocaleString()} F</div>
                  <div className="text-xs text-[#70839a]">Commander</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="ndar-card rounded-[30px] p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Services disponibles</h2>
              <p className="text-sm text-[#70839a]">Artisans et prestations que vous pouvez demander tout de suite.</p>
            </div>
            <button onClick={() => navigate("/service")} className="text-sm font-semibold text-[#165c96]">
              Explorer
            </button>
          </div>

          <div className="space-y-3">
            {availableServices.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedDiscoveryId(item.id)
                  navigate("/service", { state: { suggestedCategory: getSuggestedCategory(item), suggestedListing: item } })
                }}
                className="flex w-full items-center gap-4 rounded-[24px] border border-[#e5edf4] bg-white px-4 py-4 text-left shadow-sm"
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${item.accent}`}>{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold text-[#16324f]">{item.title}</div>
                  <div className="mt-1 truncate text-sm text-[#70839a]">{item.description}</div>
                  <div className={`mt-2 text-xs font-semibold ${item.isOpen ? "text-[#18c56e]" : "text-[#d7ae49]"}`}>
                    {item.isOpen ? "Disponible" : "Sur reservation"} • {item.area} • {item.eta}
                  </div>
                </div>
                <span className="text-xl text-[#9eb1c6]">›</span>
              </button>
            ))}
          </div>
        </section>

        <section className="ndar-card rounded-[30px] p-5">
          <div className="mb-4">
            <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Recherche rapide</h2>
            <p className="text-sm text-[#70839a]">Tout ce que la cliente peut rechercher dans l’app, au meme endroit.</p>
          </div>

          <div className="grid gap-3">
            {suggestedNeeds.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedDiscoveryId(item.id)}
                className="flex items-center justify-between rounded-[24px] bg-[#f8fbff] px-4 py-4 text-left transition hover:bg-[#edf5fb]"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{item.icon}</div>
                  <div>
                    <div className="font-semibold text-[#16324f]">{item.title}</div>
                    <div className="text-sm text-[#70839a]">{item.type === "restaurant" ? "Restauration" : item.type === "mobility" ? "Mobilite" : item.category === "livreur" ? "Livraison" : "Service"} • {item.area}</div>
                  </div>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#165c96]">Voir</div>
              </button>
            ))}
          </div>
        </section>

        <section className="ndar-card rounded-[30px] p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">My Active Services</h2>
              <p className="text-sm text-[#70839a]">Suivez vos courses et demandes en cours.</p>
            </div>
            <button onClick={() => navigate("/mybookings")} className="text-sm font-semibold text-[#165c96]">
              Voir tout
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-[#ef7f87]/40 bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-[22px] bg-[#edf5fb]" />
              ))}
            </div>
          ) : activeServices.length > 0 ? (
            <div className="space-y-3">
              {activeServices.map((item) => {
                const isRide = Boolean(item.vehicleType)
                const title = isRide ? item.vehicleType : formatServiceTitle(item)
                const subtitle = isRide
                  ? `${item.pickup?.name || item.pickup?.address || "Depart"} → ${item.destination?.name || item.destination?.address || "Arrivee"}`
                  : item.description

                return (
                  <div key={item._id} className="flex items-center gap-4 rounded-[24px] border border-[#e5edf4] bg-white px-4 py-4 shadow-sm">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${isRide ? "bg-[#edf5fb]" : "bg-[#eefaf2]"}`}>
                      {isRide ? "🚕" : item.category === "coiffure-beaute" ? "💇" : item.category === "livreur" ? "🛵" : "🧰"}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate text-base font-bold text-[#16324f]">{title}</div>
                      <div className="mt-1 truncate text-sm text-[#70839a]">{subtitle}</div>
                      <div className="mt-2 text-sm font-semibold text-[#18c56e]">Status: {item.status || "pending"}</div>
                    </div>
                    <span className="text-xl text-[#9eb1c6]">›</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-[24px] bg-[#f7fbff] px-5 py-6 text-sm text-[#70839a]">
              Aucun service actif pour le moment. Lancez une course ou une demande artisanale.
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  )
}

export default Home
