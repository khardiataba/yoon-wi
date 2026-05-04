import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import api from "../api"
import MapPicker from "../components/MapPicker"
import AppIcon from "../components/AppIcon"
import { resolveMediaUrl } from "../utils/mediaUrl"

const categories = [
  { value: "menuisier", label: "Menuiserie", icon: "tools", hint: "Portes, meubles, dressing", family: "artisan" },
  { value: "maçon", label: "Maconnerie", icon: "tools", hint: "Murs, carrelage, terrasse", family: "artisan" },
  { value: "peintre", label: "Peinture", icon: "star", hint: "Finition interieure et facade", family: "artisan" },
  { value: "électricien", label: "Electricite", icon: "info", hint: "Pannes et installations", family: "artisan" },
  { value: "pâtissier", label: "Food & Bakery", icon: "food", hint: "Gateaux, traiteur, livraison", family: "food" },
  { value: "coiffure-beaute", label: "Coiffure & Beaute", icon: "user", hint: "Salon, tresses, maquillage", family: "beauty" },
  { value: "livreur", label: "Livraison Express", icon: "delivery", hint: "Documents, colis et depots", family: "delivery" },
  { value: "autres", label: "Autres", icon: "menu", hint: "Autres besoins specifiques", family: "other" }
]

const categoryFamilyByValue = categories.reduce((acc, item) => {
  acc[item.value] = item.family
  return acc
}, {})

const familyLabelByValue = {
  artisan: "Metiers techniques",
  food: "Cuisine et patisserie",
  beauty: "Coiffure et beaute",
  delivery: "Livraison",
  other: "Tous les prestataires"
}

const defaultClientLocation = {
  lat: 16.0244,
  lng: -16.5015,
  name: "Votre position",
  address: "Saint-Louis"
}

const serviceTitleByCategory = {
  menuisier: "Besoin de menuiserie",
  "maçon": "Besoin de maconnerie",
  peintre: "Besoin de peinture",
  "électricien": "Besoin d'electricite",
  "pâtissier": "Commande food",
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

const getProviderImageUrl = (provider) => {
  const source = provider?.profilePhotoUrl || provider?.portfolio?.coverImage || provider?.portfolio?.previewItems?.[0]?.thumbnailUrl || provider?.portfolio?.previewItems?.[0]?.imageUrl || ""
  return resolveMediaUrl(source)
}

const getPreviewMediaUrl = (item) => {
  if (!item) return ""
  return resolveMediaUrl(item.thumbnailUrl || item.imageUrl || item.videoUrl || "")
}

const formatPriceRange = (startingPrice, maxPrice, currency = "XOF", unit = "service") => {
  const start = Number(startingPrice || 0)
  const end = Number(maxPrice || 0)
  if (!start && !end) return null
  if (end > start) return `${start.toLocaleString()} - ${end.toLocaleString()} ${currency} / ${unit}`
  return `${Math.max(start, end).toLocaleString()} ${currency} / ${unit}`
}

const getInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "ND"

const normalizeSearchText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

const toProviderId = (value) => String(value || "")

const providerMatchesQuery = (provider, query) => {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  const searchable = normalizeSearchText(
    [
      provider.name,
      provider.professionLabel,
      provider.serviceCategory,
      provider.serviceArea,
      provider.locationLabel,
      provider.availabilityLabel,
      provider.experienceYears,
      provider.beautySpecialty,
      provider.otherServiceDetail,
      ...(Array.isArray(provider.portfolio?.offerings)
        ? provider.portfolio.offerings.flatMap((item) => [item.title, item.description, item.unit])
        : []),
      ...(Array.isArray(provider.portfolio?.previewItems)
        ? provider.portfolio.previewItems.flatMap((item) => [
            item.title,
            item.description,
            item.category,
            ...(Array.isArray(item.tags) ? item.tags : [])
          ])
        : []),
      ...(Array.isArray(provider.searchKeywords) ? provider.searchKeywords : [])
    ]
      .filter(Boolean)
      .join(" ")
  )

  return tokens.every((token) => searchable.includes(token)) || searchable.includes(normalizedQuery)
}

const normalizeCategory = (category, suggestedCategory, suggestedListing) => {
  if (suggestedListing?.category) return suggestedListing.category
  if (category) return category
  if (suggestedCategory === "beauty") return "coiffure-beaute"
  if (suggestedCategory === "food") return "pâtissier"
  if (suggestedCategory === "artisan") return "menuisier"
  if (suggestedCategory === "delivery") return "livreur"
  if (suggestedCategory === "other") return "autres"
  return "menuisier"
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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
  const [discussionMessage, setDiscussionMessage] = useState("")
  const [discussionError, setDiscussionError] = useState(null)
  const [openingDiscussion, setOpeningDiscussion] = useState(false)
  const [selectedProviderMessage, setSelectedProviderMessage] = useState(null)
  const selectedProviderPanelRef = useRef(null)

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
        let response = null
        let lastError = null

        for (let attempt = 1; attempt <= 2; attempt += 1) {
          try {
            response = await api.get("/services/providers", {
              timeout: 90000,
              params: {
                category,
                q: query,
                lat: clientLocation.lat,
                lng: clientLocation.lng
              }
            })
            break
          } catch (requestError) {
            lastError = requestError
            const isTimeout = requestError.code === "ECONNABORTED" || String(requestError.message || "").toLowerCase().includes("timeout")
            if (attempt < 2 && isTimeout) {
              await sleep(1200)
              continue
            }
            throw requestError
          }
        }

        if (!response && lastError) {
          throw lastError
        }

        if (!active) return

        const nextProviders = Array.isArray(response.data?.providers) ? response.data.providers : []
        setProviders(nextProviders)
        setSelectedProviderId((current) => {
          if (current && nextProviders.some((provider) => toProviderId(provider.id) === toProviderId(current))) {
            return current
          }
          return toProviderId(nextProviders[0]?.id) || null
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
  }, [category, query, clientLocation.lat, clientLocation.lng])

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => providerMatchesQuery(provider, query))
  }, [providers, query])

  useEffect(() => {
    if (!filteredProviders.length) {
      setSelectedProviderId(null)
      return
    }

    if (!filteredProviders.some((provider) => toProviderId(provider.id) === toProviderId(selectedProviderId))) {
      setSelectedProviderId(toProviderId(filteredProviders[0].id))
    }
  }, [filteredProviders, selectedProviderId])

  const selectedProvider = filteredProviders.find((provider) => toProviderId(provider.id) === toProviderId(selectedProviderId)) || filteredProviders[0] || null
  const selectedCategory = categories.find((item) => item.value === category)

  const mapMarkers = filteredProviders.map((provider) => ({
    id: provider.id,
    lat: provider.coordinates?.lat,
    lng: provider.coordinates?.lng,
    label: provider.name,
    emoji: "•",
    background: toProviderId(provider.id) === toProviderId(selectedProviderId) ? "#0a3760" : "#165c96"
  })).filter((marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng))

  const handlePickProvider = (provider) => {
    setSelectedProviderId(toProviderId(provider.id))
    setTitle((current) => current || (provider.name ? `Demande pour ${provider.name}` : ""))
    setDiscussionError(null)
    setSelectedProviderMessage(`${provider.name} a ete selectionne comme prestataire prefere.`)
    window.setTimeout(() => {
      selectedProviderPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
  }

  const openDiscussion = async (provider = selectedProvider) => {
    if (!provider?.id) {
      setDiscussionError("Choisissez d'abord un prestataire.")
      return
    }

    const firstMessage = discussionMessage.trim() || description.trim()
    if (!firstMessage) {
      setDiscussionError("Ajoutez un message pour lancer la discussion avec le prestataire.")
      return
    }

    try {
      setOpeningDiscussion(true)
      setDiscussionError(null)
      const response = await api.post("/services/discussions", {
        providerId: toProviderId(provider.id),
        category,
        title: title.trim() || `Discussion avec ${provider.professionLabel || provider.name}`,
        content: firstMessage
      })
      setDiscussionMessage("")
      navigate(`/service/${response.data?.serviceRequest?._id}`)
    } catch (discussionRequestError) {
      console.error("Erreur lors de l'ouverture de la discussion:", discussionRequestError)
      setDiscussionError(discussionRequestError.userMessage || "Impossible d'ouvrir la discussion pour le moment.")
    } finally {
      setOpeningDiscussion(false)
    }
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
        preferredProviderId: toProviderId(selectedProvider?.id) || null,
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
                Trouvez le bon prestataire selon votre besoin
              </h1>
              <p className="mt-2 text-sm text-[#eaf3fb]">
                Tous les techniciens verifies sont visibles. La recherche essaie aussi de retrouver le metier le plus proche de ce que vous tapez.
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
            <div className="mt-2 font-['Sora'] text-lg font-bold text-[#16324f]">Tous les profils visibles</div>
            <p className="mt-2 text-sm text-[#5f7184]">Le client voit tous les techniciens verifies et choisit selon la profession qui l'interesse.</p>
          </div>
          <div className="rounded-[30px] border border-[#dbe8f1] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8fc_100%)] p-4 shadow-[0_12px_30px_rgba(8,35,62,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">2. Proximite</div>
            <div className="mt-2 font-['Sora'] text-lg font-bold text-[#16324f]">Recherche plus souple</div>
            <p className="mt-2 text-sm text-[#5f7184]">Si le mot exact n'est pas affiche, on remonte quand meme les profils les plus proches du besoin saisi.</p>
          </div>
          <div className="rounded-[30px] border border-[#dbe8f1] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8fc_100%)] p-4 shadow-[0_12px_30px_rgba(8,35,62,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">3. Paiement</div>
            <div className="mt-2 font-['Sora'] text-lg font-bold text-[#16324f]">Devis du prestataire</div>
              <p className="mt-2 text-sm text-[#5f7184]">Le client peut aussi discuter avec un prestataire avant d'envoyer sa demande.</p>
          </div>
        </section>

        <section className="ndar-card rounded-[36px] p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Choisis une categorie</h2>
              <p className="mt-1 text-sm text-[#70839a]">
                La categorie sert de suggestion, mais la liste reste ouverte pour montrer tous les techniciens verifies.
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
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8effa] text-[#1260a1]">
                  <AppIcon name={item.icon} className="h-6 w-6" />
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
                  <p className="mt-1 text-sm text-[#70839a]">Tous les prestataires verifies remontent ici, avec priorite aux profils les plus proches et les plus pertinents.</p>
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
                  <p className="text-sm text-[#70839a]">Tapez un metier, un besoin ou un mot-cle comme plombier, informatique, peinture, tableau d'art ou patisserie.</p>
                </div>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ex: plombier, informaticien, peinture, gateau..."
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
                  Aucun profil ne correspond exactement a votre recherche. Essayez un mot plus simple ou une profession proche.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProviders.map((provider, index) => (
                    <article
                      key={provider.id}
                      className={`rounded-[28px] border p-4 shadow-sm transition-all ${
                        toProviderId(provider.id) === toProviderId(selectedProviderId)
                          ? "border-[#1260a1] bg-[linear-gradient(180deg,#f5fbff_0%,#ebf4fb_100%)]"
                          : "border-[#e2eaf2] bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[#edf5fb] text-2xl">
                          {getProviderImageUrl(provider) ? (
                            <img
                              src={getProviderImageUrl(provider)}
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
                                #{index + 1} {provider.professionLabel || provider.serviceCategory || "Prestataire"}
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
                            {provider.professionLabel || provider.serviceCategory || "Prestataire"}
                            {" • "}
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
                            {(provider.professionLabel || provider.serviceCategory) && (
                              <span className="rounded-full bg-[#fff7eb] px-3 py-2 text-[#9a7a24]">
                                {provider.professionLabel || provider.serviceCategory}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 text-sm text-[#5f7184]">
                            {provider.beautySpecialty || provider.otherServiceDetail || "Prestataire verifie"}
                          </div>

                          {(provider.portfolio?.priceFrom > 0 || provider.portfolio?.priceTo > 0) && (
                            <div className="mt-3 rounded-[18px] bg-[#eefaf2] px-4 py-3 text-sm font-semibold text-[#178b55]">
                              Tarif indicatif: {formatPriceRange(provider.portfolio?.priceFrom, provider.portfolio?.priceTo) || "Tarif sur demande"}
                            </div>
                          )}

                          {Array.isArray(provider.portfolio?.previewItems) && provider.portfolio.previewItems.length > 0 && (
                            <div className="mt-4 rounded-[22px] border border-[#dce7f0] bg-[#f8fbff] p-3">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Aperçus des services</div>
                                <div className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#1260a1]">
                                  {provider.portfolio.totalImages || provider.portfolio.previewItems.length} média
                                </div>
                              </div>
                              {(() => {
                                const mainItem = provider.portfolio.previewItems[0]
                                return (
                                  <div className="overflow-hidden rounded-[18px] border border-[#dbe8f1] bg-white">
                                    {mainItem.mediaType === "video" && mainItem.videoUrl ? (
                                      <video
                                        src={resolveMediaUrl(mainItem.videoUrl)}
                                        className="h-44 w-full bg-[#dbe8f1] object-cover sm:h-56"
                                        muted
                                        playsInline
                                        controls
                                      />
                                    ) : (
                                      <img
                                        src={getPreviewMediaUrl(mainItem)}
                                        alt={mainItem.title || provider.name}
                                        className="h-44 w-full bg-[#dbe8f1] object-cover sm:h-56"
                                        loading="lazy"
                                      />
                                    )}
                                    <div className="p-4">
                                      <div className="font-semibold text-[#16324f]">{mainItem.title || "Service réalisé"}</div>
                                      {mainItem.description && <div className="mt-1 text-sm text-[#5f7184]">{mainItem.description}</div>}
                                      {formatPriceRange(mainItem.pricing?.startingPrice, mainItem.pricing?.maxPrice, mainItem.pricing?.currency, mainItem.pricing?.unit) && (
                                        <div className="mt-2 inline-flex rounded-full bg-[#eefaf2] px-3 py-1 text-xs font-bold text-[#178b55]">
                                          {formatPriceRange(mainItem.pricing?.startingPrice, mainItem.pricing?.maxPrice, mainItem.pricing?.currency, mainItem.pricing?.unit)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })()}
                              {provider.portfolio.previewItems.length > 1 && (
                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                  {provider.portfolio.previewItems.slice(1, 4).map((item) => (
                                    <div key={item.id} className="overflow-hidden rounded-[14px] border border-[#dce7f0] bg-white">
                                      {item.mediaType === "video" && item.videoUrl ? (
                                        <video src={resolveMediaUrl(item.videoUrl)} className="h-24 w-full object-cover" muted playsInline />
                                      ) : (
                                        <img
                                          src={getPreviewMediaUrl(item)}
                                          alt={item.title || provider.name}
                                          className="h-24 w-full object-cover"
                                          loading="lazy"
                                        />
                                      )}
                                      <div className="truncate px-2 py-2 text-xs font-semibold text-[#16324f]">{item.title || "Aperçu"}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {Array.isArray(provider.portfolio?.offerings) && provider.portfolio.offerings.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Services proposés par ce prestataire</div>
                              {provider.portfolio.offerings.slice(0, 4).map((offering) => (
                                <div key={offering.id} className="rounded-[18px] border border-[#dbe8f1] bg-white px-4 py-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-semibold text-[#16324f]">{offering.title}</div>
                                    <div className="text-sm font-bold text-[#1260a1]">
                                      {formatPriceRange(offering.startingPrice, offering.maxPrice, offering.currency, offering.unit) || "Tarif sur demande"}
                                    </div>
                                  </div>
                                  {offering.description && <div className="mt-1 text-sm text-[#5f7184]">{offering.description}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handlePickProvider(provider)}
                          className={`rounded-[22px] px-4 py-3 text-sm font-bold ${
                            toProviderId(provider.id) === toProviderId(selectedProviderId)
                              ? "bg-[#178b55] text-white"
                              : "bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] text-white"
                          }`}
                        >
                          {toProviderId(provider.id) === toProviderId(selectedProviderId) ? "Prestataire selectionne" : "Choisir ce prestataire"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedProviderId(toProviderId(provider.id))}
                          className="rounded-[22px] bg-[#eadcc4] px-4 py-3 text-sm font-bold text-[#0a3760]"
                        >
                          Le garder en vue
                        </button>
                        <button
                          type="button"
                          onClick={() => openDiscussion(provider)}
                          className="rounded-[22px] border border-[#0a3760] bg-white px-4 py-3 text-sm font-bold text-[#0a3760]"
                        >
                          Discuter
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
                  La categorie sert de repere. Vous pouvez aussi ouvrir une discussion avec le prestataire avant de confirmer votre besoin.
                </p>
              </div>

              {selectedProvider && (
                <div className="mb-4 rounded-[24px] border border-[#dce7f0] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)] px-4 py-4">
                  <div ref={selectedProviderPanelRef} />
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[#edf5fb]">
                      {getProviderImageUrl(selectedProvider) ? (
                        <img
                          src={getProviderImageUrl(selectedProvider)}
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
                      <div className="mt-1 text-sm text-[#70839a]">{selectedProvider.professionLabel || selectedProvider.serviceCategory || "Prestataire"}</div>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-[#5f7184]">
                    {selectedProvider.locationLabel || selectedProvider.serviceAreaLabel}
                    {" "}
                    • {selectedProvider.distanceLabel || getDistanceLabel(selectedProvider.distanceKm)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-white px-3 py-2 text-[#1260a1]">{selectedProvider.professionLabel || selectedProvider.serviceCategory || "Prestataire"}</span>
                    <span className="rounded-full bg-white px-3 py-2 text-[#178b55]">{selectedProvider.availabilityLabel || "Disponible"}</span>
                    {formatPriceRange(selectedProvider.portfolio?.priceFrom, selectedProvider.portfolio?.priceTo) && (
                      <span className="rounded-full bg-white px-3 py-2 text-[#178b55]">
                        Des {formatPriceRange(selectedProvider.portfolio?.priceFrom, selectedProvider.portfolio?.priceTo)}
                      </span>
                    )}
                  </div>
                  {selectedProviderMessage && (
                    <div className="mt-3 rounded-[18px] bg-[#eefaf2] px-4 py-3 text-sm font-semibold text-[#178b55]">
                      {selectedProviderMessage}
                    </div>
                  )}
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

                <div className="rounded-2xl border border-[#dbe8f1] bg-[#fffdfa] px-4 py-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">
                    Discussion avec le prestataire
                  </label>
                  <textarea
                    value={discussionMessage}
                    onChange={(event) => setDiscussionMessage(event.target.value)}
                    rows={4}
                    placeholder="Posez une question, demandez une precision ou expliquez le besoin avant validation."
                    className="w-full rounded-2xl border border-[#e1d8cc] bg-white px-4 py-3 outline-none focus:border-[#1260a1]"
                  />
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => openDiscussion()}
                      disabled={openingDiscussion || !selectedProvider}
                      className="rounded-[22px] border border-[#1260a1] bg-white px-4 py-3 text-sm font-bold text-[#1260a1] disabled:opacity-60"
                    >
                      {openingDiscussion ? "Ouverture..." : "Ouvrir la discussion"}
                    </button>
                    <div className="self-center text-xs text-[#70839a]">
                      La discussion s'ouvre avec le prestataire choisi, puis vous pouvez continuer dans le chat.
                    </div>
                  </div>
                </div>

                {error && <div className="rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}
                {discussionError && <div className="rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{discussionError}</div>}
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
                  2. Regardez tous les prestataires verifies et filtrez selon le metier qui vous interesse.
                </div>
                <div className="rounded-[22px] bg-[#f8fbff] px-4 py-4">
                  3. Discutez si besoin, puis selectionnez le prestataire et envoyez la demande.
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
