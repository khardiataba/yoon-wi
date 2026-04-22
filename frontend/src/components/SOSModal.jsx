import { useState } from 'react'
import api from '../api'

const SOSModal = ({ isOpen, onClose, rideId, userRole }) => {
  const [sending, setSending] = useState(false)
  const [location, setLocation] = useState(null)

  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            name: 'Position SOS',
            address: 'Urgence détectée'
          })
        },
        () => resolve(null),
        { timeout: 5000 }
      )
    })
  }

  const handleSOS = async () => {
    try {
      setSending(true)
      const loc = await getCurrentLocation()
      
      await api.post(`/rides/${rideId}/safety-report`, {
        type: 'sos_shake',
        message: `${userRole === 'driver' ? 'SOS Chauffeur' : 'SOS Passager'} - Détecté par accéléromètre`,
        location: loc
      })

      onClose()
      alert('SOS envoyé avec succès ! Support sécurité alerté.')
    } catch (error) {
      alert('Erreur envoi SOS. Réessayez.')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="text-center mb-6">
          <svg className="h-20 w-20 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833 .192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">SOS URGENCE</h2>
          <p className="text-gray-600 mb-6">Secouer 2x confirmé. Envoyer alerte sécurité ?</p>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm font-medium text-red-800">
              Position GPS incluse + notification support immédiat
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={sending}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 rounded-2xl transition-all disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSOS}
              disabled={sending}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Envoi...
                </>
              ) : (
                '🚨 ENVOYER SOS'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SOSModal

