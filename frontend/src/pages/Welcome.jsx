import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { saveAuthDraft } from "../authDraft"

const roleOptions = [
  {
    value: "client",
    label: "Client",
    title: "Je reserve une course",
    description: "Vous accedez directement a la carte, au calcul d'itineraire et a la reservation moderne et intuitive."
  },
  {
    value: "provider",
    label: "Prestataire",
    title: "Je propose un service",
    description: "Vous pourrez repondre a plusieurs questions sur votre activite, vos disponibilites et votre zone."
  },
  {
    value: "driver",
    label: "Chauffeur",
    title: "Je conduis",
    description: "Vous pourrez renseigner votre vehicule, votre zone et vos horaires avant validation."
  },
  {
    value: "other",
    label: "Autres",
    title: "Je propose une autre activite",
    description: "Pour les profils qui ne sont ni chauffeurs, ni livreurs, ni dans les categories deja prevues."
  }
]

const Welcome = () => {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [role, setRole] = useState("client")
  const [error, setError] = useState(null)

  const handleContinue = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Merci de renseigner votre nom et votre prenom.")
      return
    }

    setError(null)
    saveAuthDraft({ firstName: firstName.trim(), lastName: lastName.trim(), role })
    navigate("/signup")
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="ndar-shell space-y-4">
        <section className="rounded-[38px] border border-[#0b3154] bg-[linear-gradient(180deg,#0d416e_0%,#072a48_100%)] p-6 text-center shadow-[0_24px_60px_rgba(8,35,62,0.30)]">
          <div className="mx-auto inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#f6d59a]">
            Mobilite + services a Saint-Louis
          </div>
          <div className="mt-4 font-['Sora'] text-[42px] font-extrabold text-white">
            Yoonbi
          </div>
          <p className="mt-3 text-sm text-[#eaf3fb]">
            Une experience plus rapide, plus claire et plus elegante pour bouger, commander et proposer vos services.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-left">
            {[
              ["Trajets", "Reserve en quelques gestes"],
              ["Itineraires", "Calcul clair et instantane"],
              ["Validation", "Parcours pro securise"]
            ].map(([title, copy]) => (
              <div key={title} className="rounded-[22px] border border-white/8 bg-white/10 px-3 py-4 backdrop-blur">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#f1c778]">{title}</div>
                <div className="mt-2 text-xs text-[#f7fbff]">{copy}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="ndar-card rounded-[38px] p-6">
          <div className="ndar-chip">Demarrage rapide</div>
          <h1 className="mt-4 font-['Sora'] text-3xl font-extrabold text-[#16324f]">Bienvenue a bord</h1>
          <p className="mt-2 text-sm text-[#70839a]">Commencez par votre identite et choisissez votre parcours dans l'app.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Prenom"
              className="w-full rounded-2xl border border-[#e2eaf2] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[#165c96]"
            />
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Nom"
              className="w-full rounded-2xl border border-[#e2eaf2] bg-[#f8fbff] px-4 py-3 outline-none focus:border-[#165c96]"
            />
          </div>

          <div className="mt-5 grid gap-3">
            {roleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className={`ndar-lift rounded-[26px] border px-4 py-4 text-left transition-all ${
                  role === option.value ? "border-[#1260a1] bg-[linear-gradient(180deg,#f2f8fd_0%,#e5f0f9_100%)] shadow-[0_18px_40px_rgba(18,96,161,0.12)]" : "border-[#e2e7ef] bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-[0.18em] text-[#1260a1]">{option.label}</div>
                    <div className="mt-1 text-base font-bold text-[#16324f]">{option.title}</div>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${role === option.value ? "bg-white text-[#1260a1]" : "bg-[#f6efe4]"}`}>
                    {option.value === "client" ? "🚕" : option.value === "provider" ? "🧰" : option.value === "driver" ? "🚘" : "🧩"}
                  </div>
                </div>
                <p className="mt-2 text-sm text-[#70839a]">{option.description}</p>
              </button>
            ))}
          </div>

          {error && <div className="mt-4 rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}

          <button
            type="button"
            onClick={handleContinue}
            className="mt-6 w-full rounded-[26px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_20px_40px_rgba(8,35,62,0.22)]"
          >
            Continuer
          </button>

          <p className="mt-5 text-sm text-[#70839a]">
            Vous avez deja un compte ? <Link to="/login" className="font-semibold text-[#165c96]">Connexion</Link>
          </p>
        </section>
      </div>
    </div>
  )
}

export default Welcome
