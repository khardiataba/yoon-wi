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

const createEmojiIcon = (emoji, background) =>
  L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:999px;background:${background};box-shadow:0 10px 25px rgba(22,50,79,0.18);font-size:18px;border:3px solid #fff;">${emoji}</div>`,
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  })

const pickupIcon = createEmojiIcon("📍", "#165c96")
const destinationIcon = createEmojiIcon("🏁", "#18c56e")
const carIcon = createEmojiIcon("🚗", "#d7ae49")

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
      onSelect({ lat, lng })
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
              icon={createEmojiIcon(marker.emoji || "•", marker.background || "#165c96")}
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
