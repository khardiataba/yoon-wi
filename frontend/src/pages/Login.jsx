import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { readAuthDraft } from "../authDraft"

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    setDraft(readAuthDraft())
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await login(email, password)
      navigate("/")
    } catch (loginError) {
      console.error("Erreur de connexion:", loginError)
      setError(loginError.userMessage || "Connexion impossible pour le moment.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="ndar-shell space-y-4">
        <div className="rounded-[38px] border border-[#0b3154] bg-[linear-gradient(180deg,#0d416e_0%,#072a48_100%)] p-6 text-center shadow-[0_24px_60px_rgba(8,35,62,0.30)]">
          <div className="mx-auto inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#f6d59a]">
            Retour dans votre espace
          </div>
          <div className="mt-4 font-['Sora'] text-[40px] font-extrabold text-white">
            Yoonbi
          </div>
          <p className="mt-3 text-sm text-[#eaf3fb]">Connectez-vous pour reprendre vos trajets, vos commandes et votre activite.</p>
        </div>

        <form onSubmit={handleSubmit} className="ndar-card rounded-[38px] p-6">
          <div className="ndar-chip">Connexion securisee</div>
          <h1 className="mt-4 font-['Sora'] text-3xl font-extrabold text-[#16324f]">Connexion</h1>
          {draft?.firstName && (
            <p className="mt-2 text-sm text-[#70839a]">
              Bonjour {draft.firstName} {draft.lastName}, on reprend votre espace {draft.role === "client" ? "client" : draft.role === "provider" ? "prestataire" : "chauffeur"}.
            </p>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Email</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
                className="w-full rounded-2xl border border-[#e1d8cc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-3 outline-none focus:border-[#1260a1]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Mot de passe</label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                required
                className="w-full rounded-2xl border border-[#e1d8cc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-3 outline-none focus:border-[#1260a1]"
              />
            </div>
          </div>

          {error && <div className="mt-4 rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-[26px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_22px_40px_rgba(8,35,62,0.22)] disabled:opacity-70"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <p className="mt-5 text-sm text-[#70839a]">
            Nouveau sur l'app ? <Link to="/" className="font-semibold text-[#165c96]">Commencer ici</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default Login
