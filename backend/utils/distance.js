const haversineDistanceKm = (left, right) => {
  if (!left || !right) return null

  const toRadians = (value) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const deltaLat = toRadians((right.lat || 0) - (left.lat || 0))
  const deltaLng = toRadians((right.lng || 0) - (left.lng || 0))
  const leftLat = toRadians(left.lat || 0)
  const rightLat = toRadians(right.lat || 0)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

module.exports = haversineDistanceKm
