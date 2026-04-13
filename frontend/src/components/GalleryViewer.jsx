import React, { useState } from "react"

const GalleryViewer = ({ items = [], providerName = "Service Provider" }) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState("all")

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Aucune photo disponible pour le moment</p>
      </div>
    )
  }

  // Filter items by category
  const filteredItems = selectedCategory === "all" ? items : items.filter((item) => item.category === selectedCategory)

  // Unique categories
  const categories = ["all", ...new Set(items.map((item) => item.category))]

  const currentItem = filteredItems[selectedIndex]

  const getCategoryLabel = (category) => {
    const labels = {
      all: "Tous",
      work: "Travaux réalisés",
      portfolio: "Portfolio",
      "before-after": "Avant/Après",
      team: "Équipe",
      facility: "Installations"
    }
    return labels[category] || category
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Main Image Viewer */}
      <div className="bg-black relative">
        <div className="aspect-video flex items-center justify-center bg-gray-900">
          {currentItem.beforeAfter &&
          currentItem.beforeAfter.beforeUrl &&
          currentItem.beforeAfter.afterUrl ? (
            <div className="w-full h-full flex">
              {/* Before Image */}
              <div className="w-1/2 relative">
                <img src={currentItem.beforeAfter.beforeUrl} alt="Avant" className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded text-sm font-semibold">
                  Avant
                </div>
              </div>
              {/* After Image */}
              <div className="w-1/2 relative">
                <img src={currentItem.beforeAfter.afterUrl} alt="Après" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded text-sm font-semibold">
                  Après
                </div>
              </div>
            </div>
          ) : (
            <img src={currentItem.imageUrl} alt={currentItem.title} className="w-full h-full object-cover" />
          )}

          {/* Navigation Buttons */}
          {filteredItems.length > 1 && (
            <>
              <button
                onClick={() => setSelectedIndex((prev) => (prev === 0 ? filteredItems.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-2 rounded-full transition"
              >
                ❮
              </button>
              <button
                onClick={() => setSelectedIndex((prev) => (prev === filteredItems.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-2 rounded-full transition"
              >
                ❯
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded text-sm">
            {selectedIndex + 1} / {filteredItems.length}
          </div>
        </div>
      </div>

      {/* Image Info */}
      <div className="p-4 border-b">
        <h3 className="font-bold text-lg mb-1">{currentItem.title}</h3>
        {currentItem.description && <p className="text-gray-600 text-sm mb-2">{currentItem.description}</p>}

        {/* Tags */}
        {currentItem.tags && currentItem.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {currentItem.tags.map((tag, idx) => (
              <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="px-4 py-3 border-b bg-gray-50 flex gap-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category)
                setSelectedIndex(0)
              }}
              className={`whitespace-nowrap px-3 py-1 rounded text-sm font-medium transition ${
                selectedCategory === category ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {getCategoryLabel(category)}
            </button>
          ))}
        </div>
      )}

      {/* Thumbnail Strip */}
      {filteredItems.length > 1 && (
        <div className="p-3 bg-gray-100 overflow-x-auto">
          <div className="flex gap-2">
            {filteredItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition ${
                  selectedIndex === idx ? "border-blue-600" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <img
                  src={item.thumbnailUrl || item.imageUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default GalleryViewer
