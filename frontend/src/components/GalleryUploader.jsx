import React, { useState, useCallback } from "react"
import api from "../api"

const GalleryUploader = ({ providerId, onUploadSuccess }) => {
  const [uploadedItems, setUploadedItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadMode, setUploadMode] = useState("single") // 'single' or 'before-after'
  const [itemDetails, setItemDetails] = useState({
    title: "",
    description: "",
    category: "work",
    tags: ""
  })

  const handleFileChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files || [])
      setUploadedItems(files)
      setError(null)
    },
    []
  )

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setItemDetails((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const uploadSingle = async () => {
    if (!uploadedItems.length) {
      setError("Veuillez sélectionner une image")
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("image", uploadedItems[0])
      formData.append("title", itemDetails.title || "Sans titre")
      formData.append("description", itemDetails.description)
      formData.append("category", itemDetails.category)
      formData.append("tags", itemDetails.tags)

      const response = await api.post(`/gallery/${providerId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })

      if (response.data.success) {
        setUploadedItems([])
        setItemDetails({ title: "", description: "", category: "work", tags: "" })
        if (onUploadSuccess) {
          onUploadSuccess(response.data.gallery)
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'upload")
    } finally {
      setIsLoading(false)
    }
  }

  const uploadBeforeAfter = async () => {
    if (uploadedItems.length < 2) {
      setError("Veuillez sélectionner deux images (avant et après)")
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("images", uploadedItems[0]) // Before
      formData.append("images", uploadedItems[1]) // After
      formData.append("title", itemDetails.title || "Avant/Après")
      formData.append("description", itemDetails.description)
      formData.append("tags", itemDetails.tags)

      const response = await api.post(`/gallery/${providerId}/upload-before-after`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })

      if (response.data.success) {
        setUploadedItems([])
        setItemDetails({ title: "", description: "", category: "work", tags: "" })
        if (onUploadSuccess) {
          onUploadSuccess(response.data.gallery)
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'upload")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="font-bold text-xl mb-4">📸 Ajouter des photos à votre galerie</h3>

      {/* Mode Selection */}
      <div className="flex gap-4 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value="single"
            checked={uploadMode === "single"}
            onChange={(e) => {
              setUploadMode(e.target.value)
              setUploadedItems([])
            }}
          />
          <span>📷 Photo simple</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value="before-after"
            checked={uploadMode === "before-after"}
            onChange={(e) => {
              setUploadMode(e.target.value)
              setUploadedItems([])
            }}
          />
          <span>🔄 Avant/Après</span>
        </label>
      </div>

      {/* File Input */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2">
          {uploadMode === "before-after" ? "Sélectionner 2 images" : "Sélectionner une image"}
        </label>
        <input
          type="file"
          multiple={uploadMode === "before-after"}
          accept="image/*"
          onChange={handleFileChange}
          className="w-full p-2 border border-gray-300 rounded"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, WebP, GIF | Max 10MB</p>
      </div>

      {/* Details Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-1">Titre</label>
          <input
            type="text"
            name="title"
            value={itemDetails.title}
            onChange={handleInputChange}
            placeholder="Ex: Rénovation salon"
            className="w-full p-2 border border-gray-300 rounded"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Description</label>
          <textarea
            name="description"
            value={itemDetails.description}
            onChange={handleInputChange}
            placeholder="Décrivez le travail ou le service..."
            rows={3}
            className="w-full p-2 border border-gray-300 rounded"
            disabled={isLoading}
          />
        </div>

        {uploadMode === "single" && (
          <div>
            <label className="block text-sm font-semibold mb-1">Catégorie</label>
            <select
              name="category"
              value={itemDetails.category}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded"
              disabled={isLoading}
            >
              <option value="work">Travaux réalisés</option>
              <option value="portfolio">Portfolio</option>
              <option value="team">Équipe</option>
              <option value="facility">Installations</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-1">Tags (séparés par des virgules)</label>
          <input
            type="text"
            name="tags"
            value={itemDetails.tags}
            onChange={handleInputChange}
            placeholder="Ex: menuiserie, bois, projet"
            className="w-full p-2 border border-gray-300 rounded"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {/* Preview */}
      {uploadedItems.length > 0 && (
        <div className="mb-6 bg-gray-50 p-4 rounded">
          <p className="text-sm font-semibold mb-2">Aperçu:</p>
          <div className="flex gap-2 overflow-x-auto">
            {uploadedItems.map((file, idx) => (
              <div key={idx} className="flex-shrink-0">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${idx + 1}`}
                  className="h-24 w-24 object-cover rounded"
                />
                <p className="text-xs text-gray-600 mt-1">{uploadMode === "before-after" ? (idx === 0 ? "Avant" : "Après") : "Image"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <button
        onClick={uploadMode === "before-after" ? uploadBeforeAfter : uploadSingle}
        disabled={isLoading || uploadedItems.length === 0}
        className={`w-full py-3 rounded font-semibold transition ${
          isLoading || uploadedItems.length === 0
            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {isLoading ? "Upload en cours..." : "🚀 Uploader"}
      </button>
    </div>
  )
}

export default GalleryUploader
