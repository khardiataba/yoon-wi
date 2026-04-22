import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import MapPicker from "../components/MapPicker"
import api from "../api"
import useSocket from "../hooks/useSocket"
import useShakeDetection from "../hooks/useShakeDetection"
import SOSModal from "../components/SOSModal"


const DriverTracking = () => {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [ride, setRide ] = useState(null)
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(true)
  const [locationPermission, setLocationPermission] = useState(null)
  const [clientLocation, setClientLocation] = useState(null)
  const [driverLocation, setDriverLocation] = useState(null)
  const [eta, setEta] = useState(null)
  const [distance, setDistance] = useState(null)

  const [showSOSModal, setShowSOSModal] = useState(false)

  const handleShakeSOS = () => {
    setShowSOSModal(true)
  }


  // Request location permission on mount
  useEffect(() => {
    requestLocationPermission()
    fetchRideData()
  }, [rideId])

  const requestLocationPermission = async () => {
    try {
      if (!navigator.geolocation) {
        setLocationPermission(false)
        showToast("Géolocalisation non disponible", "error")
        return
      }

      navigator.geolocation.requestPermission().then((permission) => {
        if (permission === "granted") {
          setLocationPermission(true)
          startTrackingLocation()
        } else {
          setLocationPermission(false)
          showToast("Permission de localisation refusée", "warning")
        }
      }).catch(() => {
        // Fallback for non-permission API browsers
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocationPermission(true)
            startTrackingLocation()
          },
          () => {
            setLocationPermission(false)
            showToast("Impossible d'accéder à votre position", "error")
          }
        )
      })
    } catch (error) {
      console.error("Erreur permission localisation:", error)
      setLocationPermission(false)
    }
  }

  const startTrackingLocation = () => {
    if (!navigator.geolocation) return

    // Continuous location tracking
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setClientLocation(loc)
      },
      (error) => console.warn("Erreur localisation:", error),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }

  const fetchRideData = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/rides/${rideId}`)
      setRide(response.data.ride)

      if (response.data.ride?.driverId) {
        // Fetch driver info
        const driverRes = await api.get(`/users/${response.data.ride.driverId}`)
        setDriver(driverRes.data.user)
      }
    } catch (error) {
      console.error("Erreur récupération course:", error)
      showToast("Impossible de charger la course", "error")
    } finally {
      setLoading(false)
    }
  }

  // Socket listener for driver location updates
  useSocket()
  
  const { shakeDetected, clearShake } = useShakeDetection(handleShakeSOS)


  useEffect(() => {
    if (!ride || !clientLocation) return

    // Calculate ETA based on distance
    const distance = Math.sqrt(
      Math.pow(ride.destination.lat - clientLocation.lat, 2) +
      Math.pow(ride.destination.lng - clientLocation.lng, 2)
    ) * 111 // rough km conversion

    setDistance(distance)
    const etaMinutes = Math.ceil(distance / 1.4) // average speed
    setEta(etaMinutes)
  }, [ride, clientLocation])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 pb-32">
        <div className="ndar-card rounded-2xl p-8 text-center">
          <svg className="animate-spin h-12 w-12 mb-4 text-blue-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#fff7ec]">Suivi du trajet</h1>
          <svg className="h-6 w-6 text-[#d7ae49] hover:text-[#e8c45f] cursor-pointer" onClick={() => navigate(-1)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* Location Permission Alert */}
        {locationPermission === false && (
          <div className="ndar-card rounded-2xl p-4 border border-red-500/30 bg-red-500/10">
            <div className="flex items-start gap-3">
              <svg className="h-8 w-8 text-yellow-500 mt-1 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77 .833 .192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="font-semibold text-red-400 mb-2">Localisation requise</p>
                <p className="text-sm text-[#b0bac9] mb-3">
                  Veuillez activer la localisation pour suivre le chauffeur et voir l'ETA
                </p>
                <button
                  onClick={requestLocationPermission}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                >
                  Activer la localisation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Driver Info Card */}
        {driver && (
          <div className="ndar-card rounded-2xl p-5 border border-[#d7ae49]/30">
            <div className="flex items-center gap-4 mb-4">
              {driver.profileImage ? (
                <img
                  src={driver.profileImage}
                  alt={driver.fullName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#d7ae49]"
                />
              ) : (
                <svg className="w-16 h-16 text-gray-400 bg-[#d7ae49]/20 rounded-full p-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              <div className="flex-1">
                <h2 className="text-lg font-bold text-[#fff7ec]">{driver.fullName}</h2>
                <p className="text-sm text-[#d7ae49]">Chauffeur YOON WI</p>
                <div className="mt-2 flex gap-2">
                  <span className="inline-block px-3 py-1 bg-[#18c56e]/20 text-[#18c56e] text-xs font-semibold rounded-full">
                    ✓ Vérifié
                  </span>
                  {driver.rating && (
                    <span className="inline-block px-3 py-1 bg-[#ffd700]/20 text-[#ffd700] text-xs font-semibold rounded-full">
                      ⭐ {driver.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Buttons */}
            <div className="flex gap-3 pt-4 border-t border-[#d7ae49]/20">
              <button className="flex-1 bg-[#3a7dd6]/20 hover:bg-[#3a7dd6]/40 text-[#6ba3e5] font-semibold py-2 rounded-lg transition-colors">
                <svg className="inline h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Appeler
              </button>
              <button className="flex-1 bg-[#d7ae49]/20 hover:bg-[#d7ae49]/40 text-[#ffd700] font-semibold py-2 rounded-lg transition-colors">
                <svg className="inline h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 4.03 9 8z" />
                </svg>
                Message
              </button>
            </div>
          </div>
        )}

        {/* Tracking Status */}
        <div className="ndar-card rounded-2xl p-5">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-xs text-[#b0bac9] mb-1">Distance</p>
              <p className="text-xl font-bold text-[#fff7ec]">
                {distance ? `${distance.toFixed(1)} km` : "..."}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#b0bac9] mb-1">ETA</p>
              <p className="text-xl font-bold text-[#18c56e]">
                {eta ? `${eta} min` : "Calcul..."}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#b0bac9] mb-1">Statut</p>
              <p className="text-xl font-bold text-[#d7ae49]">
                {ride.status === "accepted" ? "En route" : "En attente"}
              </p>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <svg className="h-8 w-8 text-green-500 flex-shrink-0 mt-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-[#18c56e]">Course acceptée</p>
                <p className="text-sm text-[#b0bac9]">Le chauffeur a accepté votre demande</p>
              </div>
            </div>
            {ride.status === "ongoing" && (
              <div className="flex items-start gap-3">
                <svg className="h-8 w-8 text-blue-500 flex-shrink-0 mt-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <div>
                  <p className="font-semibold text-[#3a7dd6]">Chauffeur en route</p>
                  <p className="text-sm text-[#b0bac9]">Le chauffeur arrive vers vous</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Section */}
        {clientLocation && ride && (
          <div className="ndar-card rounded-2xl p-5 overflow-hidden">
            <h3 className="text-lg font-semibold text-[#fff7ec] mb-3">Carte du trajet</h3>
            <div className="h-[300px] rounded-xl overflow-hidden border border-[#d7ae49]/20">
              <MapPicker
                center={clientLocation}
                readOnly
                extraMarkers={[
                  {
                    id: "pickup",
                    lat: ride.pickup.lat,
                    lng: ride.pickup.lng,
                    label: "Départ",
                    icon: "map-pin",
                    background: "#3a7dd6"
                  },
                  {
                    id: "destination",
                    lat: ride.destination.lat,
                    lng: ride.destination.lng,
                    label: "Arrivée",
                    icon: "flag",
                    background: "#18c56e"
                  },
                  ...(driverLocation ? [{
                    id: "driver",
                    lat: driverLocation.lat,
                    lng: driverLocation.lng,
                    label: "Chauffeur",
                    icon: "car",
                    background: "#d7ae49"
                  }] : [])
                ]}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="ndar-card rounded-2xl p-5 space-y-3">
          <button className="w-full bg-[#3a7dd6]/20 hover:bg-[#3a7dd6]/40 text-[#6ba3e5] font-semibold py-3 rounded-lg transition-colors border border-[#3a7dd6]/30 flex items-center">
            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Voir les détails de la course
          </button>
          <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold py-3 rounded-lg transition-colors border border-red-500/20 flex items-center">
            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Annuler la course
          </button>
        </div>
      </div>
      
      {shakeDetected && (
        <div className="fixed bottom-24 left-4 right-4 z-50">
          <div className="bg-yellow-500 text-white p-4 rounded-2xl text-center shadow-2xl animate-bounce">
            <div className="font-bold text-lg mb-2">🚨 SHAKE DÉTECTÉ</div>
            <div className="text-sm mb-4">Secouez encore pour SOS d'urgence</div>
            <button 
              onClick={handleShakeSOS}
              className="bg-red-600 px-6 py-3 rounded-xl font-bold text-white text-lg"
            >
              SOS URGENCE
            </button>
            <button 
              onClick={clearShake}
              className="ml-4 text-white underline text-sm"
            >
              Ignorer
            </button>
          </div>
        </div>
      )}

      <SOSModal 
        isOpen={showSOSModal} 
        onClose={() => setShowSOSModal(false)}
        rideId={rideId}
        userRole="driver" 
      />
    </div>
  )
}


export default DriverTracking

