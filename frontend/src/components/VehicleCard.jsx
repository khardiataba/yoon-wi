import React, { useState, useEffect } from "react"
import { resolveMediaUrl } from "../utils/mediaUrl"

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

  const vehicleTypeLabel = vehicle.vehicleType === "small" ? "Petit vehicule" : "Grand vehicule"

  return (
    <div
      onClick={onSelect}
      className="min-w-0 cursor-pointer overflow-hidden rounded-[22px] border border-[#d9e3ef] bg-white shadow-[0_12px_30px_rgba(8,35,62,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(8,35,62,0.1)]"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-[#eaf3fb]">
        <img src={resolveMediaUrl(vehicle.photoUrl)} alt={vehicle.vehicleName} className="w-full h-full object-cover" />
        <div className="absolute right-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-white px-3 py-1 text-xs font-bold text-[#165c96] shadow">
          {vehicleTypeLabel}
        </div>
        {vehicle.rating && (
          <div className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-[#f6d36f] px-3 py-1 text-xs font-bold text-[#5a4210]">
            RATING {vehicle.rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 p-4">
        <h3 className="mb-1 truncate font-['Sora'] text-lg font-bold text-[#16324f]">{vehicle.vehicleName}</h3>
        <p className="mb-2 break-words text-sm text-[#5f7b94]">
          {vehicle.brand} {vehicle.model} ({vehicle.year})
        </p>

        {vehicle.capacity?.passengers && (
          <p className="mb-2 text-sm text-[#5f7b94]">{vehicle.capacity.passengers} passagers</p>
        )}

        {vehicle.features && vehicle.features.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {vehicle.features.slice(0, 2).map((feature, idx) => (
              <span key={idx} className="min-w-0 break-words rounded-full bg-[#eaf3fb] px-2.5 py-1 text-xs font-semibold text-[#165c96]">
                {feature}
              </span>
            ))}
            {vehicle.features.length > 2 && (
              <span className="rounded-full bg-[#f2f6fb] px-2.5 py-1 text-xs font-semibold text-[#5f7b94]">+{vehicle.features.length - 2}</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="mb-3 border-t border-[#e4edf6] pt-3">
          <p className="break-words text-lg font-bold text-[#178b55]">
            {formatPrice(vehicle.pricePerDay)} <span className="text-sm text-[#5f7b94]">/jour</span>
          </p>
          {vehicle.pricePerHour && (
            <p className="break-words text-sm text-[#5f7b94]">{formatPrice(vehicle.pricePerHour)}/heure</p>
          )}
        </div>

        {/* Provider Info */}
        {showProviderInfo && providerInfo && (
          <div className="flex min-w-0 items-center gap-2 border-t border-[#e4edf6] pt-3">
            {providerInfo.profilePhotoUrl && (
              <img src={resolveMediaUrl(providerInfo.profilePhotoUrl)} alt={providerInfo.name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#16324f]">{providerInfo.name}</p>
              {providerInfo.rating && <p className="text-xs text-yellow-600">RATING {providerInfo.rating.toFixed(1)}</p>}
            </div>
          </div>
        )}

        {vehicle.insuranceIncluded && (
          <div className="mt-3 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">Assurance incluse</div>
        )}
      </div>
    </div>
  )
}

export default VehicleCard

