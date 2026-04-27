import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import { useToast } from "../context/ToastContext"
import api from "../api"
import ProviderPortfolio from "../components/ProviderPortfolio"
import { resolveMediaUrl } from "../utils/mediaUrl"

const Profile = () => {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    profilePhotoUrl: "",
    role: "",
    status: "",
    serviceCategory: "",
    serviceArea: "",
    availability: "",
    experienceYears: "",
    vehicleBrand: "",
    vehicleType: "",
    vehiclePlate: "",
    beautySpecialty: "",
    otherServiceDetail: "",
    hasProfessionalTools: false,
    coordinates: { lat: 0, lng: 0 }
  })

  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [imagePreview, setImagePreview] = useState("")
  const [openUploadSignal, setOpenUploadSignal] = useState(0)
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        profilePhotoUrl: user.profilePhotoUrl || "",
        role: user.role || "",
        status: user.status || "",
        serviceCategory: user.providerDetails?.serviceCategory || "",
        serviceArea: user.providerDetails?.serviceArea || "",
        availability: user.providerDetails?.availability || "",
        experienceYears: user.providerDetails?.experienceYears || "",
        vehicleBrand: user.providerDetails?.vehicleBrand || "",
        vehicleType: user.providerDetails?.vehicleType || "",
        vehiclePlate: user.providerDetails?.vehiclePlate || "",
        beautySpecialty: user.providerDetails?.beautySpecialty || "",
        otherServiceDetail: user.providerDetails?.otherServiceDetail || "",
        hasProfessionalTools: user.providerDetails?.hasProfessionalTools || false,
        coordinates: user.providerDetails?.coordinates || { lat: 0, lng: 0 }
      })

      if (user.profilePhotoUrl) {
        setImagePreview(resolveMediaUrl(user.profilePhotoUrl))
      }
    }
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
        setProfile(prev => ({ ...prev, profilePhotoUrl: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const openCameraCapture = () => {
    cameraInputRef.current?.click()
  }

  const openGalleryPicker = () => {
    galleryInputRef.current?.click()
  }

  const handleUpdateProfile = async () => {
    setLoading(true)
    try {
      const updateData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        profilePhotoUrl: profile.profilePhotoUrl
      }

      if (user.role === 'driver' || user.role === 'technician') {
        updateData.providerDetails = {
          serviceCategory: profile.serviceCategory,
          serviceArea: profile.serviceArea,
          availability: profile.availability,
          experienceYears: profile.experienceYears,
          vehicleBrand: profile.vehicleBrand,
          vehicleType: profile.vehicleType,
          vehiclePlate: profile.vehiclePlate,
          beautySpecialty: profile.beautySpecialty,
          otherServiceDetail: profile.otherServiceDetail,
          hasProfessionalTools: profile.hasProfessionalTools,
          coordinates: profile.coordinates
        }
      }

      const response = await api.put("/user/profile", updateData)

      if (response.data.success) {
        if (updateUser) updateUser(response.data.user)
        showToast("Profil mis à jour !", "success")
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Erreur", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)
    try {
      await api.delete("/user/account")
      showToast("Compte supprimé", "success")
      logout()
      navigate("/login")
    } catch (error) {
      showToast("Erreur lors de la suppression", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a192f] px-4 pb-10 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#fff7ec] mb-8">Mon Profil</h1>
        
        <div className="bg-[#0f2a44] p-6 rounded-2xl border border-white/10 shadow-xl">
          {/* Photo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#d7ae49]">
                {imagePreview ? (
                  <img src={imagePreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center text-[#d7ae49]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
                      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0Z" />
                    </svg>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={openCameraCapture}
                className="absolute bottom-0 right-0 bg-[#d7ae49] p-2 rounded-full cursor-pointer hover:bg-[#e8c45f] transition-all"
                title="Prendre une photo"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-[#0a192f]">
                  <path d="M4 8h3l1.3-2h7.4L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                </svg>
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openCameraCapture}
                className="rounded-xl bg-[#d7ae49] px-4 py-2 text-sm font-semibold text-[#0a192f] hover:bg-[#e8c45f]"
              >
                Appareil
              </button>
              <button
                type="button"
                onClick={openGalleryPicker}
                className="rounded-xl border border-[#d7ae49]/50 px-4 py-2 text-sm font-semibold text-[#fff7ec] hover:bg-white/10"
              >
                Galerie
              </button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageChange}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Form Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col">
                <label className="text-[#d7ae49] text-sm mb-1">Prénom</label>
                <input name="firstName" value={profile.firstName} onChange={handleInputChange} className="bg-[#1a3a5c] border border-white/10 p-2 rounded text-white focus:outline-none focus:border-[#d7ae49]" />
              </div>
              <div className="flex flex-col">
                <label className="text-[#d7ae49] text-sm mb-1">Nom</label>
                <input name="lastName" value={profile.lastName} onChange={handleInputChange} className="bg-[#1a3a5c] border border-white/10 p-2 rounded text-white focus:outline-none focus:border-[#d7ae49]" />
              </div>
            </div>
            
            <div className="flex flex-col">
              <label className="text-[#d7ae49] text-sm mb-1">Téléphone</label>
              <input name="phone" value={profile.phone} onChange={handleInputChange} className="bg-[#1a3a5c] border border-white/10 p-2 rounded text-white focus:outline-none focus:border-[#d7ae49]" />
            </div>

            <button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="w-full bg-[#d7ae49] text-[#0a192f] font-bold py-3 rounded-xl mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : "Sauvegarder les modifications"}
            </button>
          </div>
        </div>

        {user?.role === "technician" && (
          <div className="mt-8 bg-[#0f2a44] p-6 rounded-2xl border border-white/10 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#fff7ec]">Apercu de mes services</h2>
                <p className="mt-1 text-sm text-[#d7e6f5]">
                  Ajoutez des photos ou des videos qui expliquent clairement vos services. Ces apercus seront visibles par les clients.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenUploadSignal((value) => value + 1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#d7ae49] text-[#0a192f] hover:bg-[#e8c45f] transition"
                title="Ajouter photo ou video"
                aria-label="Ajouter photo ou video"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M4 8h3l1.3-2h7.4L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                </svg>
              </button>
            </div>
            <div className="rounded-xl bg-[#102f4b] p-4 border border-white/10">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#d7ae49]">Contenu public pour les clients</div>
              <p className="text-sm text-[#d7e6f5]">
                Vous pouvez publier des apercus visuels de vos prestations ainsi que vos tarifs pour aider les clients a choisir.
              </p>
            </div>
            <div className="mt-4">
              <ProviderPortfolio openUploadSignal={openUploadSignal} />
            </div>
          </div>
        )}

        {/* Delete Section */}
        <div className="mt-12 p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
          <h2 className="text-red-400 font-bold mb-2">Zone de danger</h2>
          <button 
            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
            className="text-red-400 text-sm underline"
          >
            Supprimer mon compte
          </button>
          
          {showDeleteConfirm && (
            <div className="mt-4 flex gap-4">
              <button onClick={handleDeleteAccount} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm">Confirmer</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="bg-white/10 text-white px-4 py-2 rounded-lg text-sm">Annuler</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default Profile
