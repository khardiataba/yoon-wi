import React, { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import api from "../api"
import GalleryUploader from "./GalleryUploader"
import GalleryViewer from "./GalleryViewer"
import Toast from "./Toast"

const ProviderPortfolio = ({ defaultTab = "view", openUploadSignal = 0 }) => {
  const { user } = useAuth()
  const providerId = user?._id || user?.id || null
  const [gallery, setGallery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [activeTab, setActiveTab] = useState(defaultTab === "upload" ? "upload" : "view") // 'view' or 'upload'
  const [offerings, setOfferings] = useState([])
  const [savingOfferings, setSavingOfferings] = useState(false)

  useEffect(() => {
    if (defaultTab === "upload") {
      setActiveTab("upload")
    }
  }, [defaultTab])

  useEffect(() => {
    if (openUploadSignal > 0) {
      setActiveTab("upload")
    }
  }, [openUploadSignal])

  useEffect(() => {
    if (!providerId) {
      setLoading(false)
      return
    }

    const fetchGallery = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/gallery/provider/${providerId}`)
        setGallery(response.data.gallery)
        setOfferings(Array.isArray(response.data.gallery?.offerings) ? response.data.gallery.offerings : [])
      } catch (err) {
        console.error("Error fetching gallery:", err)
        setError("Erreur lors du chargement de la galerie")
      } finally {
        setLoading(false)
      }
    }

    fetchGallery()
  }, [providerId])

  const handleUploadSuccess = (updatedGallery) => {
    setGallery(updatedGallery)
    setOfferings(Array.isArray(updatedGallery?.offerings) ? updatedGallery.offerings : [])
    setToastMessage("Aperçu ajouté avec succès.")
    setActiveTab("view")
  }

  const handleDeleteItem = async (itemId) => {
    if (!providerId) {
      setToastMessage("Profil prestataire introuvable.")
      return
    }
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet aperçu ?")) return

    try {
      await api.delete(`/gallery/${user._id}/item/${itemId}`)
      setToastMessage("Photo supprimée avec succès")
      // Refetch gallery
      const response = await api.get(`/gallery/provider/${providerId}`)
      setGallery(response.data.gallery)
      setOfferings(Array.isArray(response.data.gallery?.offerings) ? response.data.gallery.offerings : [])
    } catch (err) {
      setToastMessage("Erreur lors de la suppression")
    }
  }

  const addOffering = () => {
    setOfferings((current) => [
      ...current,
      { title: "", description: "", startingPrice: 0, maxPrice: 0, currency: "XOF", unit: "service" }
    ])
  }

  const updateOffering = (index, field, value) => {
    setOfferings((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    )
  }

  const removeOffering = (index) => {
    setOfferings((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const saveOfferings = async () => {
    if (!providerId) {
      setToastMessage("Profil prestataire introuvable.")
      return
    }
    try {
      setSavingOfferings(true)
      const payload = offerings.map((item) => ({
        title: item.title,
        description: item.description,
        startingPrice: Number(item.startingPrice) || 0,
        maxPrice: Number(item.maxPrice) || 0,
        currency: item.currency || "XOF",
        unit: item.unit || "service"
      }))
      const response = await api.put(`/gallery/${providerId}/offerings`, { offerings: payload })
      setGallery(response.data.gallery)
      setOfferings(Array.isArray(response.data.gallery?.offerings) ? response.data.gallery.offerings : [])
      setToastMessage("Tarifs mis à jour.")
    } catch (err) {
      setToastMessage(err.response?.data?.error || "Erreur lors de l'enregistrement des tarifs")
    } finally {
      setSavingOfferings(false)
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
          Galerie ({gallery?.totalImages || 0} éléments)
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`px-4 py-3 font-semibold border-b-2 transition ${
            activeTab === "upload"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Ajouter un aperçu
        </button>
      </div>

      {/* Content */}
      {error && <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {activeTab === "view" ? (
        <div>
          {gallery && gallery.galleryItems && gallery.galleryItems.length > 0 ? (
            <div>
              <GalleryViewer items={gallery.galleryItems} providerName={user?.name} />
              <div className="mt-6 rounded-xl bg-emerald-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-emerald-800">Offres et tarifs prestataire</h3>
                  <button
                    onClick={addOffering}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    + Ajouter une offre
                  </button>
                </div>
                {offerings.length === 0 ? (
                  <p className="text-sm text-emerald-700">Ajoutez vos prestations et vos fourchettes de prix.</p>
                ) : (
                  <div className="space-y-3">
                    {offerings.map((offering, index) => (
                      <div key={`offering-${index}`} className="rounded-lg border border-emerald-200 bg-white p-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input
                            value={offering.title || ""}
                            onChange={(event) => updateOffering(index, "title", event.target.value)}
                            placeholder="Titre (ex: Coupe + brushing)"
                            className="w-full rounded border border-gray-300 p-2 text-sm"
                          />
                          <input
                            value={offering.unit || "service"}
                            onChange={(event) => updateOffering(index, "unit", event.target.value)}
                            placeholder="Unité (service, heure, m2...)"
                            className="w-full rounded border border-gray-300 p-2 text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            value={offering.startingPrice || ""}
                            onChange={(event) => updateOffering(index, "startingPrice", event.target.value)}
                            placeholder="Prix min"
                            className="w-full rounded border border-gray-300 p-2 text-sm"
                          />
                          <input
                            type="number"
                            min="0"
                            value={offering.maxPrice || ""}
                            onChange={(event) => updateOffering(index, "maxPrice", event.target.value)}
                            placeholder="Prix max"
                            className="w-full rounded border border-gray-300 p-2 text-sm"
                          />
                          <input
                            value={offering.currency || "XOF"}
                            onChange={(event) => updateOffering(index, "currency", event.target.value)}
                            placeholder="Devise"
                            className="w-full rounded border border-gray-300 p-2 text-sm"
                          />
                          <button
                            onClick={() => removeOffering(index)}
                            className="rounded bg-red-50 p-2 text-sm font-semibold text-red-600"
                          >
                            Supprimer
                          </button>
                        </div>
                        <textarea
                          value={offering.description || ""}
                          onChange={(event) => updateOffering(index, "description", event.target.value)}
                          placeholder="Description rapide de la prestation..."
                          rows={2}
                          className="mt-2 w-full rounded border border-gray-300 p-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <button
                    onClick={saveOfferings}
                    disabled={savingOfferings}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingOfferings ? "Enregistrement..." : "Enregistrer les tarifs"}
                  </button>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gallery.galleryItems.map((item) => (
                  <div key={item._id} className="relative bg-gray-100 rounded-lg overflow-hidden group">
                    {item.mediaType === "video" || item.videoUrl ? (
                      <video src={item.videoUrl} className="w-full h-48 object-cover" controls playsInline />
                    ) : (
                      <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleDeleteItem(item._id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded transition"
                      >
                        Supprimer
                      </button>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="bg-white/90 text-xs px-2 py-1 rounded">{item.category}</span>
                    </div>
                    {(Number(item?.pricing?.startingPrice || 0) > 0 || Number(item?.pricing?.maxPrice || 0) > 0) && (
                      <div className="absolute bottom-2 left-2 rounded bg-emerald-600/90 px-2 py-1 text-xs font-semibold text-white">
                        {Number(item?.pricing?.startingPrice || 0).toLocaleString()}
                        {Number(item?.pricing?.maxPrice || 0) > Number(item?.pricing?.startingPrice || 0)
                          ? ` - ${Number(item?.pricing?.maxPrice || 0).toLocaleString()}`
                          : ""}
                        {" "}
                        {item?.pricing?.currency || "XOF"}
                      </div>
                    )}
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
                Ajouter un aperçu
              </button>
            </div>
          )}
        </div>
      ) : (
        <GalleryUploader providerId={providerId} onUploadSuccess={handleUploadSuccess} />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  )
}

export default ProviderPortfolio

