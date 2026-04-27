import { useEffect, useMemo } from "react"
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
})

const iconSvgByType = {
  pin: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2"><path d="M12 21s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>',
  flag: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2"><path d="M4 3v18"/><path d="M4 4h11l-2 4 2 4H4"/></svg>',
  car: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2"><path d="M3 13l2-5h14l2 5v5h-2v-2H5v2H3z"/><circle cx="7" cy="16" r="1.5"/><circle cx="17" cy="16" r="1.5"/></svg>',
  dot: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><circle cx="12" cy="12" r="4"/></svg>'
}

const resolveIconType = (value) => {
  const normalized = String(value || "").trim().toLowerCase()
  if (!normalized) return "dot"
  if (normalized.includes("pin")) return "pin"
  if (normalized.includes("flag")) return "flag"
  if (normalized.includes("car")) return "car"
  return "dot"
}

const createMapIcon = (iconType, background) =>
  L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:999px;background:${background};box-shadow:0 10px 25px rgba(22,50,79,0.18);border:3px solid #fff;">${iconSvgByType[resolveIconType(iconType)] || iconSvgByType.dot}</div>`,
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  })

const pickupIcon = createMapIcon("pin", "#165c96")
const destinationIcon = createMapIcon("flag", "#18c56e")
const carIcon = createMapIcon("car", "#d7ae49")

const reverseGeocodeLocation = async (lat, lng) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    })
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status ${response.status}`)
    }
    const data = await response.json()
    const address = String(data?.display_name || "").trim()
    return {
      name: address || `Point GPS ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
      address: address || ""
    }
  } catch {
    return {
      name: `Point GPS ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
      address: ""
    }
  }
}

const ChangeView = ({ center, pickup, destination, routeGeometry }) => {
  const map = useMap()

  useEffect(() => {
    if (Array.isArray(routeGeometry) && routeGeometry.length > 1) {
      map.fitBounds(routeGeometry, { padding: [36, 36] })
      return
    }

    if (pickup && destination) {
      map.fitBounds(
        [
          [pickup.lat, pickup.lng],
          [destination.lat, destination.lng]
        ],
        { padding: [36, 36] }
      )
      return
    }

    if (center) {
      map.setView([center.lat, center.lng], 14)
    }
  }, [center, destination, map, pickup, routeGeometry])

  return null
}

const LocationMarker = ({ onSelect, disabled }) => {
  useMapEvents({
    async click(event) {
      if (disabled || !onSelect) return
      const { lat, lng } = event.latlng
      const geocoded = await reverseGeocodeLocation(lat, lng)
      onSelect({
        lat,
        lng,
        ...geocoded
      })
    }
  })

  return null
}

const MapPicker = ({
  center,
  onSelectPickup,
  onSelectDestination,
  initialPickup,
  initialDestination,
  driverPosition,
  routeGeometry,
  readOnly = false,
  selectionMode = "pickup",
  extraMarkers = []
}) => {
  const markers = useMemo(
    () => ({
      pickup: initialPickup || null,
      destination: initialDestination || null
    }),
    [initialDestination, initialPickup]
  )

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px]">
      {!readOnly && (
        <div className="absolute left-1/2 top-3 z-[1001] -translate-x-1/2 rounded-full bg-white/92 px-4 py-2 text-[11px] font-semibold text-[#165c96] shadow-lg backdrop-blur">
          {selectionMode === "pickup" ? "Touchez la carte pour choisir le depart" : "Touchez la carte pour choisir la destination"}
        </div>
      )}

      <MapContainer
        center={center ? [center.lat, center.lng] : [16.0244, -16.5015]}
        zoom={14}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />

        <ChangeView center={center} pickup={markers.pickup} destination={markers.destination} routeGeometry={routeGeometry} />

        {driverPosition && (
          <Marker position={[driverPosition.lat, driverPosition.lng]} icon={carIcon} />
        )}

        {Array.isArray(routeGeometry) && routeGeometry.length > 1 && (
          <Polyline positions={routeGeometry} pathOptions={{ color: "#165c96", weight: 6, opacity: 0.88 }} />
        )}

        {markers.pickup && <Marker position={[markers.pickup.lat, markers.pickup.lng]} icon={pickupIcon} />}
        {markers.destination && <Marker position={[markers.destination.lat, markers.destination.lng]} icon={destinationIcon} />}

        {Array.isArray(extraMarkers) &&
          extraMarkers.map((marker) => (
            <Marker
              key={marker.id || `${marker.lat}-${marker.lng}`}
              position={[marker.lat, marker.lng]}
              icon={createMapIcon(marker.icon || marker.emoji || "dot", marker.background || "#165c96")}
              title={marker.label || marker.name || "Prestataire"}
            />
          ))}

        <LocationMarker
          disabled={readOnly}
          onSelect={(location) => {
            if (selectionMode === "pickup") {
              if (onSelectPickup) onSelectPickup(location)
              return
            }
            if (onSelectDestination) onSelectDestination(location)
          }}
        />
      </MapContainer>

      <div className="absolute bottom-3 right-4 z-[1001] rounded-full bg-white/82 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#165c96] backdrop-blur">
        Yoonbi Maps
      </div>
    </div>
  )
}

export default MapPicker
