import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import MapPicker from "../components/MapPicker"
import SpeechInput from "../components/SpeechInput"
import AppIcon from "../components/AppIcon"
import api from "../api"

const featureCards = [
  {
    key: "rides",
    title: "Rides & Deliveries",
    subtitle: "Courses rapides, livraisons locales et depots urgents.",
    accent: "from-[#165c96] to-[#2e78ba]",
    badge: "Express",
    action: "/ride"
  },
  {
    key: "artisan",
    title: "Trusted Technicians",
    subtitle: "Artisans verifies pour depannage, installation et travaux.",
    accent: "from-[#d7ae49] to-[#f0cf72]",
    badge: "Craft",
    action: "/service"
  },
  {
    key: "food",
    title: "Food & Bakeries",
    subtitle: "Commandes de repas, gateaux et livraisons gourmandes.",
    accent: "from-[#18c56e] to-[#54db98]",
    badge: "Gourmet",
    action: "/service"
  },
  {
    key: "delivery",
    title: "Livreur Express",
    subtitle: "Colis, documents et courses urgentes en ville.",
    accent: "from-[#ef7f87] to-[#f5a16f]",
    badge: "Speed",
    action: "/service"
  },
  {
    key: "automotive", 
    title: "Lavage Automobile",
    subtitle: "Nettoyage voiture, moto et vehicules professionnels.",
    accent: "from-[#1260a1] to-[#4a90e2]",
    badge: "Clean",
    action: "/service"
  },
  {
    key: "maintenance",
    title: "Maintenance & Reparations",
    subtitle: "Reparations electriques, mecaniques et menageres.",
    accent: "from-[#8b5cf6] to-[#a78bfa]",
    badge: "Fix",
    action: "/service"
  },
  {
    key: "rental",
    title: "Location de Vehicules",
    subtitle: "Petit format (motos, scooters) et grand format (SUV, minibus).",
    accent: "from-[#ec4899] to-[#f472b6]",
    badge: "Drive",
    action: "/rental"
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
    iconSymbol: "food",
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
    iconSymbol: "food",
    coords: { lat: 16.042, lng: -16.5065 }
  },
  {
    id: "taxi-yoonbi",
    title: "Course rapide Yoonbi",
    description: "Depart immediat pour vos trajets urbains et depots urgents.",
    type: "mobility",
    category: "rides",
    area: "Centre-ville",
    eta: "7 min",
    isOpen: true,
    price: 2500,
    accent: "bg-[#edf5fb]",
    iconSymbol: "car",
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
    accent: "bg-[#edf5fb]",
    iconSymbol: "electricity",
    coords: { lat: 16.0188, lng: -16.4919 }
  },
  {
    id: "livreur-centre",
    title: "Livreur Flash Yoonbi",
    description: "Livraison de colis, documents et courses urgentes avec prise en charge rapide.",
    type: "service",
    category: "livreur",
    area: "Centre-ville",
    eta: "18 min",
    isOpen: true,
    price: 3000,
    accent: "bg-[#eef4ff]",
    iconSymbol: "delivery",
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
    accent: "bg-[#eef4ff]",
    iconSymbol: "beauty",
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
    iconSymbol: "furniture",
    coords: { lat: 16.0068, lng: -16.5205 }
  },
  {
    id: "lavage-auto-centre",
    title: "Lavage Auto Express",
    description: "Nettoyage exterieur/interieur, lavage moto et vehicules utilitaires.",
    type: "service",
    category: "lavage-automobile",
    area: "Centre-ville",
    eta: "25 min",
    isOpen: true,
    price: 8000,
    accent: "bg-[#e0f2fe]",
    iconSymbol: "van",
    coords: { lat: 16.0244, lng: -16.5015 }
  },
  {
    id: "plomberie-gandon",
    title: "Plomberie Gandon",
    description: "Reparations fuite, installation WC, robinets et depannages urgents.",
    type: "service",
    category: "plomberie",
    area: "Gandon",
    eta: "35 min",
    isOpen: true,
    price: 10000,
    accent: "bg-[#dbeafe]",
    iconSymbol: "tool",
    coords: { lat: 16.018, lng: -16.3728 }
  },
  {
    id: "jardinage-ndioloffene",
    title: "Jardinage Ndioloffene",
    description: "Tonte pelouse, taille haies, nettoyage jardin et petits travaux verts.",
    type: "service",
    category: "jardinage",
    area: "Ndioloffene",
    eta: "50 min",
    isOpen: false,
    price: 12000,
    accent: "bg-[#dcfce7]",
    iconSymbol: "garden",
    coords: { lat: 16.0312, lng: -16.5078 }
  },
  {
    id: "informatique-universite",
    title: "Tech Support Universite",
    description: "Reparation ordinateur, installation logiciels et depannage reseau.",
    type: "service",
    category: "informatique",
    area: "Universite / Sanar",
    eta: "40 min",
    isOpen: true,
    price: 6000,
    accent: "bg-[#f3e8ff]",
    iconSymbol: "info",
    coords: { lat: 16.0567, lng: -16.4568 }
  },
  {
    id: "cours-particuliers",
    title: "Cours Particuliers",
    description: "Soutien scolaire, cours langues et preparation examens.",
    type: "service",
    category: "cours-soutien",
    area: "Centre-ville",
    eta: "60 min",
    isOpen: true,
    price: 15000,
    accent: "bg-[#fef3c7]",
    iconSymbol: "edu",
    coords: { lat: 16.0244, lng: -16.5015 }
  },
  {
    id: "menage-domicile",
    title: "Menage a Domicile",
    description: "Nettoyage maison, bureaux et espaces professionnels.",
    type: "service",
    category: "menage",
    area: "Toute la ville",
    eta: "90 min",
    isOpen: true,
    price: 20000,
    accent: "bg-[#edf5fb]",
    iconSymbol: "cleaning",
    coords: { lat: 16.0244, lng: -16.5015 }
  },
  {
    id: "baby-sitting",
    title: "Baby Sitting & Garde",
    description: "Garde d'enfants, activites educatives et surveillance scolaire.",
    type: "service",
    category: "baby-sitting",
    area: "Centre-ville",
    eta: "120 min",
    isOpen: false,
    price: 25000,
    accent: "bg-[#f7fbff]",
    iconSymbol: "guard",
    coords: { lat: 16.0244, lng: -16.5015 }
  }
]

const serviceFamilies = [
  { key: "mobility", title: "Mobility", subtitle: "Taxi et livraison", color: "bg-[#165c96]", iconSymbol: "car", route: "/ride" },
  { key: "artisan", title: "Artisan Services", subtitle: "Depannage maison", color: "bg-[#d7ae49]", iconSymbol: "service", route: "/service" },
  { key: "food", title: "Restaurants & Cafes", subtitle: "Repas et gateaux", color: "bg-[#18c56e]", iconSymbol: "food", route: "/service" },
  { key: "beauty", title: "Coiffure & Beaute", subtitle: "Salon, maquillage, soins", color: "bg-[#ef7f87]", iconSymbol: "beauty", route: "/service" },
  { key: "delivery", title: "Livreur", subtitle: "Colis et courses urgentes", color: "bg-[#5a86d6]", iconSymbol: "delivery", route: "/service" },
  { key: "automotive", title: "Lavage Auto", subtitle: "Nettoyage vehicules", color: "bg-[#1260a1]", iconSymbol: "car", route: "/service" },
  { key: "maintenance", title: "Maintenance", subtitle: "Reparations diverses", color: "bg-[#8b5cf6]", iconSymbol: "tool", route: "/service" },
  { key: "education", title: "Education", subtitle: "Cours et soutien", color: "bg-[#f59e0b]", iconSymbol: "edu", route: "/service" },
  { key: "domestic", title: "Services Domestiques", subtitle: "Menage et garde", color: "bg-[#ec4899]", iconSymbol: "house", route: "/service" }
]
const quickFilters = ["Ouvert maintenant", "Livraison", "Trajet rapide", "Artisan", "Beaute", "Livreur"]
const formatServiceTitle = (item) => {
  if (!item) return "Service"
  // Cas d'une course (Ride)
  if (item.vehicleType || item.pickup) {
    const dest = item.destination?.name || item.destination?.address
    return dest ? `Course vers ${dest}` : "Course en cours"
  }
  // Cas d'une demande de service (ServiceRequest)
  if (item.title) return item.title
  if (item.category) return `Besoin de ${item.category}`
  if (item.description) return item.description.slice(0, 60)
  // Cas du catalogue de découverte
  return "Service"
}


const defaultClientLocation = { lat: 16.0244, lng: -16.5015, name: "Votre position", address: "Saint-Louis" }
const getSuggestedCategory = (item) => {
  if (!item) return "artisan"
  if (item.type === "restaurant") return "food"
  if (item.category === "livreur") return "delivery"
  if (item.category === "coiffure-beaute") return "beauty"
  return "artisan"
}

const getActiveServiceIcon = (item) => {
  const isRide = Boolean(item.vehicleType)
  if (isRide) return "car"
  if (item.category === "coiffure-beaute") return "beauty"
  if (item.category === "livreur") return "delivery"
  return "tools"
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
        {/* HEADER */}
        <header className="rounded-[36px] border border-[#0b3154] bg-[linear-gradient(180deg,#0d416e_0%,#072a48_100%)] p-5 shadow-[0_24px_60px_rgba(8,35,62,0.30)]">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-white shadow-lg shadow-black/20">
                  <img
                    src="/logo.svg"
                    alt="YOONWI"
                    className="h-10 w-10 rounded-full object-cover"
                    onError={(e) => { e.target.src = '/logo512.png' }}
                  />
                </div>
                <div className="font-['Sora'] text-2xl sm:text-[34px] font-extrabold leading-none text-white whitespace-nowrap">
                  YOONWI
                </div>
              </div>
              <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-[#f3f8fc]">
                <span>PIN</span>
                <span>{clientLocation.address || "Saint-Louis"}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fa3b5]">Bonjour</div>
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
            <div className="w-full">
              <SpeechInput
                placeholder="Rechercher un service..."
                value={query}
                onChange={(text) => setQuery(text)}
                icon=""
                isDark={true}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] bg-white/10 p-3 text-xs text-white backdrop-blur">
              <p className="font-bold">Rapide</p>
              <p className="mt-1">Réservation en 2 clics + géolocalisation automatique.</p>
            </div>
            <div className="rounded-[28px] bg-white/10 p-3 text-xs text-white backdrop-blur">
              <p className="font-bold">Clair</p>
              <p className="mt-1">Tarif transparent, estimation en temps réel.</p>
            </div>
            <div className="rounded-[28px] bg-white/10 p-3 text-xs text-white backdrop-blur">
              <p className="font-bold">Sécurisé</p>
              <p className="mt-1">Paiement multicartes + intégration Wave/OM.</p>
            </div>
            <div className="rounded-[28px] bg-white/10 p-3 text-xs text-white backdrop-blur">
              <p className="font-bold">Local</p>
              <p className="mt-1">Destinations Saint-Louis contenant votre zone.</p>
            </div>
          </div>
        </header>

        {/* CARTE & ITINERAIRE */}
        <section className="ndar-card overflow-hidden rounded-[36px] p-3">
          <div className="mb-3 flex flex-col gap-3 px-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="ndar-chip">A proximite</div>
              <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Carte & itineraire</h2>
              <p className="text-sm text-[#5a8fd1]">Reperez vos besoins autour de vous avec une experience plus premium.</p>
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
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Selection</div>
              <div className="mt-2 text-sm font-bold text-[#16324f]">{selectedDiscovery?.title || "Aucune"}</div>
            </div>
            <div className="ndar-route-badge rounded-[24px] p-4 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Distance</div>
              <div className="mt-2 text-sm font-bold text-[#16324f]">{mapDistanceKm ? `${mapDistanceKm} km` : "--"}</div>
            </div>
            <div className="rounded-[24px] bg-[linear-gradient(180deg,#e7f1f9_0%,#dcebf8_100%)] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Duree</div>
              <div className="mt-2 text-sm font-bold text-[#165c96]">{mapDurationMin ? `${mapDurationMin} min` : selectedDiscovery?.eta || "--"}</div>
            </div>
          </div>
        </section>

        {/* CARROUSEL FEATURE CARDS */}
        <section className="relative overflow-hidden rounded-[36px] p-1">
          <div className={`min-h-[240px] rounded-[32px] bg-gradient-to-br ${featureCards[activeSlide].accent} p-6 text-white shadow-[0_28px_70px_rgba(8,35,62,0.22)] transition-all duration-500`}>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#ffd700]">Modern style, esprit YOONWI</p>
                <h1 className="mt-3 max-w-[220px] font-['Sora'] text-3xl font-extrabold leading-tight">{featureCards[activeSlide].title}</h1>
                <p className="mt-3 max-w-[250px] text-sm text-[#fff7ec]">{featureCards[activeSlide].subtitle}</p>
              </div>
              <div className="flex h-14 w-24 items-center justify-center rounded-2xl border border-white/30 bg-white/20 p-2 text-sm font-bold uppercase tracking-widest text-white shadow-lg">
                {featureCards[activeSlide].badge}
              </div>
            </div>
            <button
              onClick={() => navigate(featureCards[activeSlide].action)}
              className="rounded-2xl bg-white/20 px-4 py-3 text-sm font-semibold backdrop-blur"
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

        {/* FAMILLES DE SERVICES */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredFamilies.map((item) => (
            <button
              key={item.key}
              onClick={() => navigate(item.route, { state: { suggestedCategory: item.key } })}
              className={`flex flex-col items-start gap-2 rounded-[28px] p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${item.color} text-white shadow-[0_12px_30px_rgba(8,35,62,0.18)]`}
            >
              <AppIcon name={item.iconSymbol} className="h-7 w-7 text-white" />
              <div>
                <div className="text-sm font-bold">{item.title}</div>
                <div className="text-xs text-white/80">{item.subtitle}</div>
              </div>
            </button>
          ))}
        </section>

        {/* RESTOS OUVERTS */}
        <section className="ndar-card rounded-[36px] p-4">
          <div className="mb-3 px-1">
            <div className="ndar-chip">Restos ouverts</div>
            <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Restaurants & Cafes</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {openRestaurants.length === 0 ? (
              <p className="px-2 text-sm text-[#5a8fd1]">Aucun restaurant ouvert pour cette recherche.</p>
            ) : (
              openRestaurants.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedDiscoveryId(item.id)
                    navigate("/service", { state: { suggestedCategory: getSuggestedCategory(item), suggestedListing: item } })
                  }}
                  className={`min-w-[200px] flex-shrink-0 rounded-[24px] ${item.accent} p-4 text-left`} >
                 <AppIcon name={item.iconSymbol} className="h-6 w-6 text-[#165c96]" />
                  <div className="mt-2 text-sm font-bold text-[#16324f]">{item.title}</div>
                  <div className="mt-1 text-xs text-[#5a8fd1]">{item.area} · {item.eta}</div>
                  <div className="mt-2 text-xs font-semibold text-[#165c96]">{item.price.toLocaleString()} FCFA</div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* SERVICES DISPONIBLES */}
        <section className="ndar-card rounded-[36px] p-4">
          <div className="mb-3 px-1">
            <div className="ndar-chip">Services disponibles</div>
            <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Artisans & Prestataires</h2>
          </div>
          <div className="space-y-3">
            {availableServices.length === 0 ? (
              <p className="px-2 text-sm text-[#5a8fd1]">Aucun service pour cette recherche.</p>
            ) : (
              availableServices.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedDiscoveryId(item.id)
                    navigate("/service", { state: { suggestedCategory: getSuggestedCategory(item), suggestedListing: item } })
                  }}
                  className={`flex w-full items-center gap-3 rounded-[20px] ${item.accent} p-3 text-left`}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/60">
                    <AppIcon name={item.iconSymbol} className="h-6 w-6 text-[#165c96]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[#16324f]">{formatServiceTitle(item)}</div>
                    <div className="text-xs text-[#5a8fd1]">{item.area} · {item.eta}</div>
                  </div>
                  <div className="text-xs font-semibold text-[#165c96]">{item.price.toLocaleString()} FCFA</div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* RECHERCHE RAPIDE */}
        <section className="ndar-card rounded-[36px] p-4">
          <div className="mb-3 px-1">
            <div className="ndar-chip">Recherche rapide</div>
            <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Suggestions</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setQuery(filter)}
                className="rounded-full border border-[#c8dff0] bg-[#edf5fb] px-4 py-2 text-xs font-semibold text-[#165c96] transition-all hover:bg-[#165c96] hover:text-white"
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        {/* SERVICES ACTIFS */}
        {activeServices.length > 0 && (
          <section className="ndar-card rounded-[36px] p-4">
            <div className="mb-3 px-1">
              <div className="ndar-chip">En cours</div>
              <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Mes services actifs</h2>
            </div>
            <div className="space-y-3">
              {activeServices.map((item) => (
                <button
                  key={item._id}
                  onClick={() => navigate(item.vehicleType ? `/ride/${item._id}` : `/service/${item._id}`)}
                  className="flex w-full items-center gap-3 rounded-[20px] bg-[#edf5fb] p-3 text-left"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#165c96]/10">
                    <AppIcon name={getActiveServiceIcon(item)} className="h-6 w-6 text-[#165c96]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[#16324f]">{formatServiceTitle(item)}</div>
                    <div className="text-xs text-[#5a8fd1]">{item.status || "En cours"}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* SMART ACTIONS */}
        {smartActions.map((action) => (
          <section key={action.id} className="ndar-card rounded-[36px] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-[#16324f]">{action.title}</div>
                <div className="mt-1 text-xs text-[#5a8fd1]">{action.subtitle}</div>
              </div>
              <button
                onClick={() => navigate(action.route, action.state ? { state: action.state } : undefined)}
                className="rounded-full bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white"
              >
                {action.actionLabel}
              </button>
            </div>
          </section>
        ))}

        {/* MESSAGES D'ETAT */}
        {error && (
          <div className="rounded-[24px] bg-[#f7fbff] p-4 text-center text-sm font-semibold text-[#0a3760]">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-[24px] bg-[#edf5fb] p-4 text-center text-sm text-[#5a8fd1]">
            Chargement...
          </div>
        )}

      </div>
    </div>
  )
}
export default Home
