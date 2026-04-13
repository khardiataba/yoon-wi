import React, { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import api from "../api"
import GalleryUploader from "./GalleryUploader"
import GalleryViewer from "./GalleryViewer"
import Toast from "./Toast"

const ProviderPortfolio = () => {
  const { user } = useAuth()
  const [gallery, setGallery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [activeTab, setActiveTab] = useState("view") // 'view' or 'upload'

  useEffect(() => {
    if (!user?._id) return

    const fetchGallery = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/gallery/provider/${user._id}`)
        setGallery(response.data.gallery)
      } catch (err) {
        console.error("Error fetching gallery:", err)
        setError("Erreur lors du chargement de la galerie")
      } finally {
        setLoading(false)
      }
    }

    fetchGallery()
  }, [user?._id])

  const handleUploadSuccess = (updatedGallery) => {
    setGallery(updatedGallery)
    setToastMessage("Photo ajoutée avec succès ! 🎉")
    setActiveTab("view")
  }

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette photo ?")) return

    try {
      await api.delete(`/gallery/${user._id}/item/${itemId}`)
      setToastMessage("Photo supprimée avec succès")
      // Refetch gallery
      const response = await api.get(`/gallery/provider/${user._id}`)
      setGallery(response.data.gallery)
    } catch (err) {
      setToastMessage("Erreur lors de la suppression")
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Chargement de votre galerie...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("view")}
          className={`px-4 py-3 font-semibold border-b-2 transition ${
            activeTab === "view"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          📸 Galerie ({gallery?.totalImages || 0} photos)
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`px-4 py-3 font-semibold border-b-2 transition ${
            activeTab === "upload"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          📤 Ajouter des photos
        </button>
      </div>

      {/* Content */}
      {error && <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {activeTab === "view" ? (
        <div>
          {gallery && gallery.galleryItems && gallery.galleryItems.length > 0 ? (
            <div>
              <GalleryViewer items={gallery.galleryItems} providerName={user?.name} />
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gallery.galleryItems.map((item) => (
                  <div key={item._id} className="relative bg-gray-100 rounded-lg overflow-hidden group">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleDeleteItem(item._id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded transition"
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="bg-white/90 text-xs px-2 py-1 rounded">{item.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-lg">Aucune photo dans votre galerie</p>
              <p className="text-gray-500 text-sm mt-2">Commencez par ajouter des photos de vos services</p>
              <button
                onClick={() => setActiveTab("upload")}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                📤 Ajouter une photo
              </button>
            </div>
          )}
        </div>
      ) : (
        <GalleryUploader providerId={user._id} onUploadSuccess={handleUploadSuccess} />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  )
}

export default ProviderPortfolio
