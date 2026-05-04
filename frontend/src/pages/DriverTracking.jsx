import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useToast } from "../context/ToastContext"
import MapPicker from "../components/MapPicker"
import api from "../api"
import useSocket from "../hooks/useSocket"
import useShakeDetection from "../hooks/useShakeDetection"

const hasExactLocation = (location) =>
  Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng))

const buildGoogleMapsUrl = (location) => {
  if (!hasExactLocation(location)) return ""
  return `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}&travelmode=driving`
}

const DriverTracking = () => {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { updateLocation, goOnline, isConnected } = useSocket()

  const [ride, setRide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [locationPermission, setLocationPermission] = useState(null)
  const [driverLocation, setDriverLocation] = useState(null)
  const [passengerLocation, setPassengerLocation] = useState(null)
  const [navigationRoute, setNavigationRoute] = useState([])
  const [eta, setEta] = useState(null)
  const [distance, setDistance] = useState(null)
  const [statusMessage, setStatusMessage] = useState("")
  const [routeError, setRouteError] = useState(null)
  const lastSharedLocationRef = useRef(null)

  const sendEmergencyAlert = useCallback(async () => {
    try {
      await api.post(`/rides/${rideId}/safety-report`, {
        type: "sos_shake",
        message: "SOS chauffeur detecte apres secousses anormales",
        location: driverLocation || {
          name: "Position chauffeur",
          address: "Position en cours de partage",
          lat: null,
          lng: null
        }
      })
      showToast("Alerte SOS envoyee.", "success")
    } catch (sosError) {
      showToast(sosError.response?.data?.message || "Impossible d'envoyer le SOS.", "error")
    }
  }, [driverLocation, rideId, showToast])

  const { shakeDetected, clearShake, countdown, confirmShake } = useShakeDetection(sendEmergencyAlert)

  const fetchRideData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get(`/rides/${rideId}`)
      const rideData = response.data || null
      setRide(rideData)
      setPassengerLocation(rideData?.pickup || null)
      setDriverLocation((current) => current || rideData?.currentDriverLocation || null)
    } catch (error) {
      console.error("Erreur récupération course:", error)
      showToast("Impossible de charger la course", "error")
    } finally {
      setLoading(false)
    }
  }, [rideId, showToast])

  const shareDriverLocation = useCallback(
    async (location) => {
      if (!hasExactLocation(location)) return

      const last = lastSharedLocationRef.current
      const unchanged =
        last &&
        Math.abs(Number(last.lat) - Number(location.lat)) < 0.00005 &&
        Math.abs(Number(last.lng) - Number(location.lng)) < 0.00005

      if (unchanged) return

      lastSharedLocationRef.current = location
      setStatusMessage("Position chauffeur partagee en direct.")

      updateLocation(location.lat, location.lng)

      try {
        await api.patch(`/rides/${rideId}/driver-location`, {
          source: "device",
          location
        })
      } catch (shareError) {
        console.error("Erreur partage position chauffeur:", shareError)
      }
    },
    [rideId, updateLocation]
  )

  useEffect(() => {
    fetchRideData()
  }, [fetchRideData])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationPermission(false)
      return
    }

    let watchId = null

    const startWatch = () => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const nextLocation = {
            lat: Number(position.coords.latitude),
            lng: Number(position.coords.longitude),
            name: "Position chauffeur",
            address: "Position GPS verifiee"
          }
          setDriverLocation(nextLocation)
          shareDriverLocation(nextLocation)
        },
        (error) => {
          console.warn("Erreur localisation chauffeur:", error)
          setStatusMessage("Localisation indisponible pour le moment.")
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      )
    }

    const requestPermission = async () => {
      try {
        if (navigator.permissions?.query) {
          const permissionStatus = await navigator.permissions.query({ name: "geolocation" })
          if (permissionStatus.state === "denied") {
            setLocationPermission(false)
            return
          }
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocationPermission(true)
            const nextLocation = {
              lat: Number(position.coords.latitude),
              lng: Number(position.coords.longitude),
              name: "Position chauffeur",
              address: "Position GPS verifiee"
            }
            setDriverLocation(nextLocation)
            shareDriverLocation(nextLocation)
            startWatch()
          },
          () => {
            setLocationPermission(false)
          },
          { enableHighAccuracy: true, timeout: 12000 }
        )
      } catch (error) {
        console.error("Erreur permission localisation:", error)
        setLocationPermission(false)
      }
    }

    requestPermission()

    return () => {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [shareDriverLocation])

  useEffect(() => {
    if (!isConnected) return
    if (!hasExactLocation(driverLocation)) return

    goOnline(
      {
        latitude: Number(driverLocation.lat),
        longitude: Number(driverLocation.lng)
      },
      ride?.vehicleType || "standard"
    )
  }, [driverLocation, goOnline, isConnected, ride?.vehicleType])

  useEffect(() => {
    const handlePassengerLocationUpdate = (event) => {
      const data = event?.detail
      const loc = data?.location
      const lat = loc?.lat ?? loc?.latitude
      const lng = loc?.lng ?? loc?.longitude

      if (typeof lat === "number" && typeof lng === "number") {
        setPassengerLocation({
          lat,
          lng,
          name: data?.address || "Position client",
          address: data?.address || "Position client partagee"
        })
      }
    }

    window.addEventListener("passenger:location-update", handlePassengerLocationUpdate)
    return () => window.removeEventListener("passenger:location-update", handlePassengerLocationUpdate)
  }, [])

  const navigationTarget = useMemo(() => {
    if (!ride) return null
    if (ride.status === "ongoing") return ride.destination
    if (hasExactLocation(passengerLocation)) return passengerLocation
    return ride.pickup
  }, [passengerLocation, ride])

  const mapPickup = useMemo(() => {
    if (!ride) return null
    if (ride.status === "ongoing") return hasExactLocation(passengerLocation) ? passengerLocation : ride.pickup
    return navigationTarget
  }, [navigationTarget, passengerLocation, ride])

  const mapDestination = useMemo(() => {
    if (!ride) return null
    return ride.status === "ongoing" ? ride.destination : null
  }, [ride])

  useEffect(() => {
    if (!hasExactLocation(driverLocation) || !hasExactLocation(navigationTarget)) return

    let cancelled = false

    const calculateNavigation = async () => {
      try {
        setRouteError(null)
        const response = await api.post("/rides/estimate", {
          pickup: driverLocation,
          destination: navigationTarget
        })

        if (cancelled) return

        setNavigationRoute(Array.isArray(response.data?.geometry) ? response.data.geometry : [])
        setDistance(Number(response.data?.distanceKm || 0))
        setEta(Number(response.data?.durationMin || 0))
      } catch (navigationError) {
        if (!cancelled) {
          console.error("Erreur calcul navigation:", navigationError)
          setRouteError(navigationError.userMessage || "Impossible de calculer l'itineraire.")
        }
      }
    }

    calculateNavigation()
    const intervalId = window.setInterval(calculateNavigation, 15000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [driverLocation, navigationTarget])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 pb-32">
        <div className="ndar-card rounded-2xl p-8 text-center">
          <p className="text-[#fff7ec]">Chargement du suivi...</p>
        </div>
      </div>
    )
  }

  if (!ride) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 pb-32">
        <div className="ndar-card rounded-2xl p-8 text-center">
          <p className="text-[#ff6b6b] mb-4">Course non trouvée</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-[#d7ae49] hover:bg-[#e8c45f] text-black font-semibold py-2 px-4 rounded-lg"
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-32 px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#fff7ec]">Navigation chauffeur</h1>
          <button onClick={() => navigate(-1)} className="text-[#d7ae49] font-semibold">
            Fermer
          </button>
        </div>

        {locationPermission === false && (
          <div className="ndar-card rounded-2xl p-4 border border-[#5a8fd1]/30 bg-[#edf5fb] text-[#0a3760]">
            Activez la localisation pour partager votre position et calculer un itineraire exact.
          </div>
        )}

        <div className="ndar-card rounded-2xl p-5">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-xs text-[#b0bac9] mb-1">Distance</p>
              <p className="text-xl font-bold text-[#fff7ec]">{distance ? `${distance.toFixed(1)} km` : "Calcul..."}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#b0bac9] mb-1">ETA</p>
              <p className="text-xl font-bold text-[#18c56e]">{eta ? `${eta} min` : "Calcul..."}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#b0bac9] mb-1">Statut</p>
              <p className="text-xl font-bold text-[#d7ae49]">{ride.status === "ongoing" ? "Vers destination" : "Vers client"}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#f8fbff] px-4 py-3 text-sm text-[#5a8fd1]">
            {statusMessage || "Position en cours de verification."}
          </div>

          {routeError && (
            <div className="mt-3 rounded-2xl bg-[#edf5fb] px-4 py-3 text-sm text-[#0a3760]">
              {routeError}
            </div>
          )}
        </div>

        <div className="ndar-card rounded-2xl p-5 overflow-hidden">
          <h3 className="text-lg font-semibold text-[#fff7ec] mb-3">Itineraire verifie</h3>
          <div className="h-[340px] rounded-xl overflow-hidden border border-[#d7ae49]/20">
            <MapPicker
              center={driverLocation || navigationTarget || ride.pickup}
              initialPickup={mapPickup}
              initialDestination={mapDestination}
              driverPosition={driverLocation}
              routeGeometry={navigationRoute.length ? navigationRoute : ride.routeGeometry}
              readOnly
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f8fbff] px-4 py-4 text-sm text-[#16324f]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Adresse cible</div>
              <div className="mt-2 font-semibold">
                {navigationTarget?.address || navigationTarget?.name || "Adresse indisponible"}
              </div>
              <div className="mt-1 text-xs text-[#5f7184]">
                {hasExactLocation(navigationTarget) ? "Coordonnees verifiees" : "Coordonnees a verifier"}
              </div>
            </div>
            <button
              onClick={() => {
                const url = buildGoogleMapsUrl(navigationTarget)
                if (url) {
                  window.open(url, "_blank", "noopener,noreferrer")
                }
              }}
              disabled={!hasExactLocation(navigationTarget)}
              className="rounded-2xl bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-4 py-4 text-sm font-bold text-white disabled:opacity-60"
            >
              Ouvrir la navigation
            </button>
          </div>
        </div>

        <div className="ndar-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-[#fff7ec] mb-3">Verification des points</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#fffdfa] px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Prise en charge</div>
              <div className="mt-2 font-semibold text-[#16324f]">{(passengerLocation?.address || ride.pickup?.address || ride.pickup?.name || "Adresse indisponible")}</div>
              <div className="mt-1 text-xs text-[#5f7184]">
                {hasExactLocation(passengerLocation || ride.pickup) ? "Localisation partagee et verifiee" : "Localisation approximative"}
              </div>
            </div>
            <div className="rounded-2xl bg-[#fffdfa] px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Destination</div>
              <div className="mt-2 font-semibold text-[#16324f]">{ride.destination?.address || ride.destination?.name || "Adresse indisponible"}</div>
              <div className="mt-1 text-xs text-[#5f7184]">
                {hasExactLocation(ride.destination) ? "Destination verifiee" : "Destination a verifier"}
              </div>
            </div>
          </div>
        </div>

        {shakeDetected && (
          <div className="fixed bottom-24 left-4 right-4 z-50">
            <div className="bg-[#0a3760] text-white p-4 rounded-2xl text-center shadow-2xl">
              <div className="font-bold text-lg mb-2">Alerte secousse detectee</div>
              <div className="text-sm mb-4">SOS automatique dans {countdown}s</div>
              <div className="flex justify-center gap-3">
                <button onClick={confirmShake} className="bg-white text-[#0a3760] px-5 py-2 rounded-xl font-bold">
                  Envoyer maintenant
                </button>
                <button onClick={clearShake} className="bg-white/20 px-5 py-2 rounded-xl font-semibold">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DriverTracking
