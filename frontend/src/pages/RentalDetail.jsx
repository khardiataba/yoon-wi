import { useEffect, useState } from "react"
import { useParams, useLocation, useNavigate } from "react-router-dom"
import api from "../api"
import GalleryViewer from "../components/GalleryViewer"
import Toast from "../components/Toast"
import AppIcon from "../components/AppIcon"

const RentalDetail = () => {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [rental, setRental] = useState(location.state?.rental || null)
  const [gallery, setGallery] = useState(null)
  const [loading, setLoading] = useState(!rental)
  const [error, setError] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bookingData, setBookingData] = useState({
    startDate: "",
    endDate: "",
    message: ""
  })

  // Fetch rental and gallery
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!rental) {
          const rentalResponse = await api.get(`/rentals/${id}`)
          setRental(rentalResponse.data.rental)
        }

        if (rental?.provider?._id) {
          const galleryResponse = await api.get(`/gallery/provider/${rental.provider._id}`)
          setGallery(galleryResponse.data.gallery)
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Erreur lors du chargement des informations")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, rental])

  const formatPrice = (price) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0
    }).format(price)
  }

  const calculateCost = () => {
    if (!bookingData.startDate || !bookingData.endDate) return 0
    const start = new Date(bookingData.startDate)
    const end = new Date(bookingData.endDate)
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    return rental.pricePerDay * days
  }

  const handleBooking = async () => {
    if (!bookingData.startDate || !bookingData.endDate) {
      setToastMessage("Veuillez sélectionner les dates")
      return
    }

    setToastMessage("Reservation non activee pour le moment. Contactez le prestataire.")
    setShowBookingForm(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-24">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !rental) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button onClick={() => navigate("/rental")} className="text-blue-600 hover:text-blue-800 mb-4">
            ← Retour
          </button>
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-red-600 text-lg">{error || "Véhicule non trouvé"}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Back Button */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <button onClick={() => navigate("/rental")} className="text-blue-600 hover:text-blue-800 font-medium">
            ← Retour aux locations
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Vehicle Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Main Image */}
            <div className="flex flex-col gap-4">
              {rental.photoUrl && (
                <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                  <img src={rental.photoUrl} alt={rental.vehicleName} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Additional Photos */}
              {rental.additionalPhotos && rental.additionalPhotos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {rental.additionalPhotos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`Vue ${idx + 1}`}
                      className="h-20 w-20 rounded object-cover flex-shrink-0 cursor-pointer hover:opacity-75 transition"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{rental.vehicleName}</h1>
                  <p className="text-gray-600">
                    {rental.brand} {rental.model} - {rental.year}
                  </p>
                </div>
                {rental.rating && (
                  <div className="text-right">
                    <p className="text-3xl font-bold text-yellow-400">RATING</p>
                    <p className="text-sm font-semibold">{rental.rating.toFixed(1)}/5.0</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6 border-t pt-4">
                {rental.capacity?.passengers && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">P</span>
                    <span>{rental.capacity.passengers} passagers</span>
                  </div>
                )}

                {rental.color && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">C</span>
                    <span>Couleur: {rental.color}</span>
                  </div>
                )}

                {rental.licensePlate && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">ID</span>
                    <span>Immatriculation: {rental.licensePlate}</span>
                  </div>
                )}
              </div>

              {/* Price Card */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-lg p-4 mb-6">
                <p className="text-4xl font-bold text-green-600 mb-2">{formatPrice(rental.pricePerDay)}</p>
                <p className="text-gray-600">par jour</p>
                {rental.pricePerHour && (
                  <p className="text-sm text-gray-600 mt-2">ou {formatPrice(rental.pricePerHour)}/heure</p>
                )}
              </div>

              {/* Features */}
              {rental.features && rental.features.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold mb-2 flex items-center gap-2"><AppIcon name="star" className="h-5 w-5 text-[#d7ae49]" />Équipements</h3>
                  <div className="flex flex-wrap gap-2">
                    {rental.features.map((feature, idx) => (
                      <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Insurance */}
              {rental.insuranceIncluded && (
                <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-6">
                  <p className="font-semibold text-green-800">Assurance incluse</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Provider Info */}
        {rental.provider && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Prestataire</h2>
            <div className="flex items-center gap-4">
              {rental.provider.profilePhotoUrl && (
                <img
                  src={rental.provider.profilePhotoUrl}
                  alt={rental.provider.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg">{rental.provider.name}</h3>
                {rental.provider.rating && (
                  <p className="text-yellow-600">RATING {rental.provider.rating.toFixed(1)} ({rental.provider.totalRatings} avis)</p>
                )}
                <p className="text-gray-600 text-sm">Spécialité: {rental.provider.providerDetails?.serviceCategory}</p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Contacter
              </button>
            </div>
          </div>
        )}

        {/* Gallery Section */}
        {gallery && gallery.galleryItems && gallery.galleryItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Galerie du prestataire</h2>
            <GalleryViewer items={gallery.galleryItems} providerName={rental.provider?.name} />
          </div>
        )}

        {/* Description */}
        {rental.description && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{rental.description}</p>
          </div>
        )}

        {/* Location */}
        {rental.location && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Localisation</h2>
            <p className="text-gray-700">{rental.location.address}</p>
          </div>
        )}

        {/* Booking Form */}
        {showBookingForm && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Reserver ce vehicule</h2>
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-2">Date de départ</label>
                <input
                  type="date"
                  value={bookingData.startDate}
                  onChange={(e) => setBookingData({ ...bookingData, startDate: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Date de retour</label>
                <input
                  type="date"
                  value={bookingData.endDate}
                  onChange={(e) => setBookingData({ ...bookingData, endDate: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              {calculateCost() > 0 && (
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-lg font-bold text-blue-600">
                    Total estimé: {formatPrice(calculateCost())}
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-2">Message (optionnel)</label>
                <textarea
                  value={bookingData.message}
                  onChange={(e) => setBookingData({ ...bookingData, message: e.target.value })}
                  placeholder="Parlez de vos besoins..."
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBooking}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Confirmer la reservation
                </button>
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Button */}
      {!showBookingForm && (
        <div className="fixed bottom-24 left-0 right-0 px-4 py-4 bg-white border-t shadow-lg">
          <button
            onClick={() => setShowBookingForm(true)}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-lg font-bold text-lg hover:shadow-lg transition"
          >
            Reserver maintenant
          </button>
        </div>
      )}

      {/* Toast */}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

    </div>
  )
}

export default RentalDetail

