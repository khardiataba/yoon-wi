import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supportAPI } from '../api'

const Support = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('other')
  const [priority, setPriority] = useState('normal')
  const [tickets, setTickets] = useState([])
  const [responseDrafts, setResponseDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const fetchTickets = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await supportAPI.fetchTickets()
      setTickets(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les tickets.')
    } finally {
      setLoading(false)
    }
  }

  const createTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Sujet et message doivent etre remplis.')
      return
    }

    try {
      setSending(true)
      setError(null)
      await supportAPI.createTicket(subject.trim(), message.trim(), category, priority)
      setSuccess('Ticket envoye. Nous vous repondrons rapidement.')
      setSubject('')
      setMessage('')
      setCategory('other')
      setPriority('normal')
      fetchTickets()
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible d envoyer le ticket.')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

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
      setError(err.response?.data?.message || 'Impossible d envoyer la réponse.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="ndar-shell space-y-6">
        <header className="ndar-card rounded-[34px] p-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-3 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-[#eef5fb] transition-all hover:bg-white/20"
          >
            ⬅️ Retour
          </button>
          <h1 className="font-['Sora'] text-3xl font-extrabold text-[#16324f]">Support client</h1>
          <p className="mt-2 text-sm text-[#70839a]">Envoyez une demande, consultez son statut et discutez avec l'équipe Yoonbi.</p>
        </header>

        {error && <div className="ndar-card rounded-[24px] bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}
        {success && <div className="ndar-card rounded-[24px] bg-[#eefaf2] px-4 py-3 text-sm text-[#178b55]">{success}</div>}

        <section className="ndar-card rounded-[30px] p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#16324f]">Sujet</label>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="w-full rounded-2xl border border-[#d7e2ec] bg-white px-4 py-3 text-sm text-[#16324f] outline-none focus:border-[#165c96]"
                placeholder="Par exemple: Problème de course"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#16324f]">Catégorie</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-2xl border border-[#d7e2ec] bg-white px-4 py-3 text-sm text-[#16324f] outline-none focus:border-[#165c96]"
              >
                <option value="ride">Course</option>
                <option value="payment">Paiement</option>
                <option value="security">Sécurité</option>
                <option value="technical">Technique</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#16324f]">Priorité</label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full rounded-2xl border border-[#d7e2ec] bg-white px-4 py-3 text-sm text-[#16324f] outline-none focus:border-[#165c96]"
              >
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
                <option value="low">Basse</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#16324f]">Message</label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                className="w-full rounded-[26px] border border-[#d7e2ec] bg-white px-4 py-3 text-sm text-[#16324f] outline-none focus:border-[#165c96]"
                placeholder="Expliquez votre problème ou votre demande en détail"
              />
            </div>
          </div>
          <button
            onClick={createTicket}
            disabled={sending}
            className="mt-5 rounded-2xl bg-[#165c96] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {sending ? 'Envoi...' : 'Envoyer le ticket'}
          </button>
        </section>

        <section className="ndar-card rounded-[30px] p-6">
          <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Tickets support</h2>
          <p className="mt-2 text-sm text-[#70839a]">Suivez l'avancement de vos demandes ou repondez aux conversations en cours.</p>

          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2].map((idx) => (
                <div key={idx} className="h-28 animate-pulse rounded-[24px] bg-[#f8fbff]" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="mt-4 rounded-[24px] bg-[#f8fbff] p-6 text-sm text-[#70839a]">Aucun ticket pour le moment.</div>
          ) : (
            <div className="mt-4 space-y-4">
              {tickets.map((ticket) => (
                <article key={ticket._id} className="rounded-[26px] border border-[#e2eaf2] bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#16324f]">{ticket.subject}</h3>
                      <p className="mt-1 text-sm text-[#70839a]">Categorie: {ticket.category} • Priorité: {ticket.priority}</p>
                    </div>
                    <div className="rounded-full bg-[#edf5fb] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#165c96]">
                      {ticket.status}
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-[#4a5568]">
                    {ticket.messages?.map((msg, index) => (
                      <div key={index} className="rounded-2xl bg-[#f7fafc] p-3">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[#70839a]">
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
    </div>
  )
}

export default Support
