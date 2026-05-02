import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
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
    const mapsRes = await api.get("/maps/places", {
      params: {
        query,
        lat: 16.0244,
        lng: -16.5015,
        radius: 12000
      }
    })
    const places = Array.isArray(mapsRes.data?.places) ? mapsRes.data.places : []
    return places.slice(0, 6).map((place) => ({
      name: place.name || "Lieu",
      address: place.address || place.name || "Adresse indisponible",
      lat: Number(place.location?.lat),
      lng: Number(place.location?.lng)
    })).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
  } catch (error) {
    console.error("Erreur de recherche d'adresse:", error)
    return []
  }
}

const reverseGeocode = async ({ lat, lng }) => {
  try {
    const response = await api.get("/maps/reverse-geocode", { params: { lat, lng } })
    const address = response.data?.address
    const displayAddress = typeof address === "string" && address.trim().length > 0
      ? address
      : `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    return {
      lat,
      lng,
      name: displayAddress.split(",")[0] || "Point selectionne",
      address: displayAddress
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

const BUS_ZONE_OPTIONS = [
  { value: "marche", label: "Jusqu'au marche", fare: 150, note: "Trajet court" },
  { value: "ville", label: "Ville", fare: 200, note: "Trajet en ville" }
]

const BUS_SUBSCRIPTION_OPTIONS = [
  { value: "none", label: "Sans abonnement" },
  { value: "daily", label: "Journalier" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" }
]

const computeCommissionPreview = (grossAmount) => {
  const safeGross = Math.max(0, Number(grossAmount) || 0)
  const appCommissionAmount = Math.max(0, Math.round((safeGross * 10) / 100))
  return {
    appCommissionPercent: 10,
    appCommissionAmount,
    providerNetAmount: Math.max(0, safeGross - appCommissionAmount)
  }
}

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
  const [rideMode, setRideMode] = useState("standard")
  const [busZone, setBusZone] = useState("marche")
  const [appCommissionPercent, setAppCommissionPercent] = useState(10)
  const [appCommissionAmount, setAppCommissionAmount] = useState(0)
  const [driverNetAmount, setDriverNetAmount] = useState(0)
  const [vehicleType, setVehicleType] = useState("YOONWI Classic")
  const [busSubscriptionPlan, setBusSubscriptionPlan] = useState("none")
  const [reserveSeat, setReserveSeat] = useState(true)
  const [reservedSeats, setReservedSeats] = useState(1)
  const [busTravelDate, setBusTravelDate] = useState("")
  const [useTransportCredit, setUseTransportCredit] = useState(false)
  const [amountPaidNow, setAmountPaidNow] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [submitting, setSubmitting] = useState(false)
  const [loadingEstimate, setLoadingEstimate] = useState(false)
  const [resolvingClick, setResolvingClick] = useState(false)
  const [error, setError] = useState(null)
  const amountPaidNowNumber = Math.min(price, Math.max(0, Number(amountPaidNow) || 0))
  const amountRemaining = Math.max(0, price - amountPaidNowNumber)

  const applyStudentBusFare = (zone) => {
    const selectedZone = BUS_ZONE_OPTIONS.find((item) => item.value === zone) || BUS_ZONE_OPTIONS[0]
    const commission = computeCommissionPreview(selectedZone.fare)
    setPrice(selectedZone.fare)
    setAppCommissionPercent(commission.appCommissionPercent)
    setAppCommissionAmount(commission.appCommissionAmount)
    setDriverNetAmount(commission.providerNetAmount)
    setDistanceKm(null)
    setDurationMin(null)
    setRouteGeometry([])
    setVehicleType(selectedZone.value === "marche" ? "Bus Eleves - Jusqu'au marche" : "Bus Eleves - Ville")
  }

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

      if (rideMode === "bus_student") {
        applyStudentBusFare(busZone)
        setLoadingEstimate(false)
        return
      }

      try {
        setLoadingEstimate(true)
        setError(null)
        const response = await api.post("/rides/estimate", { pickup, destination, rideMode, busZone })
        if (cancelled) return

        const nextDistance = response.data.distanceKm ?? null
        const nextDuration = response.data.durationMin ?? null
        const nextGeometry = Array.isArray(response.data.geometry) ? response.data.geometry : []

        setDistanceKm(nextDistance)
        setDurationMin(nextDuration)
        setRouteGeometry(nextGeometry)
        setPrice(response.data.suggestedPrice ?? 1200)
        setAppCommissionPercent(response.data.appCommissionPercent ?? 10)
        setAppCommissionAmount(response.data.appCommissionAmount ?? 0)
        setDriverNetAmount(response.data.providerNetAmount ?? 0)
      } catch (estimateError) {
        if (!cancelled) {
          console.error("Erreur d'estimation:", estimateError)
          setDistanceKm(null)
          setDurationMin(null)
          setRouteGeometry([])
          setPrice(1200)
          setAppCommissionPercent(10)
          setAppCommissionAmount(120)
          setDriverNetAmount(1080)
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
  }, [pickup, destination, rideMode, busZone])

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
        rideMode,
        busZone: rideMode === "bus_student" ? busZone : "",
        busOptions:
          rideMode === "bus_student"
            ? {
                subscriptionPlan: busSubscriptionPlan,
                reservedSeat: reserveSeat,
                seats: reserveSeat ? Math.max(1, Number(reservedSeats) || 1) : 1,
                travelDate: busTravelDate || null,
                useTransportCredit,
                creditAmount: useTransportCredit ? amountRemaining : 0,
                amountPaidNow: useTransportCredit ? amountPaidNowNumber : price,
                amountRemaining: useTransportCredit ? amountRemaining : 0
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
            <button
              onClick={() => navigate(-1)}
              className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/20 flex items-center"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            
            </button>
            <div className="ndar-hero-glass rounded-[30px] px-4 py-4 shadow-[0_20px_40px_rgba(8,35,62,0.18)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-['Sora'] text-2xl font-extrabold text-white">YOONWI</div>
                  <div className="ndar-hero-soft text-xs font-semibold uppercase tracking-[0.18em]">Trajet en temps reel</div>
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
                {(loadingEstimate || resolvingClick) && <span className="rounded-full bg-[#eef2f6] px-3 py-2 text-xs font-semibold text-[#5a8fd1]">Calcul en cours...</span>}
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRideMode("standard")}
                  className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${
                    rideMode === "standard"
                      ? "border-[#1260a1] bg-[#e9f3fb] text-[#0a3760]"
                      : "border-[#ded8cb] bg-white text-[#5f7894]"
                  }`}
                >
                  Course standard
                </button>
                <button
                  type="button"
                  onClick={() => setRideMode("bus_student")}
                  className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${
                    rideMode === "bus_student"
                      ? "border-[#1260a1] bg-[#e9f3fb] text-[#0a3760]"
                      : "border-[#ded8cb] bg-white text-[#5f7894]"
                  }`}
                >
                  Bus eleves
                </button>
              </div>

              {rideMode === "bus_student" && (
                <div className="mb-4 rounded-2xl border border-[#dbe8f1] bg-[#f8fbff] p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5a8fd1]">Zone bus</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {BUS_ZONE_OPTIONS.map((zone) => (
                      <button
                        key={zone.value}
                        type="button"
                        onClick={() => {
                          setBusZone(zone.value)
                          applyStudentBusFare(zone.value)
                        }}
                        className={`rounded-xl border px-3 py-3 text-left ${
                          busZone === zone.value
                            ? "border-[#1260a1] bg-[#e9f3fb]"
                            : "border-[#ded8cb] bg-white"
                        }`}
                      >
                        <div className="text-sm font-semibold text-[#16324f]">{zone.label}</div>
                        <div className="text-xs text-[#5f7894]">{zone.note}</div>
                        <div className="mt-1 text-sm font-bold text-[#165c96]">{zone.fare} F</div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Abonnement flexible</label>
                      <select
                        value={busSubscriptionPlan}
                        onChange={(event) => setBusSubscriptionPlan(event.target.value)}
                        className="w-full rounded-xl border border-[#dce7f0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1260a1]"
                      >
                        {BUS_SUBSCRIPTION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Date de trajet</label>
                      <input
                        type="date"
                        value={busTravelDate}
                        onChange={(event) => setBusTravelDate(event.target.value)}
                        className="w-full rounded-xl border border-[#dce7f0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1260a1]"
                      />
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-[#dce7f0] bg-white px-3 py-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#16324f]">
                      <input
                        type="checkbox"
                        checked={reserveSeat}
                        onChange={(event) => setReserveSeat(event.target.checked)}
                        className="h-4 w-4 accent-[#1260a1]"
                      />
                      Reservation place bus
                    </label>
                    {reserveSeat && (
                      <div className="mt-3">
                        <label className="mb-1 block text-xs text-[#5f7894]">Nombre de places</label>
                        <input
                          type="number"
                          min="1"
                          max="4"
                          value={reservedSeats}
                          onChange={(event) => setReservedSeats(event.target.value)}
                          className="w-full rounded-xl border border-[#dce7f0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1260a1]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-[#dce7f0] bg-white px-3 py-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#16324f]">
                      <input
                        type="checkbox"
                        checked={useTransportCredit}
                        onChange={(event) => setUseTransportCredit(event.target.checked)}
                        className="h-4 w-4 accent-[#1260a1]"
                      />
                      Credit transport (paiement fractionne)
                    </label>
                    {useTransportCredit && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-[#5f7894]">Montant paye maintenant</label>
                          <input
                            type="number"
                            min="0"
                            max={price}
                            value={amountPaidNow}
                            onChange={(event) => setAmountPaidNow(event.target.value)}
                            className="w-full rounded-xl border border-[#dce7f0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1260a1]"
                          />
                        </div>
                        <div className="rounded-xl bg-[#f8fbff] px-3 py-2.5 text-sm text-[#16324f]">
                          <div>Reste a payer</div>
                          <div className="mt-1 font-bold text-[#165c96]">{amountRemaining.toLocaleString()} F</div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              <div className="space-y-3">
                <div className="relative">
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5a8fd1]">Depart</label>
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
                          <div className="mt-1 text-xs text-[#5a8fd1]">{result.address}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5a8fd1]">Destination</label>
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
                          <div className="mt-1 text-xs text-[#5a8fd1]">{result.address}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[24px] bg-white p-4 text-center shadow-[0_12px_28px_rgba(8,35,62,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Distance</div>
                <div className="mt-2 font-['Sora'] text-xl font-bold text-[#16324f]">{distanceKm ? `${distanceKm} km` : "--"}</div>
              </div>
              <div className="rounded-[24px] bg-white p-4 text-center shadow-[0_12px_28px_rgba(8,35,62,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Duree</div>
                <div className="mt-2 font-['Sora'] text-xl font-bold text-[#16324f]">{durationMin ? `${durationMin} min` : "--"}</div>
              </div>
              <div className="rounded-[24px] bg-[linear-gradient(180deg,#e8f2fa_0%,#dceaf8_100%)] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Prix</div>
                <div className="mt-2 font-['Sora'] text-xl font-bold text-[#165c96]">{price.toLocaleString()} F</div>
              </div>
            </div>

            <div className="rounded-[24px] bg-[linear-gradient(180deg,#edf5fb_0%,#e4eef7_100%)] px-4 py-4 text-sm text-[#16324f]">
              <div className="font-semibold text-[#1260a1]">
                {rideMode === "bus_student" ? "Tarif bus eleves gere par zone" : "Tarif ajuste pour rester plus doux"}
              </div>
              <div className="mt-2 text-[#5f7894]">
                {rideMode === "bus_student"
                  ? "Marche: 150 F et Ville: 200 F. Le prix est fixe selon la zone choisie."
                  : "L'estimation suit surtout la distance et reste volontairement plus basse que l'ancienne formule, avec un repere inspire des applis de transport economiques."}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                <span className="rounded-full bg-white px-3 py-2 text-[#1260a1]">Part appli: {appCommissionPercent}% ({appCommissionAmount.toLocaleString()} F)</span>
                <span className="rounded-full bg-white px-3 py-2 text-[#178b55]">Net chauffeur: {driverNetAmount.toLocaleString()} F</span>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#dfeaf3] bg-[#f8fbfe] px-4 py-4 text-sm text-[#16324f]">
              <div className="font-semibold text-[#165c96]">Sécurité intégrée</div>
              <div className="mt-2 text-[#5f7894]">
                Un code PIN sera généré pour cette course. Il devra être partagé au chauffeur au moment de la prise en charge.
              </div>
            </div>

            <div className="rounded-[24px] bg-white p-4 shadow-[0_12px_26px_rgba(8,35,62,0.08)]">
              <div className="font-semibold text-[#16324f]">Mode de paiement</div>
              <div className="mt-3 space-y-2">
                {[
                  { value: "Cash", label: "Espece (a la fin de la course)" },
                  { value: "Wave", label: "Wave Money" },
                  { value: "OM", label: "Orange Money" },
                  { value: "Card", label: "Carte bancaire" }
                ].map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all hover:border-[#1260a1]">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={option.value}
                      checked={paymentMethod === option.value}
                      onChange={() => setPaymentMethod(option.value)}
                      className="h-4 w-4 accent-[#1260a1]"
                    />
                    <span className="text-sm text-[#16324f]">{option.label}</span>
                  </label>
                ))}
              </div>
              {paymentMethod === 'Card' && (
                <p className="mt-2 text-xs text-[#5a8fd1]">Le paiement par carte sera géré via notre terminal sécurisé lors du passage du chauffeur ou via notre lien de paiement QR.</p>
              )}
            </div>

            <div className="space-y-3">
              {(
                rideMode === "bus_student"
                  ? [{ label: vehicleType, subtitle: "Navette eleves - tarif social par zone", iconLabel: "BUS", priceValue: price }]
                  : [
                      { label: "YOONWI Go", subtitle: "Trajet standard, prix malin", iconLabel: "GO", priceValue: price },
                      { label: "YOONWI Confort", subtitle: "Plus d'espace et plus de confort", iconLabel: "CF", priceValue: price + 2000 }
                    ]
              ).map((option) => (
                <button
                  key={option.label}
                  onClick={() => setVehicleType(option.label)}
                  className={`flex w-full items-center justify-between rounded-[28px] border px-4 py-4 text-left transition-all ${
                    vehicleType === option.label ? "border-[#1260a1] bg-[linear-gradient(180deg,#e9f3fb_0%,#dcebf7_100%)] shadow-[0_18px_36px_rgba(18,96,161,0.12)]" : "border-[#e6dccf] bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#fff7eb] text-sm font-bold text-[#165c96] shadow-sm">{option.iconLabel}</div>
                    <div>
                      <div className="font-semibold text-[#16324f]">{option.label}</div>
                      <div className="text-sm text-[#5a8fd1]">{option.subtitle}</div>
                      <div className="mt-1 text-xs text-[#5a8fd1]">{formatCompactAddress(pickup)} → {formatCompactAddress(destination)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-['Sora'] text-xl font-bold text-[#165c96]">{option.priceValue.toLocaleString()} F</div>
                    <div className="text-xs text-[#5a8fd1]">{durationMin ? `${durationMin} min` : "Estimation"}</div>
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

    </div>
  )
}

export default Ride
