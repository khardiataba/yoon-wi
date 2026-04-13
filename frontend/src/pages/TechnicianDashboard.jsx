import { useEffect, useMemo, useState } from "react"
import api from "../api"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import MapPicker from "../components/MapPicker"

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

const isInLast7Days = (date, now) => {
  const diff = now.getTime() - date.getTime()
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
}

const providerFamilyByServiceCategory = {
  Plomberie: "artisan",
  Electricite: "artisan",
  Menuiserie: "artisan",
  Maconnerie: "artisan",
  Peinture: "artisan",
  Soudure: "artisan",
  Jardinage: "other",
  "Coiffure & Beaute": "beauty",
  "Restauration / Patisserie": "food",
  "Autre service": "other",
  Coursier: "delivery",
  "Livraison / Coursier": "delivery",
  Assistant: "other",
  Traducteur: "other",
  Imprimeur: "other",
  Informatique: "other",
  "Cours / Soutien": "other",
  Menage: "other",
  "Baby-sitting": "other",
  "Aide a domicile": "other",
  Evenementiel: "other",
  "Autre activite": "other"
}

const familyLabels = {
  artisan: "Artisan",
  food: "Restauration",
  beauty: "Beaute",
  delivery: "Livraison",
  other: "Autres services"
}

const areaCoordinatesByLabel = {
  "Centre-ville": { lat: 16.0244, lng: -16.5015 },
  "Guet-Ndar": { lat: 16.0188, lng: -16.4919 },
  Hydrobase: { lat: 16.042, lng: -16.5065 },
  Sor: { lat: 16.0068, lng: -16.5205 },
  Balacoss: { lat: 16.0149, lng: -16.5072 },
  Ndioloffene: { lat: 16.0312, lng: -16.5078 },
  "Universite / Sanar": { lat: 16.0567, lng: -16.4568 },
  Gandon: { lat: 16.018, lng: -16.3728 },
  "Toute la ville de Saint-Louis": { lat: 16.0244, lng: -16.5015 }
}

const areaOptions = Object.keys(areaCoordinatesByLabel)

const paymentMethods = [
  { value: "Wave", label: "Wave" },
  { value: "Orange Money", label: "Orange Money" },
  { value: "Free Money", label: "Free Money" },
  { value: "Cash", label: "Cash" }
]

const statusMetaByValue = {
  pending: { label: "A traiter", tone: "bg-[#fff8ea] text-[#9a7a24]" },
  quoted: { label: "Devis envoye", tone: "bg-[#fff7eb] text-[#8b6d2f]" },
  accepted: { label: "Accord", tone: "bg-[#edf5fb] text-[#1260a1]" },
  in_progress: { label: "En cours", tone: "bg-[#eefaf2] text-[#178b55]" },
  completed: { label: "Terminee", tone: "bg-[#edf3f8] text-[#1260a1]" },
  cancelled: { label: "Annulee", tone: "bg-[#fff1f1] text-[#c45860]" }
}

const dashboardThemes = {
  beauty: {
    pageClass: "bg-[radial-gradient(circle_at_top,#fff6fa_0%,#fffdfd_42%,#f9eef3_100%)]",
    headerClass: "border border-[#efc5d2] bg-[linear-gradient(180deg,#fff4f8_0%,#ffe2ea_100%)]",
    title: "Dashboard Salon & Beaute",
    subtitle: "Les mises en beaute, coiffures et soins de salon arrivent ici en priorite.",
    intro: "Consultez les demandes de beaute disponibles et suivez vos prestations acceptees.",
    badge: "Salon connecte",
    availableTitle: "Demandes beaute",
    availableCopy: "Demandes de coiffure, soins et mise en beaute en attente de prise en charge.",
    missionTitle: "Mes prestations",
    missionCopy: "Prestations beaute que vous avez recues ou acceptees."
  },
  delivery: {
    pageClass: "bg-[radial-gradient(circle_at_top,#f0f8ff_0%,#fbfdff_42%,#eef8f1_100%)]",
    headerClass: "border border-[#bfd8ea] bg-[linear-gradient(180deg,#eef8ff_0%,#dff0fb_100%)]",
    title: "Dashboard Livraison",
    subtitle: "Les colis, documents et courses urgentes arrivent dans cet espace dedie.",
    intro: "Prenez en charge les demandes de livraison et suivez les missions en cours.",
    badge: "Livraison express",
    availableTitle: "Demandes livraison",
    availableCopy: "Colis, documents et depots urgents en attente de coursier.",
    missionTitle: "Mes livraisons",
    missionCopy: "Livraisons deja acceptees ou en cours de traitement."
  },
  other: {
    pageClass: "bg-[radial-gradient(circle_at_top,#f7f5f0_0%,#fbfaf7_40%,#f3f4f6_100%)]",
    headerClass: "border border-[#d9d2c5] bg-[linear-gradient(180deg,#fffaf2_0%,#f3eadb_100%)]",
    title: "Dashboard Autres Prestataires",
    subtitle: "Demandes sur mesure, services specialises et besoins ponctuels.",
    intro: "Trouvez rapidement les demandes de votre domaine et suivez vos prestations.",
    badge: "Sur mesure",
    availableTitle: "Demandes disponibles",
    availableCopy: "Demandes en attente pour les prestataires de services varies.",
    missionTitle: "Mes missions",
    missionCopy: "Demandes recues ou deja acceptees dans votre espace."
  }
}

const resolveVariant = (serviceCategory) => {
  if (serviceCategory === "Coiffure & Beaute") return "beauty"
  if (serviceCategory === "Coursier" || serviceCategory === "Livraison / Coursier") return "delivery"
  return "other"
}

const TechnicianDashboard = ({ variant: forcedVariant }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, fetchProfile } = useAuth()
  const variant = forcedVariant || resolveVariant(user?.providerDetails?.serviceCategory)
  const theme = dashboardThemes[variant] || dashboardThemes.other

  const [available, setAvailable] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [busyRequestId, setBusyRequestId] = useState(null)
  const [settlingRequestId, setSettlingRequestId] = useState(null)
  const [paymentDraftById, setPaymentDraftById] = useState({})
  const [safetyDraftById, setSafetyDraftById] = useState({})
  const [quoteDraftById, setQuoteDraftById] = useState({})
  const [locationSaving, setLocationSaving] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [locationMessage, setLocationMessage] = useState(null)
  const [locationDraft, setLocationDraft] = useState({
    serviceArea: user?.providerDetails?.serviceArea || "",
    locationLabel: user?.providerDetails?.locationLabel || user?.providerDetails?.serviceArea || "",
    coordinates: user?.providerDetails?.coordinates || null
  })

  const providerFamily = providerFamilyByServiceCategory[user?.providerDetails?.serviceCategory] || "other"
  const providerFamilyLabel = familyLabels[providerFamily] || "Autres services"
  const locationCenter =
    locationDraft.coordinates ||
    (locationDraft.serviceArea && areaCoordinatesByLabel[locationDraft.serviceArea]) ||
    areaCoordinatesByLabel["Centre-ville"]
  const locationMarkers = locationDraft.coordinates
    ? [
        {
          id: "provider-location",
          lat: locationDraft.coordinates.lat,
          lng: locationDraft.coordinates.lng,
          label: "Ma localisation",
          emoji: "📍",
          background: "#1260a1"
        }
      ]
    : []

  useEffect(() => {
    setLocationDraft({
      serviceArea: user?.providerDetails?.serviceArea || "",
      locationLabel: user?.providerDetails?.locationLabel || user?.providerDetails?.serviceArea || "",
      coordinates: user?.providerDetails?.coordinates || null
    })
  }, [user?.providerDetails?.coordinates, user?.providerDetails?.locationLabel, user?.providerDetails?.serviceArea])

  const updatePaymentDraft = (requestId, field, value) => {
    setPaymentDraftById((current) => ({
      ...current,
      [requestId]: {
        paymentMethod: "Wave",
        reference: "",
        amountPaid: "",
        ...(current[requestId] || {}),
        [field]: value
      }
    }))
  }

  const updateSafetyDraft = (requestId, value) => {
    setSafetyDraftById((current) => ({
      ...current,
      [requestId]: {
        ...(current[requestId] || {}),
        safetyCode: value
      }
    }))
  }

  const updateQuoteDraft = (requestId, value) => {
    setQuoteDraftById((current) => ({
      ...current,
      [requestId]: {
        ...(current[requestId] || {}),
        quotedPrice: value
      }
    }))
  }

  const updateLocationDraft = (field, value) => {
    setLocationDraft((current) => {
      const next = { ...current, [field]: value }
      if (field === "serviceArea" && areaCoordinatesByLabel[value]) {
        next.locationLabel = value
        if (!current.coordinates) {
          next.coordinates = areaCoordinatesByLabel[value]
        }
      }
      return next
    })
    setLocationError(null)
  }

  const handleLocationSelect = (location) => {
    setLocationDraft((current) => ({
      ...current,
      coordinates: {
        lat: Number(location.lat),
        lng: Number(location.lng)
      },
      locationLabel: current.locationLabel || current.serviceArea || "Localisation partagee"
    }))
    setLocationError(null)
  }

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const [availRes, mineRes] = await Promise.all([api.get("/services/available"), api.get("/services")])
      setAvailable(Array.isArray(availRes.data) ? availRes.data : [])
      setMyRequests(Array.isArray(mineRes.data) ? mineRes.data : [])
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  const saveLocation = async () => {
    try {
      setLocationSaving(true)
      setLocationError(null)
      setLocationMessage(null)

      await api.patch("/auth/me", {
        providerDetails: {
          serviceArea: locationDraft.serviceArea,
          locationLabel: locationDraft.locationLabel || locationDraft.serviceArea || "",
          coordinates: locationDraft.coordinates
        }
      })

      await fetchProfile()
      setLocationMessage("Localisation mise a jour avec succes.")
    } catch (err) {
      setLocationError(err.response?.data?.message || "Impossible de mettre a jour la localisation.")
    } finally {
      setLocationSaving(false)
    }
  }

  const quoteRequest = async (request) => {
    const quotedPrice = Number(quoteDraftById[request._id]?.quotedPrice)

    // Validation robuste du prix
    if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) {
      setError("Veuillez saisir un prix de devis valide (supérieur à 0 FCFA).")
      return
    }

    if (quotedPrice < 500) {
      setError("Le prix minimum pour un service est de 500 FCFA.")
      return
    }

    if (quotedPrice > 500000) {
      setError("Le prix maximum pour un service est de 500 000 FCFA.")
      return
    }

    // Vérifier que le prix est un nombre entier (pas de centimes pour FCFA)
    if (quotedPrice !== Math.floor(quotedPrice)) {
      setError("Le prix doit être un nombre entier (pas de centimes).")
      return
    }

    try {
      setBusyRequestId(request._id)
      setActionMessage(null)
      setError(null)
      await api.patch(`/services/${request._id}/accept`, {
        quotedPrice,
        quoteNote: quoteDraftById[request._id]?.quoteNote || ""
      })
      setActionMessage("Devis envoyé au client.")
      fetchRequests()
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'envoyer le devis")
    } finally {
      setBusyRequestId(null)
    }
  }

  const startRequest = async (request) => {
    const safetyCode = String(safetyDraftById[request._id]?.safetyCode || "").trim()
    if (!safetyCode) {
      setError("Veuillez saisir le code de sécurité partagé par le client.")
      return
    }

    try {
      setBusyRequestId(request._id)
      setActionMessage(null)
      setError(null)
      await api.patch(`/services/${request._id}/start`, { safetyCode })
      setActionMessage("Code de sécurité vérifié.")
      fetchRequests()
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de verifier le code")
    } finally {
      setBusyRequestId(null)
    }
  }

  const completeRequest = async (id) => {
    try {
      setBusyRequestId(id)
      setActionMessage(null)
      setError(null)
      await api.patch(`/services/${id}/complete`)
      setActionMessage("Mission cloturee.")
      fetchRequests()
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de cloturer la mission")
    } finally {
      setBusyRequestId(null)
    }
  }

  const settleAndCompleteRequest = async (request) => {
    try {
      setSettlingRequestId(request._id)
      setActionMessage(null)
      setError(null)

      if (request.status === "accepted") {
        const safetyDraft = safetyDraftById[request._id] || {}
        const safetyCode = String(safetyDraft.safetyCode || "").trim()
        if (!safetyCode) {
          throw new Error("Veuillez saisir le code de sécurité partagé par le client.")
        }
        await api.patch(`/services/${request._id}/start`, { safetyCode })
      }

      if (request.platformContributionStatus !== "paid") {
        const draft = paymentDraftById[request._id] || {}
        const paymentMethod = String(draft.paymentMethod || "").trim()
        const reference = String(draft.reference || "").trim()
        const amountPaid = Number(draft.amountPaid)
        const expectedAmount = Number(request.appCommissionAmount) || 0

        const allowedPaymentMethods = ["Wave", "Orange Money", "Free Money", "Cash"]
        if (!allowedPaymentMethods.includes(paymentMethod)) {
          throw new Error("Choisissez un mode de paiement valide.")
        }

        if (!reference || reference.length < 3) {
          throw new Error("La reference de paiement est obligatoire.")
        }

        if (!Number.isFinite(amountPaid) || amountPaid < 0) {
          throw new Error("Le montant de contribution est obligatoire.")
        }

        if (amountPaid < 100) {
          throw new Error("Le montant minimum de contribution est de 100 FCFA.")
        }

        if (amountPaid > 10000) {
          throw new Error("Le montant maximum de contribution est de 10 000 FCFA.")
        }

        if (expectedAmount > 0 && amountPaid !== expectedAmount) {
          throw new Error(`Le montant saisi doit être exactement de ${expectedAmount} F.`)
        }

        await api.patch(`/services/${request._id}/confirm-payment`, {
          paymentMethod,
          reference,
          amountPaid
        })
      }

      await api.patch(`/services/${request._id}/complete`)
      setActionMessage("Contribution reglee et mission cloturee.")
      fetchRequests()
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Impossible de regler la contribution et cloturer")
    } finally {
      setSettlingRequestId(null)
    }
  }

  const payOnlineRequest = async (request) => {
    try {
      setSettlingRequestId(request._id)
      setActionMessage(null)
      setError(null)

      if (request.status === "accepted") {
        const safetyDraft = safetyDraftById[request._id] || {}
        const safetyCode = String(safetyDraft.safetyCode || "").trim()
        if (!safetyCode) {
          throw new Error("Veuillez saisir le code de sécurité partagé par le client.")
        }
        await api.patch(`/services/${request._id}/start`, { safetyCode })
      }

      const response = await api.post(`/services/${request._id}/online-payment-session`)
      const checkoutUrl = response.data?.checkoutUrl
      if (!checkoutUrl) {
        setActionMessage("La contribution est déjà réglée.")
        fetchRequests()
        return
      }

      window.location.href = checkoutUrl
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Impossible de lancer le paiement en ligne")
    } finally {
      setSettlingRequestId(null)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const paymentStatus = params.get("payment")
    const requestId = params.get("serviceRequestId")

    if (paymentStatus === "stripe_success") {
      setActionMessage("Paiement en ligne reçu. La contribution sera visible sous peu.")
      fetchRequests()
    }

    if (paymentStatus === "stripe_cancel") {
      setActionMessage("Paiement annulé. Vous pouvez relancer la contribution quand vous voulez.")
    }

    if (requestId && paymentStatus) {
      // On garde l'information dans l'URL, mais on ne force pas la clôture sans vérification du statut.
    }
  }, [location.search])

  const revenue = useMemo(() => {
    const now = new Date()
    return myRequests.reduce(
      (acc, req) => {
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
      },
      {
        totalGross: 0,
        totalCommission: 0,
        totalNet: 0,
        todayNet: 0,
        weekNet: 0
      }
    )
  }, [myRequests])

  const workflowStats = useMemo(() => {
    return myRequests.reduce(
      (acc, req) => {
        const status = String(req.status || "pending")
        acc.total += 1
        if (status === "quoted") acc.quoted += 1
        if (status === "accepted") acc.accepted += 1
        if (status === "in_progress") acc.inProgress += 1
        if (status === "completed") acc.completed += 1
        return acc
      },
      { total: 0, quoted: 0, accepted: 0, inProgress: 0, completed: 0 }
    )
  }, [myRequests])

  return (
    <div className={`min-h-screen px-4 py-8 ${theme.pageClass}`}>
      <div className="ndar-shell space-y-4">
        <header className={`ndar-card rounded-[34px] p-6 ${theme.headerClass}`}>
          <div className="inline-flex rounded-full border border-white/50 bg-white/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#1260a1]">
            {theme.badge}
          </div>
          <div className="mt-4 font-['Sora'] text-3xl font-extrabold text-[#16324f]">{theme.title}</div>
          <p className="mt-2 text-sm text-[#70839a]">{theme.subtitle}</p>
          <p className="mt-2 text-sm text-[#70839a]">
            {theme.intro} Domaine actif: {providerFamilyLabel.toLowerCase()}.
          </p>
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
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-[22px] bg-white/70 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Demandes</div>
              <div className="mt-2 font-['Sora'] text-2xl font-bold text-[#16324f]">{workflowStats.total}</div>
            </div>
            <div className="rounded-[22px] bg-white/70 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Devis envoyes</div>
              <div className="mt-2 font-['Sora'] text-2xl font-bold text-[#8b6d2f]">{workflowStats.quoted}</div>
            </div>
            <div className="rounded-[22px] bg-white/70 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">A valider</div>
              <div className="mt-2 font-['Sora'] text-2xl font-bold text-[#1260a1]">{workflowStats.accepted}</div>
            </div>
            <div className="rounded-[22px] bg-white/70 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">En cours</div>
              <div className="mt-2 font-['Sora'] text-2xl font-bold text-[#178b55]">{workflowStats.inProgress}</div>
            </div>
          </div>
        </header>

        {error && <div className="ndar-card rounded-[24px] bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}
        {actionMessage && <div className="ndar-card rounded-[24px] bg-[#eefaf2] px-4 py-3 text-sm text-[#178b55]">{actionMessage}</div>}
        <section className="ndar-card rounded-[30px] p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <div className="inline-flex rounded-full bg-[#edf5fb] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1260a1]">
                Localisation prestataire
              </div>
              <h2 className="mt-3 font-['Sora'] text-xl font-bold text-[#16324f]">Mettre a jour ma position</h2>
              <p className="mt-2 text-sm text-[#70839a]">
                Les clients verront votre zone et votre position approximative pour choisir le prestataire le plus proche ou le plus qualifie.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Zone de couverture</label>
                  <select
                    value={locationDraft.serviceArea || ""}
                    onChange={(event) => updateLocationDraft("serviceArea", event.target.value)}
                    className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 text-sm outline-none focus:border-[#1260a1]"
                  >
                    <option value="">Choisir une zone</option>
                    {areaOptions.map((area) => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[22px] bg-[#f8fbff] px-4 py-4 text-sm text-[#5f7184]">
                  {locationDraft.coordinates
                    ? `Position actuelle: ${locationDraft.coordinates.lat.toFixed(4)}, ${locationDraft.coordinates.lng.toFixed(4)}`
                    : "Cliquez sur la carte pour partager votre position exacte."}
                </div>

                {locationError && <div className="rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{locationError}</div>}
                {locationMessage && <div className="rounded-2xl bg-[#eefaf2] px-4 py-3 text-sm text-[#178b55]">{locationMessage}</div>}

                <button
                  type="button"
                  onClick={saveLocation}
                  disabled={locationSaving}
                  className="w-full rounded-[26px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_22px_42px_rgba(8,35,62,0.22)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {locationSaving ? "Enregistrement..." : "Enregistrer ma localisation"}
                </button>
              </div>
            </div>

            <div className="h-[360px] overflow-hidden rounded-[28px] border border-[#dbe8f1] bg-white">
              <MapPicker
                center={locationCenter}
                readOnly={false}
                selectionMode="pickup"
                extraMarkers={locationMarkers}
                onSelectPickup={handleLocationSelect}
              />
            </div>
          </div>
        </section>

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
                <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">{theme.availableTitle}</h2>
                <p className="text-sm text-[#70839a]">{theme.availableCopy}</p>
              </div>

              {available.length === 0 ? (
                <div className="rounded-[24px] bg-[#f8fbff] px-5 py-6 text-sm text-[#70839a]">Aucune demande disponible pour le moment.</div>
              ) : (
                <div className="space-y-3">
                  {available.map((req) => (
                    <article key={req._id} className="rounded-[24px] border border-[#e2eaf2] bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold capitalize text-[#16324f]">{req.serviceFamilyLabel || providerFamilyLabel}</div>
                          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#70839a]">{req.category}</div>
                          <div className="mt-1 text-sm text-[#70839a]">{req.title || req.description}</div>
                          <div className="mt-2 text-xs text-[#70839a]">Le client décrit son besoin. C'est au prestataire de fixer le prix du devis.</div>
                          {req.status === "quoted" && req.quotedPrice > 0 && (
                            <div className="mt-3 rounded-[18px] bg-[#fff7eb] px-4 py-3 text-sm text-[#8b6d2f]">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7a24]">Devis en attente</div>
                              <div className="mt-1 font-semibold">{req.quotedPrice.toLocaleString()} F</div>
                              {req.quoteNote && <div className="mt-1 text-xs text-[#6f5a28]">{req.quoteNote}</div>}
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-[#edf5fb] px-3 py-2 text-[#1260a1]">Contribution appli: {req.appCommissionPercent || 1}% min. 100 F ({(req.appCommissionAmount || 0).toLocaleString()} F)</span>
                            <span className="rounded-full bg-[#eefaf2] px-3 py-2 text-[#178b55]">Net prestataire: {(req.providerNetAmount || Math.max(0, (req.price || 0) - (req.appCommissionAmount || 0))).toLocaleString()} F</span>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-[#70839a]">Contribution app: {req.platformContributionStatus || "due"}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => quoteRequest(req)} disabled={busyRequestId === req._id} className="rounded-2xl bg-[#18c56e] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70">Envoyer devis</button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <div>
                          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Prix proposé</label>
                          <input
                            value={quoteDraftById[req._id]?.quotedPrice || ""}
                            onChange={(event) => updateQuoteDraft(req._id, "quotedPrice", event.target.value)}
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Ex: 15000"
                            className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 text-sm outline-none focus:border-[#1260a1]"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Note devis</label>
                          <input
                            value={quoteDraftById[req._id]?.quoteNote || ""}
                            onChange={(event) => updateQuoteDraft(req._id, "quoteNote", event.target.value)}
                            placeholder="Main d'oeuvre, materiel, deplacement..."
                            className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 text-sm outline-none focus:border-[#1260a1]"
                          />
                        </div>
                        <button onClick={() => quoteRequest(req)} disabled={busyRequestId === req._id} className="rounded-2xl bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70">
                          {busyRequestId === req._id ? "Envoi..." : "Proposer"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="ndar-card rounded-[30px] p-5">
              <div className="mb-4">
                <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">{theme.missionTitle}</h2>
                <p className="text-sm text-[#70839a]">{theme.missionCopy}</p>
              </div>

              {myRequests.length === 0 ? (
                <div className="rounded-[24px] bg-[#f8fbff] px-5 py-6 text-sm text-[#70839a]">Aucune mission pour le moment.</div>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((req) => (
                    <article key={req._id} className="rounded-[24px] border border-[#e2eaf2] bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold capitalize text-[#16324f]">{req.serviceFamilyLabel || providerFamilyLabel}</div>
                          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#70839a]">{req.category}</div>
                          <div className="mt-1 text-sm text-[#70839a]">{req.title || req.description}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className={`rounded-full px-3 py-2 ${statusMetaByValue[req.status]?.tone || "bg-[#fff8ea] text-[#9a7a24]"}`}>
                              {statusMetaByValue[req.status]?.label || req.status}
                            </span>
                            {req.quotedPrice > 0 && (
                              <span className="rounded-full bg-[#fff7eb] px-3 py-2 text-[#8b6d2f]">Devis: {req.quotedPrice.toLocaleString()} F</span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-[#edf5fb] px-3 py-2 text-[#1260a1]">Contribution appli: {req.appCommissionPercent || 1}% min. 100 F ({(req.appCommissionAmount || 0).toLocaleString()} F)</span>
                            <span className="rounded-full bg-[#eefaf2] px-3 py-2 text-[#178b55]">Net prestataire: {(req.providerNetAmount || Math.max(0, (req.price || 0) - (req.appCommissionAmount || 0))).toLocaleString()} F</span>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-[#70839a]">Contribution app: {req.platformContributionStatus || "due"}</div>
                          {req.platformContributionReference && (
                            <div className="mt-1 text-xs text-[#70839a]">Ref: {req.platformContributionReference}</div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full bg-[#eefaf2] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#178b55]">{req.status}</span>
                          <span className="rounded-full bg-[#fff7eb] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a7a24]">
                            {req.platformContributionStatus === "paid" ? "Paiement ok" : "Paiement requis"}
                          </span>
                        </div>
                      </div>

                      {req.status === "accepted" && (
                        <div className="mt-4 rounded-[22px] bg-[linear-gradient(180deg,#fff7eb_0%,#fff1db_100%)] p-4">
                          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                            <div>
                              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Code de sécurité client</label>
                              <input
                                value={safetyDraftById[req._id]?.safetyCode || ""}
                                onChange={(event) => updateSafetyDraft(req._id, event.target.value)}
                                placeholder="Code partagé par le client"
                                className="w-full rounded-2xl border border-[#d8caa7] bg-white px-4 py-3 text-sm outline-none focus:border-[#a97a18]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => startRequest(req)}
                              disabled={busyRequestId === req._id}
                              className="rounded-2xl bg-[linear-gradient(135deg,#a97a18_0%,#8b6d2f_100%)] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {busyRequestId === req._id ? "Vérification..." : "Verifier le code"}
                            </button>
                          </div>
                          <div className="mt-3 text-xs text-[#5f7184]">
                            Demandez ce code au client avant de commencer. Il permet de relier la bonne prestation au bon demandeur.
                          </div>
                        </div>
                      )}

                      {req.status === "quoted" && (
                        <div className="mt-4 rounded-[22px] bg-[#fffaf0] px-4 py-4 text-sm text-[#8b6d2f]">
                          Le client doit valider ce devis avant le demarrage.
                        </div>
                      )}

                      {req.platformContributionStatus !== "paid" && (req.status === "accepted" || req.status === "in_progress") && (
                          <div className="mt-4 rounded-[22px] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)] p-4">
                          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                            <div>
                              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Mode de paiement</label>
                              <select
                                value={paymentDraftById[req._id]?.paymentMethod || "Wave"}
                                onChange={(event) => updatePaymentDraft(req._id, "paymentMethod", event.target.value)}
                                className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 text-sm outline-none focus:border-[#1260a1]"
                              >
                                {paymentMethods.map((method) => (
                                  <option key={method.value} value={method.value}>{method.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Reference</label>
                              <input
                                value={paymentDraftById[req._id]?.reference || ""}
                                onChange={(event) => updatePaymentDraft(req._id, "reference", event.target.value)}
                                placeholder={`REF-${req._id.slice(-6)}`}
                                className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 text-sm outline-none focus:border-[#1260a1]"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Montant contribution</label>
                              <input
                                value={paymentDraftById[req._id]?.amountPaid || ""}
                                onChange={(event) => updatePaymentDraft(req._id, "amountPaid", event.target.value)}
                                type="number"
                                min="0"
                                step="1"
                                placeholder={String(req.appCommissionAmount || 0)}
                                className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 text-sm outline-none focus:border-[#1260a1]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => payOnlineRequest(req)}
                              disabled={settlingRequestId === req._id}
                              className="rounded-2xl bg-[linear-gradient(135deg,#18c56e_0%,#12804a_100%)] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {settlingRequestId === req._id ? "Ouverture..." : "Payer en ligne"}
                            </button>
                          </div>
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => settleAndCompleteRequest(req)}
                              disabled={settlingRequestId === req._id}
                              className="rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 text-sm font-bold text-[#1260a1] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Paiement manuel et cloture
                            </button>
                          </div>
                          <div className="mt-3 text-xs text-[#5f7184]">
                            Le montant attendu est {Number(req.appCommissionAmount || 0).toLocaleString()} F. Le paiement en ligne confirme la contribution avant la cloture.
                          </div>
                          <div className="mt-3 text-xs text-[#5f7184]">
                            Si Stripe n'est pas configure sur le serveur, utilisez la saisie manuelle ci-dessous comme solution de secours.
                          </div>
                        </div>
                      )}

                      {req.status === "in_progress" && req.platformContributionStatus === "paid" && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => completeRequest(req._id)}
                            disabled={busyRequestId === req._id}
                            className="rounded-2xl bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {busyRequestId === req._id ? "Cloture..." : "Cloturer la mission"}
                          </button>
                          <span className="rounded-2xl bg-[#eefaf2] px-4 py-3 text-xs font-semibold text-[#178b55]">
                            Contribution deja enregistree.
                          </span>
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

export default TechnicianDashboard
