import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"
import MapPicker from "../components/MapPicker"

const trackingSteps = [
  { key: "confirmed", label: "Course confirmee" },
  { key: "driver", label: "Chauffeur en approche" },
  { key: "pickup", label: "Prise en charge" },
  { key: "dropoff", label: "Arrivee a destination" }
]

const RideTracking = () => {
  const navigate = useNavigate()
  const [driverPosition, setDriverPosition] = useState({ lat: 16.026, lng: -16.503 })
  const [ride, setRide] = useState(null)
  const [error, setError] = useState(null)
  const [statusMessage, setStatusMessage] = useState("")
  const [sendingAlert, setSendingAlert] = useState(false)
  const [trackingStage, setTrackingStage] = useState(1)
  const [syncedRideId, setSyncedRideId] = useState(null)

  useEffect(() => {
    try {
      const savedRide = localStorage.getItem("currentRide")
      if (savedRide) {
        setRide(JSON.parse(savedRide))
      }
    } catch (storageError) {
      console.error("Erreur de lecture de la course sauvegardee:", storageError)
      setError("Impossible de relire les details de votre course.")
    }
  }, [])

  useEffect(() => {
    const rideId = ride?._id || ride?.rideId || ride?.id
    if (!rideId || rideId === syncedRideId) return

    let cancelled = false

    const refreshRide = async () => {
      try {
        const response = await api.get(`/rides/${rideId}`)
        if (cancelled) return
        const mergedRide = {
          ...ride,
          ...response.data,
          rideId
        }
        setRide(mergedRide)
        setSyncedRideId(rideId)
        localStorage.setItem("currentRide", JSON.stringify(mergedRide))
      } catch (refreshError) {
        if (!cancelled) {
          console.error("Impossible de recharger la course:", refreshError)
        }
      }
    }

    refreshRide()

    return () => {
      cancelled = true
    }
  }, [ride, syncedRideId])

  useEffect(() => {
    const interval = setInterval(() => {
      setDriverPosition((current) => ({
        lat: current.lat - 0.00008,
        lng: current.lng + 0.00006
      }))
    }, 2600)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setTrackingStage((current) => Math.min(current + 1, trackingSteps.length - 1))
    }, 9000)

    return () => clearInterval(timer)
  }, [])

  const eta = ride?.durationMin ? `Arrivee estimee dans ${Math.max(1, ride.durationMin - 2)} min` : "Arrivee estimee dans 4 min"
  const currentStep = trackingSteps[trackingStage]
  const ridePrice = ride?.price ? `${ride.price.toLocaleString()} FCFA` : "Tarif calcule"
  const safetyCode = ride?.safetyCode ? String(ride.safetyCode) : "----"
  const rideIdentifier = ride?._id || ride?.rideId || ride?.id || null

  const copySafetyCode = async () => {
    try {
      await navigator.clipboard.writeText(safetyCode)
      setStatusMessage("Code PIN copié.")
    } catch (copyError) {
      console.error("Impossible de copier le code:", copyError)
      setStatusMessage("Copie impossible pour le moment.")
    }
  }

  const shareTrip = async () => {
    const summary = `Ma course Yoonbi
Départ: ${ride?.pickup?.name || ride?.pickup?.address || "Position actuelle"}
Destination: ${ride?.destination?.name || ride?.destination?.address || "Destination"}
Code PIN: ${safetyCode}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Course Yoonbi",
          text: summary
        })
      } else {
        await navigator.clipboard.writeText(summary)
        setStatusMessage("Détails de la course copiés.")
      }
    } catch (shareError) {
      console.error("Impossible de partager la course:", shareError)
      setStatusMessage("Partage indisponible pour le moment.")
    }
  }

  const sendEmergencyAlert = async () => {
    if (!rideIdentifier) {
      setStatusMessage("Aucune course active à signaler.")
      return
    }

    try {
      setSendingAlert(true)
      setStatusMessage("")
      await api.post(`/rides/${rideIdentifier}/safety-report`, {
        type: "sos",
        message: "Alerte de securite depuis le suivi de course",
        location: {
          name: ride?.pickup?.name || "Course active",
          address: ride?.pickup?.address || ride?.destination?.address || ""
        }
      })
      setStatusMessage("Alerte envoyée au support.")
    } catch (alertError) {
      console.error("Erreur pendant l'alerte de securite:", alertError)
      setStatusMessage("Impossible d'envoyer l'alerte pour le moment.")
    } finally {
      setSendingAlert(false)
    }
  }

  return (
    <div className="min-h-screen px-4 pb-10 pt-5">
      <div className="ndar-shell space-y-4">
        <header className="rounded-[38px] border border-[#0b3154] bg-[linear-gradient(180deg,#0d416e_0%,#072a48_100%)] p-5 shadow-[0_24px_60px_rgba(8,35,62,0.30)]">
          <div className="flex items-center justify-between gap-4">
            <button onClick={() => navigate(-1)} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-[#fff4e4]">Fermer</button>
            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#f6d59a]">{currentStep.label}</div>
          </div>
          <h1 className="mt-4 font-['Sora'] text-3xl font-extrabold text-white">Tracking ride</h1>
          <p className="mt-2 text-sm text-[#eaf3fb]">{eta}</p>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {trackingSteps.map((step, index) => (
              <div key={step.key} className="space-y-2">
                <div className={`h-2 rounded-full ${index <= trackingStage ? "bg-[#f1c778]" : "bg-white/12"}`} />
                <div className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${index <= trackingStage ? "text-[#fff4e4]" : "text-[#d2e1ee]"}`}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </header>

        <section className="ndar-card rounded-[32px] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="ndar-chip">Sécurité</div>
              <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Code PIN de départ</h2>
              <p className="mt-1 text-sm text-[#70839a]">
                Montrez ce code au chauffeur avant le démarrage de la course.
              </p>
            </div>
            <div className="rounded-[24px] bg-[linear-gradient(180deg,#edf5fb_0%,#dfeefa_100%)] px-5 py-4 text-center shadow-[0_12px_28px_rgba(8,35,62,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#70839a]">PIN</div>
              <div className="mt-2 font-['Sora'] text-3xl font-extrabold tracking-[0.25em] text-[#1260a1]">{safetyCode}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <button
              onClick={copySafetyCode}
              className="rounded-[24px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-4 py-3 text-sm font-bold text-white shadow-[0_18px_34px_rgba(8,35,62,0.18)]"
            >
              Copier le PIN
            </button>
            <button
              onClick={shareTrip}
              className="rounded-[24px] bg-white px-4 py-3 text-sm font-bold text-[#1260a1] shadow-[0_12px_26px_rgba(8,35,62,0.08)]"
            >
              Partager la course
            </button>
            <button
              onClick={sendEmergencyAlert}
              disabled={sendingAlert}
              className="rounded-[24px] bg-[#fff1f1] px-4 py-3 text-sm font-bold text-[#a54b55] shadow-[0_12px_26px_rgba(8,35,62,0.08)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sendingAlert ? "Alerte..." : "SOS / Signaler"}
            </button>
            <button
              onClick={() => navigate("/security-support")}
              className="rounded-[24px] bg-white px-4 py-3 text-sm font-bold text-[#1260a1] shadow-[0_12px_26px_rgba(8,35,62,0.08)]"
            >
              Ouvrir support sécurité
            </button>
          </div>

          {statusMessage && (
            <div className="mt-4 rounded-2xl bg-[#f7fbff] px-4 py-3 text-sm text-[#165c96]">
              {statusMessage}
            </div>
          )}
        </section>

        <section className="ndar-card rounded-[38px] p-4">
          <div className="h-[360px] overflow-hidden rounded-[30px]">
            <MapPicker
              center={driverPosition}
              initialPickup={ride?.pickup}
              initialDestination={ride?.destination}
              driverPosition={driverPosition}
              routeGeometry={ride?.routeGeometry}
              readOnly
            />
          </div>
        </section>

        <section className="ndar-card rounded-[38px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="ndar-chip">Suivi en direct</div>
              <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Trip summary</h2>
            </div>
            <div className="rounded-[24px] bg-[linear-gradient(180deg,#edf5fb_0%,#dfeefa_100%)] px-4 py-3 text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Prix</div>
              <div className="mt-1 font-['Sora'] text-lg font-bold text-[#1260a1]">{ridePrice}</div>
            </div>
          </div>
          {error && <div className="mt-4 rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[26px] bg-[linear-gradient(180deg,#fffdfa_0%,#f7f0e5_100%)] p-4 shadow-[0_12px_28px_rgba(8,35,62,0.06)]">
              <div className="text-xs uppercase tracking-[0.2em] text-[#70839a]">Depart</div>
              <div className="mt-2 font-semibold text-[#16324f]">{ride?.pickup?.name || ride?.pickup?.address || "Position actuelle"}</div>
            </div>
            <div className="rounded-[26px] bg-[linear-gradient(180deg,#fffdfa_0%,#f7f0e5_100%)] p-4 shadow-[0_12px_28px_rgba(8,35,62,0.06)]">
              <div className="text-xs uppercase tracking-[0.2em] text-[#70839a]">Destination</div>
              <div className="mt-2 font-semibold text-[#16324f]">{ride?.destination?.name || ride?.destination?.address || "Destination"}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-[24px] bg-white p-4 text-center shadow-[0_10px_22px_rgba(8,35,62,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#70839a]">Distance</div>
              <div className="mt-2 font-['Sora'] text-base font-bold text-[#16324f]">{ride?.distanceKm ? `${ride.distanceKm} km` : "--"}</div>
            </div>
            <div className="rounded-[24px] bg-white p-4 text-center shadow-[0_10px_22px_rgba(8,35,62,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#70839a]">Duree</div>
              <div className="mt-2 font-['Sora'] text-base font-bold text-[#16324f]">{ride?.durationMin ? `${ride.durationMin} min` : "--"}</div>
            </div>
            <div className="rounded-[24px] bg-[linear-gradient(180deg,#e7f1f9_0%,#dcebf8_100%)] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#70839a]">Chauffeur</div>
              <div className="mt-2 font-['Sora'] text-base font-bold text-[#1260a1]">En route</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => navigate("/mybookings")} className="rounded-[24px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_34px_rgba(8,35,62,0.18)]">Voir mes reservations</button>
            <button onClick={() => navigate("/")} className="rounded-[24px] bg-[#edf3f8] px-5 py-3 text-sm font-bold text-[#1260a1]">Retour accueil</button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default RideTracking
