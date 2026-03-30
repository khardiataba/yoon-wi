import { useEffect, useMemo, useState } from "react"
import api from "../api"
import { useNavigate } from "react-router-dom"

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

const isInLast7Days = (date, now) => {
  const diff = now.getTime() - date.getTime()
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
}

const TechnicianDashboard = () => {
  const navigate = useNavigate()
  const [available, setAvailable] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const [availRes, mineRes] = await Promise.all([api.get("/services/available"), api.get("/services")])
      setAvailable(availRes.data)
      setMyRequests(mineRes.data)
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  const acceptRequest = async (id) => {
    try {
      await api.patch(`/services/${id}/accept`)
      fetchRequests()
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'accepter")
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const revenue = useMemo(() => {
    const now = new Date()
    return myRequests.reduce((acc, req) => {
      const gross = Number(req.price) || 0
      const commission = Number(req.appCommissionAmount) || 0
      const net = Number(req.providerNetAmount) || Math.max(0, gross - commission)
      const requestDate = req.createdAt ? new Date(req.createdAt) : null

      acc.totalGross += gross
      acc.totalCommission += commission
      acc.totalNet += net

      if (requestDate && isSameDay(requestDate, now)) {
        acc.todayNet += net
      }

      if (requestDate && isInLast7Days(requestDate, now)) {
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
  }, [myRequests])

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="ndar-shell space-y-4">
        <header className="ndar-card rounded-[34px] p-6">
          <div className="font-['Sora'] text-3xl font-extrabold text-[#16324f]">Dashboard Prestataire</div>
          <p className="mt-2 text-sm text-[#70839a]">Consultez les demandes disponibles et suivez vos interventions acceptees.</p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button onClick={() => navigate("/service")} className="rounded-[22px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-4 py-4 text-left text-white shadow-[0_16px_30px_rgba(8,35,62,0.16)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Action</div>
              <div className="mt-2 font-['Sora'] text-lg font-bold">Nouvelle demande</div>
            </button>
            <button onClick={() => navigate("/mybookings")} className="rounded-[22px] bg-[linear-gradient(180deg,#edf5fb_0%,#e4eef7_100%)] px-4 py-4 text-left text-[#16324f]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5f7894]">Suivi</div>
              <div className="mt-2 font-['Sora'] text-lg font-bold">Mes reservations</div>
            </button>
            <button onClick={() => navigate("/app")} className="rounded-[22px] bg-[linear-gradient(180deg,#fff7eb_0%,#f4ead9_100%)] px-4 py-4 text-left text-[#16324f]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6d2f]">Accueil</div>
              <div className="mt-2 font-['Sora'] text-lg font-bold">Explorer l'app</div>
            </button>
          </div>
        </header>

        {error && <div className="ndar-card rounded-[24px] bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((item) => <div key={item} className="ndar-card h-28 animate-pulse rounded-[24px]" />)}
          </div>
        ) : (
          <>
            <section className="ndar-card rounded-[30px] p-5">
              <div className="mb-4">
                <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Mes revenus</h2>
                <p className="text-sm text-[#70839a]">Vue rapide de vos gains, de la part appliquee et de votre net.</p>
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
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4e8a67]">Net prestataire</div>
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
              <div className="mb-4">
                <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Demandes disponibles</h2>
                <p className="text-sm text-[#70839a]">{available.length} demande(s) en attente de prise en charge.</p>
              </div>

              {available.length === 0 ? (
                <div className="rounded-[24px] bg-[#f8fbff] px-5 py-6 text-sm text-[#70839a]">Aucune demande disponible pour le moment.</div>
              ) : (
                <div className="space-y-3">
                  {available.map((req) => (
                    <article key={req._id} className="rounded-[24px] border border-[#e2eaf2] bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold capitalize text-[#16324f]">{req.category}</div>
                          <div className="mt-1 text-sm text-[#70839a]">{req.title || req.description}</div>
                          <div className="mt-2 text-xs text-[#70839a]">{req.price ? `${req.price} F` : "Budget a confirmer"}</div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-[#edf5fb] px-3 py-2 text-[#1260a1]">Commission appli: {req.appCommissionPercent || 15}% ({(req.appCommissionAmount || 0).toLocaleString()} F)</span>
                            <span className="rounded-full bg-[#eefaf2] px-3 py-2 text-[#178b55]">Net prestataire: {(req.providerNetAmount || Math.max(0, (req.price || 0) - (req.appCommissionAmount || 0))).toLocaleString()} F</span>
                          </div>
                        </div>
                        <button onClick={() => acceptRequest(req._id)} className="rounded-2xl bg-[#18c56e] px-4 py-2 text-sm font-bold text-white">Accepter</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="ndar-card rounded-[30px] p-5">
              <div className="mb-4">
                <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Mes missions</h2>
                <p className="text-sm text-[#70839a]">Demandes que vous avez recues ou acceptees.</p>
              </div>

              {myRequests.length === 0 ? (
                <div className="rounded-[24px] bg-[#f8fbff] px-5 py-6 text-sm text-[#70839a]">Aucune mission pour le moment.</div>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((req) => (
                    <article key={req._id} className="rounded-[24px] border border-[#e2eaf2] bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold capitalize text-[#16324f]">{req.category}</div>
                          <div className="mt-1 text-sm text-[#70839a]">{req.title || req.description}</div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-[#edf5fb] px-3 py-2 text-[#1260a1]">Commission appli: {req.appCommissionPercent || 15}% ({(req.appCommissionAmount || 0).toLocaleString()} F)</span>
                            <span className="rounded-full bg-[#eefaf2] px-3 py-2 text-[#178b55]">Net prestataire: {(req.providerNetAmount || Math.max(0, (req.price || 0) - (req.appCommissionAmount || 0))).toLocaleString()} F</span>
                          </div>
                        </div>
                        <span className="rounded-full bg-[#eefaf2] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#178b55]">{req.status}</span>
                      </div>
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

export default TechnicianDashboard
