import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import AppIcon from "../components/AppIcon"
import MapPicker from "../components/MapPicker"

const searchPlaces = async (query) => {
  try {
    const mapsRes = await api.get("/maps/places/autocomplete", {
      params: {
        input: query,
        lat: 16.0244,
        lng: -16.5015,
        radius: 12000
      }
    })
    const places = Array.isArray(mapsRes.data?.places) ? mapsRes.data.places : []
    return places
      .slice(0, 6)
      .map((place) => ({
        name: place.name || "Lieu",
        address: place.address || place.name || "Adresse indisponible",
        lat: Number(place.location?.lat),
        lng: Number(place.location?.lng)
      }))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
  } catch (error) {
    try {
      const fallbackRes = await api.get("/maps/places", {
        params: {
          query,
          lat: 16.0244,
          lng: -16.5015,
          radius: 12000
        }
      })
      const places = Array.isArray(fallbackRes.data?.places) ? fallbackRes.data.places : []
      return places
        .slice(0, 6)
        .map((place) => ({
          name: place.name || "Lieu",
          address: place.address || place.name || "Adresse indisponible",
          lat: Number(place.location?.lat),
          lng: Number(place.location?.lng)
        }))
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
    } catch (fallbackError) {
      console.error("Erreur de recherche d'adresse:", fallbackError)
      return []
    }
  }
}

const reverseGeocode = async ({ lat, lng }) => {
  try {
    const response = await api.get("/maps/reverse-geocode", { params: { lat, lng } })
    const address = response.data?.address
    const displayAddress =
      typeof address === "string" && address.trim().length > 0 ? address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    return {
      lat,
      lng,
      name: displayAddress.split(",")[0] || "Point sélectionné",
      address: displayAddress
    }
  } catch (error) {
    console.error("Erreur de reverse geocoding:", error)
    return {
      lat,
      lng,
      name: "Point sélectionné",
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    }
  }
}

const vehicleOptions = [
  { value: "Moto", label: "Moto", icon: "moto", rate: 500, multiplier: 0.72, minPrice: 1200 },
  { value: "Voiture", label: "Voiture", icon: "car", rate: 800, multiplier: 1, minPrice: 1800 },
  { value: "Utilitaire", label: "Utilitaire", icon: "van", rate: 1200, multiplier: 1.35, minPrice: 2800 }
]

const busOptions = [
  { value: "marche", label: "Jusqu'au marché", icon: "edu", fare: 150 },
  { value: "ville", label: "Ville", icon: "car", fare: 200 }
]

const getVehicleOption = (vehicleType) => vehicleOptions.find((option) => option.value === vehicleType) || vehicleOptions[1]

const computeCommissionPreview = (grossAmount) => {
  const safeGross = Math.max(0, Number(grossAmount) || 0)
  const appCommissionAmount = Math.max(0, Math.round((safeGross * 10) / 100))
  return {
    appCommissionPercent: 10,
    appCommissionAmount,
    providerNetAmount: Math.max(0, safeGross - appCommissionAmount)
  }
}

const formatAddress = (place) => place?.address || place?.name || "Adresse indisponible"

const Ride = () => {
  const navigate = useNavigate()
  const defaultPickup = useMemo(() => ({ lat: 16.0244, lng: -16.5015, name: "Ma position", address: "Saint-Louis" }), [])
  const defaultDestination = useMemo(() => ({ lat: 16.035, lng: -16.495, name: "Place Faidherbe", address: "Saint-Louis" }), [])

  const [pickup, setPickup] = useState(defaultPickup)
  const [destination, setDestination] = useState(defaultDestination)
  const [pickupQuery, setPickupQuery] = useState(defaultPickup.address)
  const [destinationQuery, setDestinationQuery] = useState(defaultDestination.address)
  const [pickupResults, setPickupResults] = useState([])
  const [destinationResults, setDestinationResults] = useState([])
  const [pickupSearched, setPickupSearched] = useState(false)
  const [destinationSearched, setDestinationSearched] = useState(false)
  const [mapSelectionMode, setMapSelectionMode] = useState("pickup")
  const [distanceKm, setDistanceKm] = useState(null)
  const [durationMin, setDurationMin] = useState(null)
  const [routeGeometry, setRouteGeometry] = useState([])
  const [basePrice, setBasePrice] = useState(2500)
  const [price, setPrice] = useState(2500)
  const [vehicleType, setVehicleType] = useState("Voiture")
  const [rideMode, setRideMode] = useState("standard")
  const [busZone, setBusZone] = useState("marche")
  const [busTravelDate, setBusTravelDate] = useState("")
  const [appCommissionPercent, setAppCommissionPercent] = useState(10)
  const [appCommissionAmount, setAppCommissionAmount] = useState(250)
  const [driverNetAmount, setDriverNetAmount] = useState(2250)
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [submitting, setSubmitting] = useState(false)
  const [loadingEstimate, setLoadingEstimate] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [error, setError] = useState(null)

  const selectedVehicle = rideMode === "bus_student"
    ? busOptions.find((option) => option.value === busZone) || busOptions[0]
    : getVehicleOption(vehicleType)

  const updatePriceForVehicle = (nextBasePrice, nextVehicleType, nextRideMode = rideMode, nextBusZone = busZone) => {
    const busOption = busOptions.find((option) => option.value === nextBusZone) || busOptions[0]
    const vehicleOption = getVehicleOption(nextVehicleType)
    const calculatedPrice =
      nextRideMode === "bus_student"
        ? busOption.fare
        : Math.max(vehicleOption.minPrice, Math.round((Number(nextBasePrice) || 0) * vehicleOption.multiplier))
    const commission = computeCommissionPreview(calculatedPrice)
    setPrice(calculatedPrice)
    setAppCommissionPercent(commission.appCommissionPercent)
    setAppCommissionAmount(commission.appCommissionAmount)
    setDriverNetAmount(commission.providerNetAmount)
  }

  const refreshEstimate = async () => {
    if (!pickup || !destination) return

    try {
      setLoadingEstimate(true)
      setError(null)
      const response = await api.post("/rides/estimate", {
        pickup,
        destination,
        rideMode: rideMode === "bus_student" ? "bus_student" : "standard",
        busZone: rideMode === "bus_student" ? busZone : ""
      })

      const nextDistance = response.data.distanceKm ?? null
      const nextDuration = response.data.durationMin ?? null
      const nextGeometry = Array.isArray(response.data.geometry) ? response.data.geometry : []
      const nextBasePrice = Number(response.data.suggestedPrice ?? 1200)

      setDistanceKm(nextDistance)
      setDurationMin(nextDuration)
      setRouteGeometry(nextGeometry)
      setBasePrice(nextBasePrice)
      if (rideMode === "bus_student") {
        setVehicleType(busOptions.find((option) => option.value === busZone)?.label || "Bus")
      }
      updatePriceForVehicle(nextBasePrice, vehicleType, rideMode, busZone)
    } catch (estimateError) {
      console.error("Erreur d'estimation:", estimateError)
      setDistanceKm(null)
      setDurationMin(null)
      setRouteGeometry([])
      setBasePrice(2500)
      updatePriceForVehicle(2500, vehicleType, rideMode, busZone)
    } finally {
      setLoadingEstimate(false)
    }
  }

  const useCurrentPickup = () => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas disponible sur cet appareil.")
      return
    }

    setLocationLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const currentPickup = await reverseGeocode({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setPickup(currentPickup)
        setPickupQuery(currentPickup.address)
        setLocationLoading(false)
      },
      () => {
        setError("Activez la localisation pour utiliser votre position actuelle.")
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (pickupQuery.trim().length < 3 || pickupQuery === pickup.address) {
        setPickupResults([])
        setPickupSearched(false)
        return
      }
      const results = await searchPlaces(pickupQuery)
      setPickupResults(results)
      setPickupSearched(true)
    }, 350)

    return () => clearTimeout(timer)
  }, [pickup, pickupQuery])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (destinationQuery.trim().length < 3 || destinationQuery === destination.address) {
        setDestinationResults([])
        setDestinationSearched(false)
        return
      }
      const results = await searchPlaces(destinationQuery)
      setDestinationResults(results)
      setDestinationSearched(true)
    }, 350)

    return () => clearTimeout(timer)
  }, [destination, destinationQuery])

  useEffect(() => {
    refreshEstimate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, destination, rideMode, busZone])

  useEffect(() => {
    updatePriceForVehicle(basePrice, vehicleType, rideMode, busZone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePrice, vehicleType, rideMode, busZone])

  const selectPickup = (location) => {
    setPickup(location)
    setPickupQuery(location.address)
    setPickupResults([])
    setPickupSearched(false)
  }

  const selectDestination = (location) => {
    setDestination(location)
    setDestinationQuery(location.address)
    setDestinationResults([])
    setDestinationSearched(false)
  }

  const handleSubmit = async () => {
    if (!pickup || !destination) {
      setError("Veuillez choisir un départ et une destination.")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const rideData = {
        pickup,
        destination,
        price,
        appCommissionPercent,
        appCommissionAmount,
        providerNetAmount: driverNetAmount,
        vehicleType: rideMode === "bus_student" ? `Bus - ${busZone}` : vehicleType,
        rideMode: rideMode === "bus_student" ? "bus_student" : "standard",
        busZone: rideMode === "bus_student" ? busZone : "",
        busOptions:
          rideMode === "bus_student"
            ? {
                zone: busZone,
                travelDate: busTravelDate || null
              }
            : undefined,
        paymentMethod,
        distanceKm,
        durationMin,
        routeGeometry
      }

      const createdRide = await api.post("/rides", rideData)
      const storedRide = {
        ...rideData,
        ...createdRide.data,
        rideId: createdRide.data?._id || createdRide.data?.id || null
      }
      localStorage.setItem("currentRide", JSON.stringify(storedRide))
      navigate("/tracking")
    } catch (submitError) {
      console.error("Erreur pendant la reservation:", submitError)
      setError(submitError.userMessage || "La réservation a échoué. Réessayez dans un instant.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden px-4 pb-36 pt-5 sm:pb-40 lg:px-6">
      <div className="ndar-shell min-w-0 space-y-4">
        <header className="relative overflow-hidden rounded-[36px] border border-[#0b3154] bg-[linear-gradient(180deg,#0d416e_0%,#072a48_100%)] p-5 text-white shadow-[0_24px_60px_rgba(8,35,62,0.30)]">
          <div className="pointer-events-none absolute inset-0 ndar-hero-grid opacity-70" />
          <div className="relative flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/15"
                aria-label="Retour"
              >
                <AppIcon name="arrow-left" className="h-5 w-5" />
              </button>
              <div className="ndar-chip ndar-hero-chip">Mobilite</div>
              <h1 className="mt-3 font-['Sora'] text-2xl font-extrabold leading-tight text-white sm:text-3xl">Réserver une course</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#d5e3f0] sm:text-[15px]">
                Choisissez votre départ, votre arrivée et un véhicule adapté à votre trajet.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:w-[280px]">
              <div className="rounded-[22px] border border-white/10 bg-white/10 px-3 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f2c981]">Tarif</div>
                <div className="mt-1 font-['Sora'] text-lg font-extrabold">{price.toLocaleString()} F</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/10 px-3 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f2c981]">Vehicule</div>
                <div className="mt-1 truncate text-sm font-bold">{selectedVehicle.label}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 space-y-4">
            {error && (
              <div className="rounded-[24px] border border-[#cfe3f5] bg-[#f7fbff] px-4 py-3 text-sm font-semibold text-[#0a3760]">
                {error}
              </div>
            )}

            <section className="ndar-card relative z-0 isolate rounded-[36px] p-4 sm:p-5">
              <div className="space-y-4">
                <div className="flex min-w-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRideMode("standard")
                      setVehicleType("Voiture")
                    }}
                    className={`min-w-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                      rideMode === "standard" ? "bg-[#165c96] text-white shadow-[0_12px_24px_rgba(22,92,150,0.18)]" : "bg-[#edf5fb] text-[#5a8fd1]"
                    }`}
                  >
                    Course standard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRideMode("bus_student")
                      const nextBusLabel = busOptions.find((option) => option.value === busZone)?.label || "Voyage groupé"
                      setVehicleType(nextBusLabel)
                    }}
                    className={`min-w-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                      rideMode === "bus_student" ? "bg-[#165c96] text-white shadow-[0_12px_24px_rgba(22,92,150,0.18)]" : "bg-[#edf5fb] text-[#5a8fd1]"
                    }`}
                  >
                    Voyage groupé
                  </button>
                </div>

                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e0f4eb] text-[#2eaf72] shadow-[0_8px_18px_rgba(46,175,114,0.16)]">
                    <AppIcon name="pin" className="h-4 w-4" />
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <input
                      value={pickupQuery}
                      onChange={(event) => setPickupQuery(event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-[#dbe5ef] bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#6d85a0] focus:border-[#165c96] focus:bg-[#f8fbff]"
                      placeholder="Adresse de départ"
                    />
                    {pickupResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-[16px] border border-[#dbe5ef] bg-white p-2 shadow-[0_18px_40px_rgba(8,35,62,0.12)]">
                        {pickupResults.map((result) => (
                          <button
                            key={`${result.lat}-${result.lng}`}
                            onClick={() => selectPickup(result)}
                            className="block w-full rounded-[12px] px-3 py-3 text-left text-sm text-[#16324f] transition-colors hover:bg-[#f6f9fd]"
                          >
                            <div className="truncate font-semibold">{result.name}</div>
                            <div className="mt-1 break-words text-xs text-[#5f7b94]">{result.address}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {pickupSearched && pickupQuery.trim().length >= 3 && pickupResults.length === 0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-[16px] border border-[#dbe5ef] bg-white px-4 py-3 text-sm font-semibold text-[#7a5a12] shadow-[0_18px_40px_rgba(8,35,62,0.12)]">
                        Aucun lieu trouvé. Essayez un quartier, une rue ou touchez la carte.
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={useCurrentPickup}
                  disabled={locationLoading}
                  className="w-full rounded-[18px] border border-[#dbe5ef] bg-[#edf5fb] px-4 py-3 text-left text-sm font-bold text-[#165c96] transition-all hover:border-[#165c96] hover:bg-[#e7f1f9] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {locationLoading ? "Localisation en cours..." : "Utiliser ma position actuelle"}
                </button>
                <p className="text-xs text-[#5f7b94]">
                  Active la géolocalisation pour remplir automatiquement le départ avec ta position actuelle.
                </p>

                <div className="ml-[19px] h-4 border-l-2 border-dashed border-[#dbe5ef]" />

                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff7eb] text-[#d7ae49] shadow-[0_8px_18px_rgba(112,79,34,0.12)]">
                    <AppIcon name="external" className="h-4 w-4 rotate-[-45deg]" />
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <input
                      value={destinationQuery}
                      onChange={(event) => setDestinationQuery(event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-[#dbe5ef] bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#6d85a0] focus:border-[#165c96] focus:bg-[#f8fbff]"
                      placeholder="Adresse d'arrivée"
                    />
                    {destinationResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-[16px] border border-[#dbe5ef] bg-white p-2 shadow-[0_18px_40px_rgba(8,35,62,0.12)]">
                        {destinationResults.map((result) => (
                          <button
                            key={`${result.lat}-${result.lng}`}
                            onClick={() => selectDestination(result)}
                            className="block w-full rounded-[12px] px-3 py-3 text-left text-sm text-[#16324f] transition-colors hover:bg-[#f6f9fd]"
                          >
                            <div className="truncate font-semibold">{result.name}</div>
                            <div className="mt-1 break-words text-xs text-[#5f7b94]">{result.address}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {destinationSearched && destinationQuery.trim().length >= 3 && destinationResults.length === 0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-[16px] border border-[#dbe5ef] bg-white px-4 py-3 text-sm font-semibold text-[#7a5a12] shadow-[0_18px_40px_rgba(8,35,62,0.12)]">
                        Aucun lieu trouvé. Essayez un quartier, une rue ou touchez la carte.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="ndar-card rounded-[36px] p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="ndar-chip">Carte</div>
                  <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Choisir sur la carte</h2>
                </div>
                <div className="flex rounded-full bg-[#edf5fb] p-1 text-xs font-bold text-[#165c96]">
                  <button
                    type="button"
                    onClick={() => setMapSelectionMode("pickup")}
                    className={`rounded-full px-4 py-2 ${mapSelectionMode === "pickup" ? "bg-white shadow-sm" : ""}`}
                  >
                    Départ
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapSelectionMode("destination")}
                    className={`rounded-full px-4 py-2 ${mapSelectionMode === "destination" ? "bg-white shadow-sm" : ""}`}
                  >
                    Arrivée
                  </button>
                </div>
              </div>
              <div className="relative z-0 h-[260px] overflow-hidden rounded-[28px] border border-[#dbe5ef] sm:h-[340px]">
                <MapPicker
                  center={mapSelectionMode === "pickup" ? pickup : destination}
                  initialPickup={pickup}
                  initialDestination={destination}
                  routeGeometry={routeGeometry}
                  selectionMode={mapSelectionMode}
                  onSelectPickup={(location) => {
                    selectPickup(location)
                    setMapSelectionMode("destination")
                  }}
                  onSelectDestination={selectDestination}
                />
              </div>
            </section>

            <section className="ndar-card relative z-[1] rounded-[36px] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="ndar-chip">Choix</div>
                  <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Type de véhicule</h2>
                </div>
              </div>
              {rideMode === "standard" ? (
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                  {vehicleOptions.map((option) => {
                    const active = vehicleType === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setVehicleType(option.value)}
                        className={`min-w-0 rounded-[28px] border px-4 py-4 text-center transition-all ${
                          active
                            ? "border-[#165c96] bg-[linear-gradient(180deg,#e9f3fb_0%,#dcebf7_100%)] shadow-[0_18px_36px_rgba(18,96,161,0.12)]"
                            : "border-[#e6dccf] bg-white"
                        }`}
                      >
                        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-[20px] ${active ? "bg-white text-[#165c96]" : "bg-[#fff7eb] text-[#165c96]"}`}>
                          <AppIcon name={option.icon} className="h-5 w-5" />
                        </div>
                        <div className="mt-3 text-[15px] font-semibold text-[#16324f]">{option.label}</div>
                        <div className="mt-1 text-xs text-[#5f7b94]">{option.rate.toLocaleString()} FCFA/km</div>
                          </button>
                      )
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    {busOptions.map((option) => {
                      const active = busZone === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setBusZone(option.value)
                            setVehicleType(option.label)
                          }}
                          className={`min-w-0 rounded-[28px] border px-4 py-4 text-center transition-all ${
                            active
                              ? "border-[#165c96] bg-[linear-gradient(180deg,#e9f3fb_0%,#dcebf7_100%)] shadow-[0_18px_36px_rgba(18,96,161,0.12)]"
                              : "border-[#e6dccf] bg-white"
                          }`}
                        >
                          <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full ${active ? "bg-white text-[#165c96]" : "bg-[#f4f7fb] text-[#6f7f92]"}`}>
                            <AppIcon name={option.icon} className="h-5 w-5" />
                          </div>
                          <div className="mt-3 text-[15px] font-semibold text-[#16324f]">{option.label}</div>
                          <div className="mt-1 text-xs text-[#5f7b94]">{option.fare.toLocaleString()} FCFA / place</div>
                        </button>
                      )
                    })}
                  </div>
                  <div className="grid min-w-0 gap-3 rounded-[22px] border border-[#d9e3ef] bg-[#f8fbff] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="min-w-0">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#62809a]">Date de voyage</label>
                      <input
                        type="date"
                        value={busTravelDate}
                        onChange={(event) => setBusTravelDate(event.target.value)}
                        className="h-12 w-full rounded-[14px] border border-[#dbe5ef] bg-white px-3 text-sm outline-none focus:border-[#165c96]"
                      />
                    </div>
                    <div className="flex min-w-0 items-end">
                      <div className="min-w-0 rounded-[14px] bg-white px-4 py-3 text-sm text-[#5f7b94] shadow-[0_8px_20px_rgba(8,35,62,0.04)]">
                        Voyage groupé activé. Tu peux garder ce trajet pour une date précise.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="ndar-card rounded-[36px] p-4 sm:p-5">
              <button
                type="button"
                onClick={refreshEstimate}
                disabled={submitting || loadingEstimate}
                className="w-full rounded-[22px] border border-[#d9e3ef] bg-[#f8fbff] px-4 py-4 text-[15px] font-bold text-[#16324f] transition-all hover:border-[#165c96] hover:bg-[#edf5fb] hover:text-[#165c96] disabled:opacity-60"
              >
                {loadingEstimate ? "Estimation en cours..." : "Estimer le prix"}
              </button>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-[16px] bg-[#f8fbff] px-3 py-3 text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62809a]">Distance</div>
                  <div className="mt-2 text-sm font-bold text-[#16324f]">{distanceKm ? `${distanceKm} km` : "--"}</div>
                </div>
                <div className="rounded-[16px] bg-[#f8fbff] px-3 py-3 text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62809a]">Durée</div>
                  <div className="mt-2 text-sm font-bold text-[#16324f]">{durationMin ? `${durationMin} min` : "--"}</div>
                </div>
                <div className="rounded-[16px] bg-[#eaf3fb] px-3 py-3 text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62809a]">Prix</div>
                  <div className="mt-2 text-sm font-bold text-[#165c96]">{price.toLocaleString()} FCFA</div>
                </div>
              </div>
              {rideMode === "bus_student" && (
                <p className="mt-3 text-xs text-[#5f7b94]">
                  Voyage groupé activé. Le tarif reste fixe par zone, comme l'ancien mode bus.
                </p>
              )}
            </section>

            <section className="ndar-card rounded-[36px] p-4 sm:p-5">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-[#16324f]">Réserver ce trajet</div>
                  <div className="mt-1 break-words text-sm text-[#5f7b94]">
                    {formatAddress(pickup)} → {formatAddress(destination)}
                  </div>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#62809a]">Votre choix</div>
                  <div className="mt-1 text-sm font-bold text-[#165c96]">{selectedVehicle.label}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="min-w-0 break-words rounded-full bg-[#f2f6fb] px-3 py-2 text-[#165c96]">
                  Part appli: {appCommissionPercent}% ({appCommissionAmount.toLocaleString()} F)
                </span>
                <span className="min-w-0 break-words rounded-full bg-[#edf9f1] px-3 py-2 text-[#178b55]">
                  Net chauffeur: {driverNetAmount.toLocaleString()} F
                </span>
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold text-[#16324f]">Mode de paiement</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    { value: "Cash", label: "Espèce" },
                    { value: "Wave", label: "Wave Money" },
                    { value: "OM", label: "Orange Money" },
                    { value: "Card", label: "Carte bancaire" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPaymentMethod(option.value)}
                      className={`rounded-[14px] border px-4 py-3 text-left text-sm font-medium transition-colors ${
                        paymentMethod === option.value
                          ? "border-[#165c96] bg-[#ecf4fb] text-[#165c96]"
                          : "border-[#d9e3ef] bg-white text-[#42566b]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || loadingEstimate || locationLoading}
                className="mt-5 w-full rounded-[24px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_24px_44px_rgba(8,35,62,0.24)] transition hover:brightness-105 disabled:opacity-60"
              >
                {submitting ? "Réservation en cours..." : "Confirmer la réservation"}
              </button>
            </section>
        </main>
      </div>
    </div>
  )
}

export default Ride
