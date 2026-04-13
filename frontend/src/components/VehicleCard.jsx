import React, { useState, useEffect } from "react"
import api from "../api"

const VehicleCard = ({ vehicle, onSelect, showProviderInfo = false }) => {
  const [providerInfo, setProviderInfo] = useState(null)

  useEffect(() => {
    if (showProviderInfo && vehicle.provider) {
      setProviderInfo(vehicle.provider)
    }
  }, [vehicle, showProviderInfo])

  const formatPrice = (price) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0
    }).format(price)
  }

  const vehicleTypeLabel = vehicle.vehicleType === "small" ? "🏍️ Petit véhicule" : "🚐 Grand véhicule"

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer overflow-hidden"
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        <img src={vehicle.photoUrl} alt={vehicle.vehicleName} className="w-full h-full object-cover" />
        <div className="absolute top-2 right-2 bg-white rounded-full px-3 py-1 text-sm font-semibold shadow">
          {vehicleTypeLabel}
        </div>
        {vehicle.rating && (
          <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 rounded-full px-3 py-1 text-sm font-semibold">
            ⭐ {vehicle.rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1">{vehicle.vehicleName}</h3>
        <p className="text-sm text-gray-500 mb-2">
          {vehicle.brand} {vehicle.model} ({vehicle.year})
        </p>

        {vehicle.capacity?.passengers && (
          <p className="text-sm text-gray-600 mb-2">👥 {vehicle.capacity.passengers} passagers</p>
        )}

        {vehicle.features && vehicle.features.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {vehicle.features.slice(0, 2).map((feature, idx) => (
              <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {feature}
              </span>
            ))}
            {vehicle.features.length > 2 && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">+{vehicle.features.length - 2}</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="border-t pt-2 mb-3">
          <p className="text-lg font-bold text-green-600">
            {formatPrice(vehicle.pricePerDay)} <span className="text-sm text-gray-600">/jour</span>
          </p>
          {vehicle.pricePerHour && (
            <p className="text-sm text-gray-600">{formatPrice(vehicle.pricePerHour)}/heure</p>
          )}
        </div>

        {/* Provider Info */}
        {showProviderInfo && providerInfo && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {providerInfo.profilePhotoUrl && (
              <img src={providerInfo.profilePhotoUrl} alt={providerInfo.name} className="w-8 h-8 rounded-full" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm">{providerInfo.name}</p>
              {providerInfo.rating && <p className="text-xs text-yellow-600">⭐ {providerInfo.rating.toFixed(1)}</p>}
            </div>
          </div>
        )}

        {vehicle.insuranceIncluded && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded px-2 py-1 text-xs text-green-700">
            ✅ Assurance incluse
          </div>
        )}
      </div>
    </div>
  )
}

export default VehicleCard
