import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import VehicleCard from "../components/VehicleCard"
import Toast from "../components/Toast"
import AppIcon from "../components/AppIcon"

const defaultClientLocation = {
  lat: 16.0244,
  lng: -16.5015,
  name: "Votre position",
  address: "Saint-Louis"
}

const Rental = () => {
  const navigate = useNavigate()
  const [vehicleType, setVehicleType] = useState("all")
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [clientLocation, setClientLocation] = useState(defaultClientLocation)
  const [toastMessage, setToastMessage] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Get user location on mount
  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setClientLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: "Votre position",
          address: "Position détectée"
        })
      },
      () => {
        setClientLocation(defaultClientLocation)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  // Fetch rentals
  useEffect(() => {
    const fetchRentals = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = {
          lat: clientLocation.lat,
          lng: clientLocation.lng
        }

        if (vehicleType !== "all") {
          params.vehicleType = vehicleType
        }

        const response = await api.get("/rentals", { params })

        setRentals(response.data.rentals || [])
      } catch (err) {
        console.error("Error fetching rentals:", err)
        setError("Erreur lors du chargement des locations")
      } finally {
        setLoading(false)
      }
    }

    fetchRentals()
  }, [vehicleType, clientLocation])

  // Filter rentals by search query
  const filteredRentals = rentals.filter(
    (rental) =>
      rental.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rental.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rental.provider?.name && rental.provider.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleVehicleSelect = (vehicle) => {
    navigate(`/rental/${vehicle._id}`, { state: { rental: vehicle } })
  }

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[radial-gradient(circle_at_top,#edf5fb_0%,#f4f8fc_42%,#eef4fa_100%)] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[linear-gradient(180deg,#165c96_0%,#0f4f86_100%)] text-white shadow-[0_20px_45px_rgba(8,35,62,0.18)]">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:py-6">
          <h1 className="mb-3 flex min-w-0 items-center gap-3 font-['Sora'] text-2xl font-extrabold sm:text-3xl">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-[#ffe0ab]">
              <AppIcon name="car" className="h-6 w-6" />
            </span>
            <span className="min-w-0 break-words">Locations de véhicules</span>
          </h1>
          <p className="max-w-2xl text-sm text-[#dcecf8] sm:text-[15px]">Trouvez un véhicule adapté à votre déplacement, proche de votre position.</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
        {/* Filters */}
        <div className="mb-6 min-w-0 rounded-[24px] border border-[#d9e3ef] bg-white/96 p-4 shadow-[0_16px_34px_rgba(8,35,62,0.06)] backdrop-blur">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5f7b94]">
                <AppIcon name="search" className="h-5 w-5" />
              </span>
              <input
                type="text"
                placeholder="Rechercher un véhicule, une marque..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 w-full rounded-[16px] border border-[#dbe5ef] bg-[#f8fbff] p-3 pl-11 text-sm outline-none transition-colors placeholder:text-[#6d85a0] focus:border-[#165c96] focus:bg-white"
              />
            </div>
          </div>

          {/* Vehicle Type Filter */}
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
            {[
              { value: "all", label: "Tous les véhicules", icon: "car" },
              { value: "small", label: "Petits véhicules", icon: "moto" },
              { value: "large", label: "Grands véhicules", icon: "van" }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setVehicleType(type.value)
                  setSearchQuery("")
                }}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  vehicleType === type.value
                    ? "bg-[#165c96] text-white shadow-[0_12px_24px_rgba(22,92,150,0.18)]"
                    : "bg-[#edf3f8] text-[#5f7b94] hover:bg-[#e4eef7]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <AppIcon name={type.icon} className="h-4 w-4" />
                  <span>{type.label}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Location Info */}
          <div className="mt-4 rounded-[16px] bg-[#eaf3fb] p-3 text-sm text-[#5f7b94]">
            <span className="flex min-w-0 items-center gap-2">
              <AppIcon name="pin" className="h-4 w-4 shrink-0 text-[#165c96]" />
              <span className="min-w-0 break-words">{clientLocation.address}</span>
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-[18px] border border-[#f1c7c9] bg-[#fff5f6] p-4 text-sm text-[#b85a65]">{error}</div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="h-80 animate-pulse rounded-[22px] bg-[#dfeaf4]" />
            ))}
          </div>
        ) : filteredRentals.length === 0 ? (
          <div className="rounded-[24px] border border-[#d9e3ef] bg-white py-12 px-4 text-center shadow-[0_16px_34px_rgba(8,35,62,0.06)]">
            <p className="mb-2 flex min-w-0 items-center justify-center gap-2 text-xl font-bold text-[#16324f] sm:text-2xl">
              <AppIcon name="info" className="h-6 w-6 shrink-0 text-[#165c96]" />
              <span>Aucun véhicule disponible</span>
            </p>
            <p className="text-sm text-[#5f7b94]">
              {searchQuery ? "Essayez une autre recherche" : "Revenir plus tard pour les nouvelles locations"}
            </p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-4 text-sm text-[#5f7b94]">
              <strong>{filteredRentals.length}</strong> véhicule(s) trouvé(s)
            </div>

            {/* Vehicles Grid */}
            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRentals.map((rental) => (
                <VehicleCard
                  key={rental._id}
                  vehicle={rental}
                  onSelect={() => handleVehicleSelect(rental)}
                  showProviderInfo={true}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

    </div>
  )
}

export default Rental

