import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import BottomNav from "../components/BottomNav"
import MapPicker from "../components/MapPicker"

const SAINT_LOUIS_VIEWBOX = "-16.5600,16.0900,-16.4200,15.9300"

const normalizePlace = (result) => ({
  name: result.display_name.split(",")[0] || result.display_name,
  address: result.display_name,
  lat: Number.parseFloat(result.lat),
  lng: Number.parseFloat(result.lon)
})

const searchPlaces = async (query) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=sn&viewbox=${SAINT_LOUIS_VIEWBOX}&bounded=1&q=${encodeURIComponent(query)}`
    const response = await fetch(url, { headers: { "User-Agent": "ndar-express" } })
    if (!response.ok) throw new Error("Recherche indisponible")
    const results = await response.json()
    return results.map(normalizePlace)
  } catch (error) {
    console.error("Erreur de recherche d'adresse:", error)
    return []
  }
}

const reverseGeocode = async ({ lat, lng }) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const response = await fetch(url, { headers: { "User-Agent": "ndar-express" } })
    if (!response.ok) throw new Error("Adresse indisponible")
    const result = await response.json()
    return {
      lat,
      lng,
      name: result.name || result.address?.road || result.display_name.split(",")[0] || "Point selectionne",
      address: result.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    }
  } catch (error) {
    console.error("Erreur de reverse geocoding:", error)
    return {
      lat,
      lng,
      name: "Point selectionne",
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    }
  }
}

const formatCompactAddress = (place) => place?.address || place?.name || "Adresse indisponible"

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
  const [selectionMode, setSelectionMode] = useState("destination")
  const [distanceKm, setDistanceKm] = useState(null)
  const [durationMin, setDurationMin] = useState(null)
  const [routeGeometry, setRouteGeometry] = useState([])
  const [price, setPrice] = useState(2500)
  const [appCommissionPercent, setAppCommissionPercent] = useState(12)
  const [appCommissionAmount, setAppCommissionAmount] = useState(0)
  const [driverNetAmount, setDriverNetAmount] = useState(0)
  const [vehicleType, setVehicleType] = useState("Ndar Express Classic")
  const [submitting, setSubmitting] = useState(false)
  const [loadingEstimate, setLoadingEstimate] = useState(false)
  const [resolvingClick, setResolvingClick] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const currentPickup = await reverseGeocode({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
            setPickup(currentPickup)
            setPickupQuery(currentPickup.address)
          },
          () => {
            setPickup(defaultPickup)
            setPickupQuery(defaultPickup.address)
          },
          { enableHighAccuracy: true, timeout: 8000 }
        )
      }
    } catch (geoError) {
      console.error("Erreur de geolocalisation:", geoError)
    }
  }, [defaultPickup])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (pickupQuery.trim().length < 3 || pickupQuery === pickup.address) {
        setPickupResults([])
        return
      }
      const results = await searchPlaces(pickupQuery)
      setPickupResults(results)
    }, 350)

    return () => clearTimeout(timer)
  }, [pickup, pickupQuery])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (destinationQuery.trim().length < 3 || destinationQuery === destination.address) {
        setDestinationResults([])
        return
      }
      const results = await searchPlaces(destinationQuery)
      setDestinationResults(results)
    }, 350)

    return () => clearTimeout(timer)
  }, [destination, destinationQuery])

  useEffect(() => {
    let cancelled = false

    const estimateRide = async () => {
      if (!pickup || !destination) return

      try {
        setLoadingEstimate(true)
        setError(null)
        const response = await api.post("/rides/estimate", { pickup, destination })
        if (cancelled) return

        const nextDistance = response.data.distanceKm ?? null
        const nextDuration = response.data.durationMin ?? null
        const nextGeometry = Array.isArray(response.data.geometry) ? response.data.geometry : []

        setDistanceKm(nextDistance)
        setDurationMin(nextDuration)
        setRouteGeometry(nextGeometry)
        setPrice(response.data.suggestedPrice ?? 1200)
        setAppCommissionPercent(response.data.appCommissionPercent ?? 12)
        setAppCommissionAmount(response.data.appCommissionAmount ?? 0)
        setDriverNetAmount(response.data.providerNetAmount ?? 0)
      } catch (estimateError) {
        if (!cancelled) {
          console.error("Erreur d'estimation:", estimateError)
          setDistanceKm(null)
          setDurationMin(null)
          setRouteGeometry([])
          setPrice(1200)
          setAppCommissionPercent(12)
          setAppCommissionAmount(100)
          setDriverNetAmount(1100)
        }
      } finally {
        if (!cancelled) {
          setLoadingEstimate(false)
        }
      }
    }

    estimateRide()

    return () => {
      cancelled = true
    }
  }, [pickup, destination])

  const selectPickup = (location) => {
    setPickup(location)
    setPickupQuery(location.address)
    setPickupResults([])
    setSelectionMode("destination")
  }

  const selectDestination = (location) => {
    setDestination(location)
    setDestinationQuery(location.address)
    setDestinationResults([])
  }

  const handleMapPickup = async (location) => {
    setResolvingClick(true)
    const resolved = await reverseGeocode(location)
    selectPickup(resolved)
    setResolvingClick(false)
  }

  const handleMapDestination = async (location) => {
    setResolvingClick(true)
    const resolved = await reverseGeocode(location)
    selectDestination(resolved)
    setResolvingClick(false)
  }

  const handleSubmit = async () => {
    if (!pickup || !destination) {
      setError("Veuillez choisir un depart et une destination.")
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
        vehicleType,
        distanceKm,
        durationMin,
        routeGeometry
      }

      try {
        localStorage.setItem("currentRide", JSON.stringify(rideData))
      } catch (storageError) {
        console.error("Impossible de sauvegarder la course localement:", storageError)
      }

      await api.post("/rides", rideData)
      navigate("/tracking")
    } catch (submitError) {
      console.error("Erreur pendant la reservation:", submitError)
      setError(submitError.userMessage || "La reservation a echoue. Reessayez dans un instant.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f1e6_0%,#eadbc4_100%)] pb-24">
      <div className="mx-auto flex min-h-screen max-w-[520px] flex-col">
        <div className="relative h-[58vh] min-h-[430px] overflow-hidden rounded-b-[38px] bg-[linear-gradient(180deg,#0c4675_0%,#0a3357_100%)] shadow-[0_28px_80px_rgba(8,35,62,0.24)]">
          <MapPicker
            center={pickup}
            initialPickup={pickup}
            initialDestination={destination}
            routeGeometry={routeGeometry}
            onSelectPickup={handleMapPickup}
            onSelectDestination={handleMapDestination}
            selectionMode={selectionMode}
          />

          <div className="absolute inset-x-4 top-4 z-[1002] space-y-3">
            <div className="ndar-hero-glass rounded-[30px] px-4 py-4 shadow-[0_20px_40px_rgba(8,35,62,0.18)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-['Sora'] text-2xl font-extrabold text-white">Ndar Express</div>
                  <div className="ndar-hero-soft text-xs font-semibold uppercase tracking-[0.18em]">Trajet premium en temps reel</div>
                </div>
                <button onClick={() => navigate("/mybookings")} className="ndar-hero-button rounded-full px-3 py-2 text-xs font-bold">Mes courses</button>
              </div>
            </div>
          </div>
        </div>

        <div className="-mt-10 flex-1 rounded-t-[38px] bg-[linear-gradient(180deg,#fffaf4_0%,#fff5e9_100%)] px-4 pb-8 pt-5 shadow-[0_-20px_60px_rgba(8,35,62,0.14)]">
          <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-[#d5c2a1]" />

          <div className="space-y-4">
            <div className="rounded-[30px] border border-[#eadfce] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] p-4 shadow-[0_16px_34px_rgba(112,79,34,0.08)]">
              <div className="mb-3 flex items-center justify-between">
                <h1 className="font-['Sora'] text-2xl font-extrabold text-[#16324f]">Ou allez-vous ?</h1>
                {(loadingEstimate || resolvingClick) && <span className="rounded-full bg-[#eef2f6] px-3 py-2 text-xs font-semibold text-[#70839a]">Calcul en cours...</span>}
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#70839a]">Depart</label>
                  <input
                    value={pickupQuery}
                    onFocus={() => setSelectionMode("pickup")}
                    onChange={(event) => setPickupQuery(event.target.value)}
                    className="w-full rounded-2xl border border-[#ded8cb] bg-white px-4 py-3 text-sm outline-none focus:border-[#1260a1]"
                  />
                  {pickupResults.length > 0 && (
                    <div className="absolute z-10 mt-2 w-full rounded-2xl border border-[#e2eaf2] bg-white p-2 shadow-lg">
                      {pickupResults.map((result) => (
                        <button key={`${result.lat}-${result.lng}`} onClick={() => selectPickup(result)} className="block w-full rounded-xl px-3 py-3 text-left text-sm text-[#16324f] hover:bg-[#f7f0e4]">
                          <div className="font-semibold">{result.name}</div>
                          <div className="mt-1 text-xs text-[#70839a]">{result.address}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#70839a]">Destination</label>
                  <input
                    value={destinationQuery}
                    onFocus={() => setSelectionMode("destination")}
                    onChange={(event) => setDestinationQuery(event.target.value)}
                    className="w-full rounded-2xl border border-[#ded8cb] bg-white px-4 py-3 text-sm outline-none focus:border-[#1260a1]"
                  />
                  {destinationResults.length > 0 && (
                    <div className="absolute z-10 mt-2 w-full rounded-2xl border border-[#e2eaf2] bg-white p-2 shadow-lg">
                      {destinationResults.map((result) => (
                        <button key={`${result.lat}-${result.lng}`} onClick={() => selectDestination(result)} className="block w-full rounded-xl px-3 py-3 text-left text-sm text-[#16324f] hover:bg-[#f7f0e4]">
                          <div className="font-semibold">{result.name}</div>
                          <div className="mt-1 text-xs text-[#70839a]">{result.address}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[24px] bg-white p-4 text-center shadow-[0_12px_28px_rgba(8,35,62,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Distance</div>
                <div className="mt-2 font-['Sora'] text-xl font-bold text-[#16324f]">{distanceKm ? `${distanceKm} km` : "--"}</div>
              </div>
              <div className="rounded-[24px] bg-white p-4 text-center shadow-[0_12px_28px_rgba(8,35,62,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Duree</div>
                <div className="mt-2 font-['Sora'] text-xl font-bold text-[#16324f]">{durationMin ? `${durationMin} min` : "--"}</div>
              </div>
              <div className="rounded-[24px] bg-[linear-gradient(180deg,#e8f2fa_0%,#dceaf8_100%)] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Prix</div>
                <div className="mt-2 font-['Sora'] text-xl font-bold text-[#165c96]">{price.toLocaleString()} F</div>
              </div>
            </div>

            <div className="rounded-[24px] bg-[linear-gradient(180deg,#edf5fb_0%,#e4eef7_100%)] px-4 py-4 text-sm text-[#16324f]">
              <div className="font-semibold text-[#1260a1]">Tarif ajuste pour rester plus doux</div>
              <div className="mt-2 text-[#5f7894]">
                L'estimation suit surtout la distance et reste volontairement plus basse que l'ancienne formule, avec un repere inspire des applis de transport economiques.
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                <span className="rounded-full bg-white px-3 py-2 text-[#1260a1]">Part appli: {appCommissionPercent}% ({appCommissionAmount.toLocaleString()} F)</span>
                <span className="rounded-full bg-white px-3 py-2 text-[#178b55]">Net chauffeur: {driverNetAmount.toLocaleString()} F</span>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Ndar Express Go", subtitle: "Trajet standard, prix malin", emoji: "🚕", priceValue: price },
                { label: "Ndar Express Confort", subtitle: "Plus d'espace et plus de confort", emoji: "🚘", priceValue: price + 2000 }
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={() => setVehicleType(option.label)}
                  className={`flex w-full items-center justify-between rounded-[28px] border px-4 py-4 text-left transition-all ${
                    vehicleType === option.label ? "border-[#1260a1] bg-[linear-gradient(180deg,#e9f3fb_0%,#dcebf7_100%)] shadow-[0_18px_36px_rgba(18,96,161,0.12)]" : "border-[#e6dccf] bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#fff7eb] text-3xl shadow-sm">{option.emoji}</div>
                    <div>
                      <div className="font-semibold text-[#16324f]">{option.label}</div>
                      <div className="text-sm text-[#70839a]">{option.subtitle}</div>
                      <div className="mt-1 text-xs text-[#70839a]">{formatCompactAddress(pickup)} → {formatCompactAddress(destination)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-['Sora'] text-xl font-bold text-[#165c96]">{option.priceValue.toLocaleString()} F</div>
                    <div className="text-xs text-[#70839a]">{durationMin ? `${durationMin} min` : "Estimation"}</div>
                  </div>
                </button>
              ))}
            </div>

            {error && <div className="rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}

            <button
              onClick={handleSubmit}
              disabled={submitting || loadingEstimate || resolvingClick}
              className="w-full rounded-[28px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_24px_44px_rgba(8,35,62,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Reservation en cours..." : `Commander ${vehicleType}`}
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default Ride
