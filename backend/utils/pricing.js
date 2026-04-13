const roundToNearestHundred = (value) => Math.max(0, Math.round(value / 100) * 100)

const computeRideFare = (distanceKm = 0, durationMin = 0) => {
  const safeDistance = Math.max(0, Number(distanceKm) || 0)
  const safeDuration = Math.max(0, Number(durationMin) || 0)

  // Based on local market rates and Saint-Louis pricing:
  // economy starts around 500-570 FCFA and then roughly 81-100 FCFA/km.
  // We keep Saint-Louis noticeably softer than the previous app formula.
  const baseFare = 900
  const includedKm = 1.2
  const extraKm = Math.max(0, safeDistance - includedKm)
  const distanceComponent = extraKm * 220
  const timeComponent = safeDuration * 18
  const rawFare = baseFare + distanceComponent + timeComponent

  return Math.max(1200, roundToNearestHundred(rawFare))
}

const attachCommission = (grossAmount, percent) => {
  const safeGross = Math.max(0, Number(grossAmount) || 0)
  const safePercent = Math.max(0, Number(percent) || 0)
  const appCommissionAmount = roundToNearestHundred((safeGross * safePercent) / 100)

  return {
    appCommissionPercent: safePercent,
    appCommissionAmount,
    providerNetAmount: Math.max(0, safeGross - appCommissionAmount)
  }
}

const rideCommission = (price) => attachCommission(price, 12)
// Les services doivent toujours contribuer au moins un petit montant
// pour éviter qu'un petit devis tombe à 0 FCFA après arrondissement.
const serviceCommission = (price) => {
  const commission = attachCommission(price, 1)
  if (commission.appCommissionAmount < 100) {
    return {
      ...commission,
      appCommissionAmount: 100,
      providerNetAmount: Math.max(0, Math.max(0, Number(price) || 0) - 100)
    }
  }
  return commission
}

module.exports = {
  computeRideFare,
  rideCommission,
  serviceCommission
}
