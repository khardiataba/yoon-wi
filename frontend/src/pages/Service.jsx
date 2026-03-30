import { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import api from "../api"
import BottomNav from "../components/BottomNav"

const categories = [
  { value: "menuisier", label: "Menuiserie", icon: "🪚", hint: "Portes, meubles, dressing" },
  { value: "maçon", label: "Maconnerie", icon: "🧱", hint: "Murs, carrelage, terrasse" },
  { value: "peintre", label: "Peinture", icon: "🎨", hint: "Finition interieure et facade" },
  { value: "électricien", label: "Electricite", icon: "💡", hint: "Pannes et installations" },
  { value: "pâtissier", label: "Food & Bakery", icon: "🥐", hint: "Gateaux, traiteur, livraison" },
  { value: "coiffure-beaute", label: "Coiffure & Beaute", icon: "💇", hint: "Salon, tresses, maquillage" },
  { value: "livreur", label: "Livraison Express", icon: "🛵", hint: "Documents, colis, courses et depots" }
]

const Service = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const suggestedCategory = location.state?.suggestedCategory
  const suggestedListing = location.state?.suggestedListing
  const initialCategory = useMemo(() => {
    if (suggestedListing?.category) return suggestedListing.category
    if (suggestedCategory === "beauty") return "coiffure-beaute"
    if (suggestedCategory === "food") return "pâtissier"
    if (suggestedCategory === "artisan") return "menuisier"
    return "menuisier"
  }, [suggestedCategory, suggestedListing])

  const [category, setCategory] = useState(initialCategory)
  const [title, setTitle] = useState(suggestedListing?.title || "")
  const [description, setDescription] = useState(
    suggestedListing
      ? `Je souhaite reserver ${suggestedListing.title}. ${suggestedListing.description || ""}`.trim()
      : ""
  )
  const [price, setPrice] = useState(suggestedListing?.price ? String(suggestedListing.price) : "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const selectedCategory = categories.find((item) => item.value === category)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!description.trim()) {
      setError("Ajoutez quelques details pour aider le prestataire a comprendre votre besoin.")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccessMessage(null)

      await api.post("/services", {
        category,
        title: title.trim() || `Besoin ${selectedCategory?.label || category}`,
        description: description.trim(),
        price: price ? Number.parseInt(price, 10) : 0
      })

      setSuccessMessage("Votre demande a bien ete envoyee.")
      setTimeout(() => navigate("/mybookings"), 700)
    } catch (submitError) {
      console.error("Erreur lors de l'envoi de service:", submitError)
      setError(submitError.userMessage || "Impossible d'envoyer la demande pour le moment.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 pb-28 pt-5 lg:px-6">
      <div className="ndar-shell space-y-4">
        <header className="rounded-[36px] border border-[#0b3154] bg-[linear-gradient(180deg,#0d416e_0%,#072a48_100%)] p-5 shadow-[0_24px_60px_rgba(8,35,62,0.30)]">
          <button onClick={() => navigate(-1)} className="mb-4 text-sm font-semibold text-[#f1c778]">← Retour</button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#f6d59a]">Services on demand</div>
              <h1 className="mt-4 font-['Sora'] text-3xl font-extrabold text-white">Book a service</h1>
              <p className="mt-2 text-sm text-[#eaf3fb]">Trouvez un artisan, un resto ou un service beaute dans un parcours plus premium.</p>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-white/10 px-4 py-3 text-3xl shadow-[0_14px_30px_rgba(8,35,62,0.18)]">{selectedCategory?.icon || "✨"}</div>
          </div>
          {suggestedListing && (
            <div className="mt-4 rounded-[26px] border border-white/10 bg-white/10 px-4 py-4 text-sm text-white backdrop-blur-xl">
              <div className="font-semibold">{suggestedListing.title}</div>
              <div className="mt-1 text-[#d6e7f5]">
                {suggestedListing.area}
                {suggestedListing.isOpen ? " • Ouvert maintenant" : " • Bientot disponible"}
              </div>
            </div>
          )}
        </header>

        <section className="ndar-card rounded-[36px] p-5">
          <h2 className="mb-4 font-['Sora'] text-xl font-bold text-[#16324f]">Categories</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
                className={`ndar-lift rounded-[26px] border px-4 py-4 text-left transition-all ${
                  item.value === category ? "border-[#1260a1] bg-[linear-gradient(180deg,#edf5fb_0%,#e3eef8_100%)]" : "border-[#e8ddd0] bg-white"
                }`}
              >
                <div className="text-3xl">{item.icon}</div>
                <div className="mt-3 text-sm font-bold text-[#16324f]">{item.label}</div>
                <div className="mt-1 text-xs text-[#70839a]">{item.hint}</div>
              </button>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="ndar-card rounded-[36px] p-5">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Titre</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Mise en beaute pour mariage, depannage electrique..."
                className="w-full rounded-2xl border border-[#e1d8cc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-3 outline-none focus:border-[#1260a1]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                placeholder="Precisez la prestation, l'adresse, l'horaire souhaite et toute info utile."
                className="w-full rounded-2xl border border-[#e1d8cc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-3 outline-none focus:border-[#1260a1]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Budget estime (FCFA)</label>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                type="number"
                min="0"
                placeholder="0"
                className="w-full rounded-2xl border border-[#e1d8cc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-3 outline-none focus:border-[#1260a1]"
              />
            </div>
          </div>

          {error && <div className="mt-4 rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}
          {successMessage && <div className="mt-4 rounded-2xl bg-[#eefaf2] px-4 py-3 text-sm text-[#178b55]">{successMessage}</div>}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-[26px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_24px_44px_rgba(8,35,62,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Envoi en cours..." : "Valider la demande"}
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  )
}

export default Service
