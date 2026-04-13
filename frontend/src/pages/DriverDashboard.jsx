import { useEffect, useMemo, useState } from "react"
import api from "../api"
import { useNavigate } from "react-router-dom"

const formatRideLabel = (ride) => {
  const pickup = ride.pickup?.name || ride.pickup?.address || "Depart"
  const destination = ride.destination?.name || ride.destination?.address || "Destination"
  return `${pickup} → ${destination}`
}

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

const isInLast7Days = (date, now) => {
  const diff = now.getTime() - date.getTime()
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
}

const DriverDashboard = () => {
  const navigate = useNavigate()
  const [available, setAvailable] = useState([])
  const [myRides, setMyRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pinInputs, setPinInputs] = useState({})
  const [actionMessage, setActionMessage] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [busyRideId, setBusyRideId] = useState(null)
  const [sosBusyRideId, setSosBusyRideId] = useState(null)

  const fetchRides = async () => {
    try {
      setLoading(true)
      setError(null)
      const [availRes, mineRes] = await Promise.all([api.get("/rides/available"), api.get("/rides")])
      setAvailable(availRes.data)
      setMyRides(mineRes.data)
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  const acceptRide = async (id) => {
    try {
      setActionError(null)
      setActionMessage(null)
      await api.patch(`/rides/${id}/accept`)
      fetchRides()
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'accepter")
    }
  }

  const startRide = async (id) => {
    const safetyCode = String(pinInputs[id] || "").trim()
    if (!safetyCode) {
      setActionError("Veuillez saisir le code PIN de départ.")
      return
    }

    try {
      setBusyRideId(id)
      setActionError(null)
      setActionMessage(null)
      await api.patch(`/rides/${id}/start`, { safetyCode })
      setActionMessage("Course démarrée avec succès.")
      setPinInputs((current) => ({
        ...current,
        [id]: ""
      }))
      fetchRides()
    } catch (err) {
      setActionError(err.response?.data?.message || "Impossible de démarrer la course")
    } finally {
      setBusyRideId(null)
    }
  }

  const sendRideSOS = async (id) => {
    try {
      setSosBusyRideId(id)
      setActionError(null)
      setActionMessage(null)
      await api.post(`/rides/${id}/safety-report`, {
        type: "sos",
        message: "SOS chauffeur envoye depuis le tableau de bord",
        location: {
          name: "Course chauffeur",
          address: "Support securite"
        }
      })
      setActionMessage("SOS transmis au support sécurité.")
      fetchRides()
    } catch (err) {
      setActionError(err.response?.data?.message || "Impossible d'envoyer le SOS")
    } finally {
      setSosBusyRideId(null)
    }
  }

  useEffect(() => {
    fetchRides()
  }, [])

  const revenue = useMemo(() => {
    const now = new Date()
    return myRides.reduce((acc, ride) => {
      const gross = Number(ride.price) || 0
      const commission = Number(ride.appCommissionAmount) || 0
      const net = Number(ride.providerNetAmount) || Math.max(0, gross - commission)
      const rideDate = ride.createdAt ? new Date(ride.createdAt) : null

      acc.totalGross += gross
      acc.totalCommission += commission
      acc.totalNet += net

      if (rideDate && isSameDay(rideDate, now)) {
        acc.todayNet += net
      }

      if (rideDate && isInLast7Days(rideDate, now)) {
        acc.weekNet += net
      }

      return acc
    }, {
      totalGross: 0,
      totalCommission: 0,
      totalNet: 0,
      todayNet: 0,
      weekNet: 0
    })
  }, [myRides])

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="ndar-shell space-y-4">
        <header className="ndar-card rounded-[34px] p-6">
          <div className="font-['Sora'] text-3xl font-extrabold text-[#16324f]">Dashboard Chauffeur</div>
          <p className="mt-2 text-sm text-[#70839a]">Suivez les courses disponibles et vos trajets en cours avec une vue plus claire.</p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button onClick={() => navigate("/ride")} className="rounded-[22px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-4 py-4 text-left text-white shadow-[0_16px_30px_rgba(8,35,62,0.16)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Action</div>
              <div className="mt-2 font-['Sora'] text-lg font-bold">Nouvelle course</div>
            </button>
            <button onClick={() => navigate("/mybookings")} className="rounded-[22px] bg-[linear-gradient(180deg,#edf5fb_0%,#e4eef7_100%)] px-4 py-4 text-left text-[#16324f]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5f7894]">Suivi</div>
              <div className="mt-2 font-['Sora'] text-lg font-bold">Mes reservations</div>
            </button>
            <button onClick={() => navigate("/app")} className="rounded-[22px] bg-[linear-gradient(180deg,#fff7eb_0%,#f4ead9_100%)] px-4 py-4 text-left text-[#16324f]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6d2f]">Accueil</div>
              <div className="mt-2 font-['Sora'] text-lg font-bold">Explorer l'app</div>
            </button>
            <button onClick={() => navigate("/security-support")} className="rounded-[22px] bg-[linear-gradient(180deg,#fff1f1_0%,#fbe6e6_100%)] px-4 py-4 text-left text-[#a54b55]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c45860]">Urgence</div>
              <div className="mt-2 font-['Sora'] text-lg font-bold">Support sécurité</div>
            </button>
          </div>
        </header>

        {error && <div className="ndar-card rounded-[24px] bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}
        {actionError && <div className="ndar-card rounded-[24px] bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{actionError}</div>}
        {actionMessage && <div className="ndar-card rounded-[24px] bg-[#eefaf2] px-4 py-3 text-sm text-[#178b55]">{actionMessage}</div>}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((item) => <div key={item} className="ndar-card h-28 animate-pulse rounded-[24px]" />)}
          </div>
        ) : (
          <>
            <section className="ndar-card rounded-[30px] p-5">
              <div className="mb-4">
                <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Mes revenus</h2>
                <p className="text-sm text-[#70839a]">Vue rapide de ce que vous gardez et de ce qui revient a l'application.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] bg-[linear-gradient(180deg,#edf5fb_0%,#e3eef8_100%)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f7894]">Total brut</div>
                  <div className="mt-2 font-['Sora'] text-2xl font-bold text-[#1260a1]">{revenue.totalGross.toLocaleString()} F</div>
                </div>
                <div className="rounded-[24px] bg-[linear-gradient(180deg,#fff7eb_0%,#f4ead9_100%)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b6d2f]">Part appliquee</div>
                  <div className="mt-2 font-['Sora'] text-2xl font-bold text-[#a97a18]">{revenue.totalCommission.toLocaleString()} F</div>
                </div>
                <div className="rounded-[24px] bg-[linear-gradient(180deg,#eefaf2_0%,#e3f5ea_100%)] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4e8a67]">Net chauffeur</div>
                  <div className="mt-2 font-['Sora'] text-2xl font-bold text-[#178b55]">{revenue.totalNet.toLocaleString()} F</div>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-white px-4 py-4 shadow-[0_10px_22px_rgba(8,35,62,0.06)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Aujourd'hui</div>
                  <div className="mt-2 font-semibold text-[#16324f]">{revenue.todayNet.toLocaleString()} F net</div>
                </div>
                <div className="rounded-[22px] bg-white px-4 py-4 shadow-[0_10px_22px_rgba(8,35,62,0.06)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">7 derniers jours</div>
                  <div className="mt-2 font-semibold text-[#16324f]">{revenue.weekNet.toLocaleString()} F net</div>
                </div>
              </div>
            </section>

            <section className="ndar-card rounded-[30px] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Courses disponibles</h2>
                  <p className="text-sm text-[#70839a]">{available.length} course(s) en attente autour de vous.</p>
                </div>
                <span className="rounded-full bg-[#edf5fb] px-3 py-2 text-xs font-bold text-[#165c96]">Live</span>
              </div>

              {available.length === 0 ? (
                <div className="rounded-[24px] bg-[#f8fbff] px-5 py-6 text-sm text-[#70839a]">Aucune course disponible pour le moment.</div>
              ) : (
                <div className="space-y-3">
                  {available.map((ride) => (
                    <article key={ride._id} className="rounded-[24px] border border-[#e2eaf2] bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[#16324f]">{ride.vehicleType}</div>
                          <div className="mt-1 text-sm text-[#70839a]">{formatRideLabel(ride)}</div>
                          <div className="mt-2 flex gap-3 text-xs text-[#70839a]">
                            <span>{ride.distanceKm ? `${ride.distanceKm} km` : "Distance en calcul"}</span>
                            <span>{ride.durationMin ? `${ride.durationMin} min` : "Temps estime"}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-[#edf5fb] px-3 py-2 text-[#1260a1]">Commission appli: {ride.appCommissionPercent || 12}% ({(ride.appCommissionAmount || 0).toLocaleString()} F)</span>
                            <span className="rounded-full bg-[#eefaf2] px-3 py-2 text-[#178b55]">Net chauffeur: {(ride.providerNetAmount || Math.max(0, (ride.price || 0) - (ride.appCommissionAmount || 0))).toLocaleString()} F</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-['Sora'] text-xl font-bold text-[#165c96]">{ride.price} F</div>
                          <button onClick={() => acceptRide(ride._id)} className="mt-3 rounded-2xl bg-[#165c96] px-4 py-2 text-sm font-bold text-white">Accepter</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="ndar-card rounded-[30px] p-5">
              <div className="mb-4">
                <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Mes courses</h2>
                <p className="text-sm text-[#70839a]">Historique de vos prises en charge.</p>
              </div>

              {myRides.length === 0 ? (
                <div className="rounded-[24px] bg-[#f8fbff] px-5 py-6 text-sm text-[#70839a]">Aucune course acceptee pour le moment.</div>
              ) : (
                <div className="space-y-3">
                  {myRides.map((ride) => (
                    <article key={ride._id} className="rounded-[24px] border border-[#e2eaf2] bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[#16324f]">{ride.vehicleType}</div>
                          <div className="mt-1 text-sm text-[#70839a]">{formatRideLabel(ride)}</div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-[#edf5fb] px-3 py-2 text-[#1260a1]">Commission appli: {ride.appCommissionPercent || 12}% ({(ride.appCommissionAmount || 0).toLocaleString()} F)</span>
                            <span className="rounded-full bg-[#eefaf2] px-3 py-2 text-[#178b55]">Net chauffeur: {(ride.providerNetAmount || Math.max(0, (ride.price || 0) - (ride.appCommissionAmount || 0))).toLocaleString()} F</span>
                          </div>
                        </div>
                        <span className="rounded-full bg-[#eefaf2] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#178b55]">{ride.status}</span>
                      </div>

                      {ride.status === "accepted" && (
                        <div className="mt-4 rounded-[20px] bg-[linear-gradient(180deg,#f8fbff_0%,#edf5fb_100%)] p-4">
                          <div className="text-sm font-semibold text-[#16324f]">Démarrer avec le code PIN du client</div>
                          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                            <input
                              value={pinInputs[ride._id] || ""}
                              onChange={(event) =>
                                setPinInputs((current) => ({
                                  ...current,
                                  [ride._id]: event.target.value
                                }))
                              }
                              inputMode="numeric"
                              placeholder="Entrer le PIN"
                              className="w-full rounded-2xl border border-[#d7e4ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#1260a1]"
                            />
                            <button
                              onClick={() => startRide(ride._id)}
                              disabled={busyRideId === ride._id}
                              className="rounded-2xl bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {busyRideId === ride._id ? "Vérification..." : "Démarrer"}
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-[#70839a]">
                            La course ne peut commencer que si le PIN transmis par le client est correct.
                          </p>
                        </div>
                      )}

                      {ride.status === "ongoing" && (
                        <div className="mt-4 rounded-[20px] bg-[linear-gradient(180deg,#eefaf2_0%,#e3f5ea_100%)] px-4 py-3 text-sm font-semibold text-[#178b55]">
                          Course en cours. Gardez le trajet dans l'onglet suivi si besoin.
                        </div>
                      )}

                      {(ride.status === "accepted" || ride.status === "ongoing") && (
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                          <button
                            onClick={() => sendRideSOS(ride._id)}
                            disabled={sosBusyRideId === ride._id}
                            className="rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm font-bold text-[#a54b55] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {sosBusyRideId === ride._id ? "Envoi SOS..." : "SOS chauffeur"}
                          </button>
                          <button
                            onClick={() => navigate("/security-support")}
                            className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#1260a1]"
                          >
                            Ouvrir support sécurité
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default DriverDashboard
