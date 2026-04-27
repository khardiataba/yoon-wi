import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supportAPI } from '../api'
import useShakeDetection from '../hooks/useShakeDetection'

const SecuritySupport = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('security')
  const [priority, setPriority] = useState('high')
  const [tickets, setTickets] = useState([])
  const [responseDrafts, setResponseDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendingShakeAlert, setSendingShakeAlert] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await supportAPI.fetchTickets()
      // Filtrer uniquement les tickets de sécurité pour les non-admins
      const allTickets = response.data || []
      const securityTickets = allTickets.filter(t => t.category === 'security')
      setTickets(securityTickets)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les tickets.')
    } finally {
      setLoading(false)
    }
  }, [])

  const sendShakeDangerAlert = useCallback(async () => {
    try {
      setSendingShakeAlert(true)
      setError(null)
      await supportAPI.createTicket(
        'SOS secousse détectée',
        "Alerte automatique suite à une secousse détectée. Utilisateur potentiellement en danger immédiat.",
        'security',
        'high'
      )
      setSuccess('Alerte SOS envoyée au support sécurité.')
      fetchTickets()
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'envoyer l'alerte SOS.")
    } finally {
      setSendingShakeAlert(false)
    }
  }, [fetchTickets])

  const { shakeDetected, countdown, clearShake, confirmShake } = useShakeDetection(sendShakeDangerAlert)

  const createTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Sujet et message doivent être remplis.')
      return
    }

    try {
      setSending(true)
      setError(null)
      await supportAPI.createTicket(subject.trim(), message.trim(), category, priority)
      setSuccess('Ticket sécurité envoyé. Notre équipe revient vers vous rapidement.')
      setSubject('')
      setMessage('')
      setCategory('security')
      setPriority('high')
      fetchTickets()
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'envoyer le ticket.")
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const handleRespond = async (ticketId) => {
    const responseText = (responseDrafts[ticketId] || '').trim()
    if (!responseText) {
      setError('Veuillez saisir un message avant de répondre.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await supportAPI.respondTicket(ticketId, responseText)
      setSuccess('Réponse envoyée avec succès.')
      setResponseDrafts((prev) => ({ ...prev, [ticketId]: '' }))
      fetchTickets()
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'envoyer la réponse.")
    } finally {
      setLoading(false)
    }
  }

  const quickSubjects = [
    { label: 'Signalement incident', value: 'Signalement incident durant un trajet' },
    { label: 'Compte suspendu', value: 'Mon compte est suspendu pour raison de sécurité' },
    { label: 'SOS suivi', value: 'Suivi de mon alerte SOS précédente' },
    { label: 'Code sécurité', value: 'Problème avec le code de sécurité' },
    { label: 'Autre urgence', value: 'Autre problème de sécurité urgent' },
  ]

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="ndar-shell space-y-6">
        {/* Header */}
        <header className="ndar-card rounded-[34px] p-6 border border-[#f0b0b0] bg-[linear-gradient(180deg,#fff5f5_0%,#fef0f0_100%)]">
          <button
            onClick={() => navigate(-1)}
            className="mb-3 inline-flex items-center gap-2 rounded-2xl bg-white/60 px-4 py-2 text-sm font-semibold text-[#a54b55] transition-all hover:bg-white"
          >
            ⬅️ Retour
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1f1] text-2xl shadow-sm">
              🛡️
            </div>
            <div>
              <h1 className="font-['Sora'] text-3xl font-extrabold text-[#16324f]">Support sécurité</h1>
              <p className="mt-1 text-sm text-[#a54b55]">Signalements SOS, incidents et demandes de sécurité prioritaires.</p>
            </div>
          </div>
        </header>

        {/* Alertes rapides */}
        <section className="ndar-card rounded-[30px] border border-[#f0b0b0] bg-[linear-gradient(180deg,#fff1f1_0%,#fbe6e6_100%)] p-6">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h2 className="font-['Sora'] text-lg font-bold text-[#a54b55]">Urgence immédiate ?</h2>
              <p className="text-sm text-[#a54b55]">
                En cas de danger imminent, utilisez le bouton SOS dans l'écran de suivi de course ou de mission. Si vous n'avez pas accès au suivi, appelez les secours directement.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-white p-4">
            <h3 className="font-semibold text-[#a54b55]">Mode sécurité par secousse</h3>
            <p className="mt-1 text-sm text-[#5f7184]">
              Secouez fortement le téléphone 3 fois. Une fenêtre d'urgence apparaît et vous pouvez cliquer pour confirmer le danger.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={confirmShake}
                disabled={sendingShakeAlert}
                className="rounded-xl bg-[#a54b55] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {sendingShakeAlert ? 'Envoi SOS...' : 'Je suis en danger'}
              </button>
              <button
                type="button"
                onClick={clearShake}
                className="rounded-xl border border-[#d8c0c0] px-4 py-2 text-sm font-semibold text-[#a54b55]"
              >
                Annuler alerte
              </button>
            </div>
          </div>
        </section>

        {error && <div className="ndar-card rounded-[24px] bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}
        {success && <div className="ndar-card rounded-[24px] bg-[#eefaf2] px-4 py-3 text-sm text-[#178b55]">{success}</div>}

        {/* Formulaire ticket sécurité */}
        <section className="ndar-card rounded-[30px] p-6">
          <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Nouveau signalement</h2>
          <p className="mt-2 text-sm text-[#5a8fd1]">Décrivez votre incident ou votre demande de sécurité. Les tickets sécurité sont traités en priorité.</p>

          {/* Sujets rapides */}
          <div className="mt-4 flex flex-wrap gap-2">
            {quickSubjects.map((qs) => (
              <button
                key={qs.label}
                type="button"
                onClick={() => setSubject(qs.value)}
                className={`rounded-2xl border px-4 py-2 text-xs font-semibold transition-all ${
                  subject === qs.value
                    ? 'border-[#1260a1] bg-[#edf5fb] text-[#1260a1]'
                    : 'border-[#e2eaf2] bg-white text-[#5a8fd1] hover:border-[#1260a1]/40'
                }`}
              >
                {qs.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#16324f]">Sujet</label>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="w-full rounded-2xl border border-[#d7e2ec] bg-white px-4 py-3 text-sm text-[#16324f] outline-none focus:border-[#165c96]"
                placeholder="Ex: Signalement incident durant un trajet"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#16324f]">Priorité</label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full rounded-2xl border border-[#d7e2ec] bg-white px-4 py-3 text-sm text-[#16324f] outline-none focus:border-[#165c96]"
              >
                <option value="high">Haute (urgence)</option>
                <option value="normal">Normale</option>
                <option value="low">Basse</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#16324f]">Détail de l'incident</label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                className="w-full rounded-[26px] border border-[#d7e2ec] bg-white px-4 py-3 text-sm text-[#16324f] outline-none focus:border-[#165c96]"
                placeholder="Décrivez ce qui s'est passé, quand, et toute information utile pour l'équipe sécurité..."
              />
            </div>
          </div>
          <button
            onClick={createTicket}
            disabled={sending}
            className="mt-5 rounded-2xl bg-[linear-gradient(135deg,#a54b55_0%,#7a2e36_100%)] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(165,75,85,0.28)] disabled:opacity-50"
          >
            {sending ? 'Envoi...' : 'Envoyer le signalement'}
          </button>
        </section>

        {/* Historique tickets sécurité */}
        <section className="ndar-card rounded-[30px] p-6">
          <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Mes signalements sécurité</h2>
          <p className="mt-2 text-sm text-[#5a8fd1]">Suivez l'avancement de vos demandes et continuez la conversation.</p>

          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2].map((idx) => (
                <div key={idx} className="h-28 animate-pulse rounded-[24px] bg-[#f8fbff]" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="mt-4 rounded-[24px] bg-[#f8fbff] p-6 text-sm text-[#5a8fd1]">
              Aucun signalement sécurité pour le moment.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {tickets.map((ticket) => (
                <article key={ticket._id} className="rounded-[26px] border border-[#e2eaf2] bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#16324f]">{ticket.subject}</h3>
                      <p className="mt-1 text-sm text-[#5a8fd1]">
                        Catégorie: {ticket.category} • Priorité: {ticket.priority}
                      </p>
                    </div>
                    <div className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] ${
                      ticket.status === 'open' ? 'bg-[#fff1f1] text-[#a54b55]' :
                      ticket.status === 'resolved' ? 'bg-[#eefaf2] text-[#178b55]' :
                      'bg-[#edf5fb] text-[#165c96]'
                    }`}>
                      {ticket.status}
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-[#4a5568]">
                    {ticket.messages?.map((msg, index) => (
                      <div key={index} className="rounded-2xl bg-[#f7fafc] p-3">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[#5a8fd1]">
                          <span>{msg.senderRole === 'admin' ? 'Support' : 'Client'}</span>
                          <span>{new Date(msg.createdAt || ticket.updatedAt).toLocaleString('fr-FR')}</span>
                        </div>
                        <p className="mt-2 text-sm text-[#334155]">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                  {user?.role === 'admin' && (
                    <div className="mt-4 rounded-[26px] border border-[#cbd5e1] bg-[#f8fafc] p-4">
                      <label className="text-sm font-semibold text-[#16324f]">Répondre à ce ticket</label>
                      <textarea
                        value={responseDrafts[ticket._id] || ''}
                        onChange={(event) => setResponseDrafts((prev) => ({ ...prev, [ticket._id]: event.target.value }))}
                        className="mt-3 h-28 w-full rounded-[24px] border border-[#cbd5e1] bg-white px-4 py-3 text-sm text-[#16324f] outline-none focus:border-[#165c96]"
                        placeholder="Rédigez votre réponse"
                      />
                      <button
                        type="button"
                        onClick={() => handleRespond(ticket._id)}
                        className="mt-3 rounded-3xl bg-[#165c96] px-5 py-3 text-sm font-bold text-white"
                      >
                        Envoyer la réponse
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      {shakeDetected && (
        <div className="fixed bottom-24 left-4 right-4 z-50">
          <div className="rounded-2xl bg-[#a54b55] p-4 text-center text-white shadow-2xl">
            <div className="text-lg font-bold">Secousse détectée</div>
            <p className="mt-1 text-sm">Appuyez sur le bouton danger ou un SOS partira automatiquement dans {countdown}s.</p>
            <div className="mt-3 flex justify-center gap-3">
              <button
                type="button"
                onClick={confirmShake}
                className="rounded-xl bg-white px-4 py-2 font-bold text-[#a54b55]"
              >
                Confirmer danger
              </button>
              <button
                type="button"
                onClick={clearShake}
                className="rounded-xl bg-white/20 px-4 py-2 font-semibold text-white"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SecuritySupport

