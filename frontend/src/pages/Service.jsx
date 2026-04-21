import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import api from "../api"
import MapPicker from "../components/MapPicker"

const categories = [
  { value: "menuisier", label: "Menuiserie", iconSymbol: "🪚", hint: "Portes, meubles, dressing", family: "artisan" },
  { value: "ma\u00e7on", label: "Maconnerie", iconSymbol: "🧱", hint: "Murs, carrelage, terrasse", family: "artisan" },
  { value: "peintre", label: "Peinture", iconSymbol: "🎨", hint: "Finition interieure et facade", family: "artisan" },
  { value: "\u00e9lectricien", label: "Electricite", iconSymbol: "💡", hint: "Pannes et installations", family: "artisan" },
  { value: "p\u00e2tissier", label: "Food & Bakery", iconSymbol: "🥐", hint: "Gateaux, traiteur, livraison", family: "food" },
  { value: "coiffure-beaute", label: "Coiffure & Beaute", iconSymbol: "💇", hint: "Salon, tresses, maquillage", family: "beauty" },
  { value: "livreur", label: "Livraison Express", iconSymbol: "🛵", hint: "Documents, colis et depots", family: "delivery" },
  { value: "autres", label: "Autres", iconSymbol: "🧩", hint: "Autres besoins specifiques", family: "other" }
]

const categoryFamilyByValue = categories.reduce((acc, item) => {
  acc[item.value] = item.family
  return acc
}, {})

const familyLabelByValue = {
  artisan: "Artisans proches",
  food: "Restos et patisseries",
  beauty: "Beaute et coiffure",
  delivery: "Livreurs disponibles",
  other: "Autres services"
}

const defaultClientLocation = {
  lat: 16.0244,
  lng: -16.5015,
  name: "Votre position",
  address: "Saint-Louis"
}

const serviceTitleByCategory = {
  menuisier: "Besoin de menuiserie",
  "ma\u00e7on": "Besoin de maconnerie",
  peintre: "Besoin de peinture",
  "\u00e9lectricien": "Besoin d'electricite",
  "p\u00e2tissier": "Commande food",
  "coiffure-beaute": "Besoin beaute",
  livreur: "Besoin de livraison",
  autres: "Besoin de service"
}

const getDistanceLabel = (distanceKm) => {
  if (distanceKm == null || Number.isNaN(distanceKm)) return "Distance inconnue"
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`
  return `${distanceKm.toFixed(1)} km`
}

const formatArrival = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return null
  if (minutes <= 10) return "Arrive tres vite"
  if (minutes <= 20) return "Arrive bientot"
  return `${minutes} min approx.`
}

const getAssetUrl = (path) => {
  if (!path) return ""
  const base = String(api.defaults.baseURL || "").replace(/\/api\/?$/, "")
  return `${base}${path}`
}

const getInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "ND"

const normalizeCategory = (category, suggestedCategory, suggestedListing) => {
  if (suggestedListing?.category) return suggestedListing.category
  if (category) return category
  if (suggestedCategory === "beauty") return "coiffure-beaute"
  if (suggestedCategory === "food") return "p\u00e2tissier"
  if (suggestedCategory === "artisan") return "menuisier"
  if (suggestedCategory === "delivery") return "livreur"
  if (suggestedCategory === "other") return "autres"
  return "menuisier"
}

const Service = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const suggestedCategory = location.state?.suggestedCategory
  const suggestedListing = location.state?.suggestedListing

  const [category, setCategory] = useState(
    normalizeCategory(suggestedListing?.category, suggestedCategory, suggestedListing)
  )
  const [query, setQuery] = useState("")
  const [clientLocation, setClientLocation] = useState(defaultClientLocation)
  const [providers, setProviders] = useState([])
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [providerError, setProviderError] = useState(null)
  const [selectedProviderId, setSelectedProviderId] = useState(null)
  const [title, setTitle] = useState(suggestedListing?.title || serviceTitleByCategory[normalizeCategory(suggestedListing?.category, suggestedCategory, suggestedListing)] || "")
  const [description, setDescription] = useState(
    suggestedListing
      ? `Je souhaite reserver ${suggestedListing.title}. ${suggestedListing.description || ""}`.trim()
      : ""
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [createdSafetyCode, setCreatedSafetyCode] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setClientLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: "Votre position",
          address: "Position detectee"
        })
      },
      () => {
        setClientLocation(defaultClientLocation)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  useEffect(() => {
    let active = true

    const fetchProviders = async () => {
      try {
        setLoadingProviders(true)
        setProviderError(null)
        const response = await api.get("/services/providers", {
          params: {
            category,
            lat: clientLocation.lat,
            lng: clientLocation.lng
          }
        })

        if (!active) return

        const nextProviders = Array.isArray(response.data?.providers) ? response.data.providers : []
        setProviders(nextProviders)
        setSelectedProviderId((current) => {
          if (current && nextProviders.some((provider) => provider.id === current)) {
            return current
          }
          return nextProviders[0]?.id || null
        })
      } catch (fetchError) {
        if (!active) return
        console.error("Erreur lors du chargement des prestataires:", fetchError)
        setProviderError(fetchError.userMessage || "Impossible de charger les prestataires disponibles.")
        setProviders([])
      } finally {
        if (active) {
          setLoadingProviders(false)
        }
      }
    }

    fetchProviders()

    return () => {
      active = false
    }
  }, [category, clientLocation.lat, clientLocation.lng])

  const filteredProviders = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    const source = [...providers]

    if (!lowered) return source

    return source.filter((provider) => {
      const target = [
        provider.name,
        provider.firstName,
        provider.lastName,
        provider.serviceCategory,
        provider.serviceArea,
        provider.availabilityLabel,
        provider.experienceYears,
        provider.beautySpecialty,
        provider.otherServiceDetail
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return target.includes(lowered)
    })
  }, [providers, query])

  useEffect(() => {
    if (!filteredProviders.length) {
      setSelectedProviderId(null)
      return
    }

    if (!filteredProviders.some((provider) => provider.id === selectedProviderId)) {
      setSelectedProviderId(filteredProviders[0].id)
    }
  }, [filteredProviders, selectedProviderId])

  const selectedProvider = filteredProviders.find((provider) => provider.id === selectedProviderId) || filteredProviders[0] || null
  const selectedCategory = categories.find((item) => item.value === category)

  const mapMarkers = filteredProviders.map((provider) => ({
    id: provider.id,
    lat: provider.coordinates?.lat,
    lng: provider.coordinates?.lng,
    label: provider.name,
    emoji: selectedCategory?.iconSymbol || "•",
    background: provider.id === selectedProviderId ? "#0a3760" : "#165c96"
  })).filter((marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng))

  const handlePickProvider = (provider) => {
    setSelectedProviderId(provider.id)
    setTitle((current) => current || (provider.name ? `Demande pour ${provider.name}` : ""))
  }

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
      setCreatedSafetyCode(null)

      const response = await api.post("/services", {
        category,
        title: title.trim() || `Besoin ${selectedCategory?.label || category}`,
        description: description.trim(),
        preferredProviderId: selectedProvider?.id || null,
        preferredProviderName: selectedProvider?.name || "",
        preferredDistanceKm: selectedProvider?.distanceKm ?? null
      })

      setCreatedSafetyCode(response.data?.safetyCode || null)
      setSuccessMessage(response.data?.safetyHint || "Votre demande a bien ete envoyee.")
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
        <header className="overflow-hidden rounded-[36px] border border-[#0b3154] bg-[linear-gradient(180deg,#0d416e_0%,#072a48_100%)] p-5 shadow-[0_24px_60px_rgba(8,35,62,0.30)]">
          <button onClick={() => navigate(-1)} className="mb-4 text-sm font-semibold text-[#f1c778]">← Retour</button>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#f6d59a]">
                Discovery mode
              </div>
              <h1 className="mt-4 font-['Sora'] text-3xl font-extrabold text-white">
                Trouvez le service le plus proche de vous
              </h1>
              <p className="mt-2 text-sm text-[#eaf3fb]">
                Une page organisee comme une vraie place de marche: categories claires, carte, et prestataire le plus proche en premier.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-[28px] border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Zone</div>
                <div className="mt-2 font-['Sora'] text-lg font-bold">{clientLocation.address || "Saint-Louis"}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a8fd1]">Disponibles</div>
                <div className="mt-2 font-['Sora'] text-lg font-bold">{filteredProviders.length}</div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[30px] border border-[#dbe8f1] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8fc_100%)] p-4 shadow-[0_12px_30px_rgba(8,35,62,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">1. Verifies</div>
            <div className="mt-2 font-['Sora'] text-lg font-bold text-[#16324f]">Prestataires visibles et tries</div>
            <p className="mt-2 text-sm text-[#5f7184]">On te montre d'abord les profils verifies les plus pertinents.</p>
          </div>
          <div className="rounded-[30px] border border-[#dbe8f1] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8fc_100%)] p-4 shadow-[0_12px_30px_rgba(8,35,62,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">2. Proximite</div>
            <div className="mt-2 font-['Sora'] text-lg font-bold text-[#16324f]">Le plus proche d'abord</div>
            <p className="mt-2 text-sm text-[#5f7184]">La carte et la liste se rangent selon la distance a ta position.</p>
          </div>
          <div className="rounded-[30px] border border-[#dbe8f1] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8fc_100%)] p-4 shadow-[0_12px_30px_rgba(8,35,62,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">3. Paiement</div>
            <div className="mt-2 font-['Sora'] text-lg font-bold text-[#16324f]">Devis du prestataire</div>
            <p className="mt-2 text-sm text-[#5f7184]">Le client exprime son besoin, puis le prestataire propose son prix avant validation.</p>
          </div>
        </section>

        <section className="ndar-card rounded-[36px] p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Choisis une categorie</h2>
              <p className="mt-1 text-sm text-[#70839a]">
                On te montre d'abord les prestataires verifies les plus proches de ta position.
              </p>
            </div>
            <div className="rounded-[22px] bg-[linear-gradient(180deg,#f8fbff_0%,#edf5fb_100%)] px-4 py-3 text-sm font-semibold text-[#1260a1]">
              {familyLabelByValue[categoryFamilyByValue[category] || "other"]}
            </div>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {categories.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
                className={`flex min-w-[170px] flex-1 flex-col items-start rounded-[24px] border px-4 py-4 text-left transition-all ${
                  item.value === category
                    ? "border-[#1260a1] bg-[linear-gradient(180deg,#edf5fb_0%,#e3eef8_100%)]"
                    : "border-[#e8ddd0] bg-white"
                }`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8effa] text-xl">
                  {item.iconSymbol}
                </div>
                <div className="mt-3 text-sm font-bold text-[#16324f]">{item.label}</div>
                <div className="mt-1 text-xs text-[#70839a]">{item.hint}</div>
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-4">
            <div className="ndar-card rounded-[36px] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Carte des prestataires</h2>
                  <p className="mt-1 text-sm text-[#70839a]">Les points visibles sur la carte sont tries par proximite.</p>
                </div>
                <div className="rounded-full bg-[#edf5fb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1260a1]">
                  {loadingProviders ? "Chargement..." : `${filteredProviders.length} resultats`}
                </div>
              </div>

              <div className="h-[420px] overflow-hidden rounded-[28px]">
                <MapPicker
                  center={clientLocation}
                  readOnly
                  extraMarkers={mapMarkers}
                />
              </div>
            </div>

            <div className="ndar-card rounded-[36px] p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Prestataires disponibles</h2>
                  <p className="text-sm text-[#70839a]">Le plus proche est mis en avant en premier.</p>
                </div>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher par nom, zone, specialite..."
                  className="w-full max-w-[280px] rounded-2xl border border-[#e1d8cc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-3 text-sm outline-none focus:border-[#1260a1]"
                />
              </div>

              {providerError && (
                <div className="mb-4 rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{providerError}</div>
              )}

              {loadingProviders ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => <div key={item} className="ndar-card h-24 animate-pulse rounded-[24px]" />)}
                </div>
              ) : filteredProviders.length === 0 ? (
                <div className="rounded-[24px] bg-[#f8fbff] px-5 py-6 text-sm text-[#70839a]">
                  Aucun prestataire ne correspond a cette categorie pour le moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProviders.map((provider, index) => (
                    <article
                      key={provider.id}
                      className={`rounded-[28px] border p-4 shadow-sm transition-all ${
                        provider.id === selectedProviderId
                          ? "border-[#1260a1] bg-[linear-gradient(180deg,#f5fbff_0%,#ebf4fb_100%)]"
                          : "border-[#e2eaf2] bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[#edf5fb] text-2xl">
                          {provider.profilePhotoUrl ? (
                            <img
                              src={getAssetUrl(provider.profilePhotoUrl)}
                              alt={provider.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-['Sora'] text-sm font-bold text-[#1260a1]">
                              {getInitials(provider.name)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70839a]">
                                #{index + 1} {provider.serviceFamilyLabel}
                              </div>
                              <h3 className="mt-1 truncate font-['Sora'] text-lg font-bold text-[#16324f]">
                                {provider.name}
                              </h3>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
                                <span className="rounded-full bg-[#edf5fb] px-3 py-1 text-[#1260a1]">
                                  Zone: {provider.serviceAreaLabel}
                                </span>
                                <span className="rounded-full bg-[#eefaf2] px-3 py-1 text-[#178b55]">
                                  {provider.distanceLabel || "Distance inconnue"}
                                </span>
                                {provider.locationLabel && provider.locationLabel !== provider.serviceAreaLabel && (
                                  <span className="rounded-full bg-[#f7f1ff] px-3 py-1 text-[#6b57a6]">
                                    Position: {provider.locationLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="rounded-full bg-[#eefaf2] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#178b55]">
                                {provider.distanceLabel || getDistanceLabel(provider.distanceKm)}
                              </div>
                              <div className="flex flex-wrap justify-end gap-2">
                                {provider.highlight && (
                                  <span className="rounded-full bg-[#fff7eb] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a7a24]">
                                    Top proche
                                  </span>
                                )}
                                {provider.isOpen && (
                                  <span className="rounded-full bg-[#eefaf2] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#178b55]">
                                    Disponible
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="mt-2 text-sm text-[#70839a]">
                            {provider.locationLabel || provider.serviceAreaLabel}
                            {provider.availabilityLabel ? ` • ${provider.availabilityLabel}` : ""}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-[#edf5fb] px-3 py-2 text-[#1260a1]">
                              Zone: {provider.serviceAreaLabel}
                            </span>
                            <span className="rounded-full bg-[#eefaf2] px-3 py-2 text-[#178b55]">
                              {provider.distanceLabel || "Distance inconnue"}
                            </span>
                            {provider.availabilityLabel && (
                              <span className="rounded-full bg-[#eefaf2] px-3 py-2 text-[#178b55]">
                                {provider.availabilityLabel}
                              </span>
                            )}
                            <span className="rounded-full bg-[#fff7eb] px-3 py-2 text-[#9a7a24]">
                              {formatArrival(provider.estimatedArrivalMin) || "Disponible maintenant"}
                            </span>
                            {provider.experienceYears && (
                              <span className="rounded-full bg-[#f2eefc] px-3 py-2 text-[#6b57a6]">
                                {provider.experienceYears}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 text-sm text-[#5f7184]">
                            {provider.beautySpecialty || provider.otherServiceDetail || "Prestataire verifie"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handlePickProvider(provider)}
                          className="rounded-[22px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-4 py-3 text-sm font-bold text-white"
                        >
                          Choisir ce prestataire
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedProviderId(provider.id)}
                          className="rounded-[22px] bg-[#eadcc4] px-4 py-3 text-sm font-bold text-[#0a3760]"
                        >
                          Le garder en vue
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="ndar-card rounded-[36px] p-5">
              <div className="mb-4">
                <div className="ndar-chip">Demande rapide</div>
                <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Envoyer une demande au plus proche</h2>
                <p className="mt-1 text-sm text-[#70839a]">
                  On garde la demande dans la bonne categorie et on la priorise vers le prestataire selectionne.
                </p>
              </div>

              {selectedProvider && (
                <div className="mb-4 rounded-[24px] border border-[#dce7f0] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[#edf5fb]">
                      {selectedProvider.profilePhotoUrl ? (
                        <img
                          src={getAssetUrl(selectedProvider.profilePhotoUrl)}
                          alt={selectedProvider.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-['Sora'] text-sm font-bold text-[#1260a1]">
                          {getInitials(selectedProvider.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70839a]">Prestataire choisi</div>
                      <div className="mt-1 truncate font-['Sora'] text-lg font-bold text-[#16324f]">{selectedProvider.name}</div>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-[#5f7184]">
                    {selectedProvider.locationLabel || selectedProvider.serviceAreaLabel}
                    {" "}
                    • {selectedProvider.distanceLabel || getDistanceLabel(selectedProvider.distanceKm)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-white px-3 py-2 text-[#1260a1]">Famille: {selectedProvider.serviceFamilyLabel}</span>
                    <span className="rounded-full bg-white px-3 py-2 text-[#178b55]">{selectedProvider.availabilityLabel || "Disponible"}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Titre</label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex: Depannage rapide, coiffure a domicile..."
                    className="w-full rounded-2xl border border-[#e1d8cc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-3 outline-none focus:border-[#1260a1]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Description</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={6}
                    placeholder="Precisez le besoin, l'adresse, l'horaire souhaite et les details utiles."
                    className="w-full rounded-2xl border border-[#e1d8cc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-3 outline-none focus:border-[#1260a1]"
                  />
                </div>

                <div className="rounded-2xl border border-[#dbe8f1] bg-[#f8fbff] px-4 py-4 text-sm text-[#5f7184]">
                  Aucun budget n'est demande au client. Decrivez simplement votre besoin, puis le prestataire proposera son prix.
                </div>

                {error && <div className="rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}
                {successMessage && <div className="rounded-2xl bg-[#eefaf2] px-4 py-3 text-sm text-[#178b55]">{successMessage}</div>}
                {createdSafetyCode && (
                  <div className="rounded-2xl border border-[#cfe3f5] bg-[#f7fbff] px-4 py-3 text-sm text-[#1260a1]">
                    Code de sécurité client: <span className="font-bold tracking-[0.2em]">{createdSafetyCode}</span>
                    <div className="mt-1 text-xs text-[#5f7184]">
                      Partagez ce code uniquement au prestataire qui prend réellement la demande.
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-[26px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_24px_44px_rgba(8,35,62,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Envoi en cours..." : "Valider la demande"}
                </button>
              </form>
            </section>

            <section className="ndar-card rounded-[36px] p-5">
              <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Comment ca marche</h2>
              <div className="mt-4 space-y-3 text-sm text-[#5f7184]">
                <div className="rounded-[22px] bg-[#f8fbff] px-4 py-4">
                  1. Choisis une categorie.
                </div>
                <div className="rounded-[22px] bg-[#f8fbff] px-4 py-4">
                  2. Regarde la carte et les prestataires verifies les plus proches.
                </div>
                <div className="rounded-[22px] bg-[#f8fbff] px-4 py-4">
                  3. Selectionne celui qui te convient, puis envoie la demande.
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

    </div>
  )
}

export default Service
