import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import api from "../api"
import { clearAuthDraft, readAuthDraft } from "../authDraft"
import { useAuth } from "../context/AuthContext"

const roles = {
  client: "client",
  provider: "technician",
  driver: "driver",
  other: "technician"
}

const areaOptions = [
  "Centre-ville",
  "Guet-Ndar",
  "Hydrobase",
  "Sor",
  "Balacoss",
  "Ndioloffene",
  "Universite / Sanar",
  "Gandon",
  "Toute la ville de Saint-Louis"
]

const availabilityOptions = [
  "Moins de 5h par semaine",
  "Moins de 7h par jour",
  "Entre 7h et 10h par jour",
  "Temps plein / disponibilite etendue"
]

const experienceOptions = [
  "Moins d'1 an",
  "Moins de 2 ans",
  "2 a 3 ans",
  "Plus de 3 ans"
]

const providerCategoryOptions = [
  "Plomberie",
  "Electricite",
  "Menuiserie",
  "Maconnerie",
  "Peinture",
  "Coiffure & Beaute",
  "Restauration / Patisserie",
  "Autre service"
]

const otherCategoryOptions = [
  "Assistant",
  "Traducteur",
  "Imprimeur",
  "Coursier",
  "Informatique",
  "Autre activite"
]

const vehicleBrandOptions = ["Toyota", "Hyundai", "Kia", "Peugeot", "Renault", "Suzuki", "Yamaha", "Autre"]
const vehicleTypeOptions = ["Berline", "Citadine", "SUV", "Moto", "Scooter", "Van", "Pick-up", "Autre"]

const serviceLabelByDraftRole = {
  client: "client",
  provider: "prestataire",
  driver: "chauffeur",
  other: "autres services"
}

const documentLabels = {
  profilePhoto: "Photo de profil",
  idCardFront: "Carte d'identite recto",
  idCardBack: "Carte d'identite verso",
  license: "Permis de conduire",
  registrationCard: "Carte grise"
}

const isValidPhone = (value) => /^(?:\+221|00221)?\s?(7[05678])\s?\d{3}\s?\d{2}\s?\d{2}$/.test(value.trim())
const isValidPlate = (value) => /^[A-Z]{1,3}-\d{2,4}-[A-Z]{1,3}$/.test(value.trim().toUpperCase())

const Signup = () => {
  const navigate = useNavigate()
  const { register, fetchProfile } = useAuth()
  const [draft, setDraft] = useState(null)
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [idCardFront, setIdCardFront] = useState(null)
  const [idCardBack, setIdCardBack] = useState(null)
  const [license, setLicense] = useState(null)
  const [registrationCard, setRegistrationCard] = useState(null)
  const [providerDetails, setProviderDetails] = useState({
    serviceCategory: "",
    experienceYears: "",
    serviceArea: "",
    availability: "",
    beautySpecialty: "",
    vehicleBrand: "",
    vehicleType: "",
    vehiclePlate: "",
    hasProfessionalTools: false
  })
  const [confirmAccuracy, setConfirmAccuracy] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const nextDraft = readAuthDraft()
    if (!nextDraft) {
      navigate("/")
      return
    }
    setDraft(nextDraft)
  }, [navigate])

  const mappedRole = useMemo(() => roles[draft?.role] || "client", [draft])
  const requiresDocuments = mappedRole === "driver" || mappedRole === "technician"
  const totalSteps = requiresDocuments ? 2 : 1
  const roleLabel = serviceLabelByDraftRole[draft?.role] || "client"
  const requiredDocumentKeys = mappedRole === "driver"
    ? ["profilePhoto", "idCardFront", "idCardBack", "license", "registrationCard"]
    : requiresDocuments
      ? ["profilePhoto", "idCardFront", "idCardBack"]
      : []
  const uploadedCount = requiredDocumentKeys.filter((key) => {
    if (key === "profilePhoto") return Boolean(profilePhoto)
    if (key === "idCardFront") return Boolean(idCardFront)
    if (key === "idCardBack") return Boolean(idCardBack)
    if (key === "license") return Boolean(license)
    if (key === "registrationCard") return Boolean(registrationCard)
    return false
  }).length
  const progressPercent = requiredDocumentKeys.length ? Math.round((uploadedCount / requiredDocumentKeys.length) * 100) : 100
  const previewUrls = useMemo(() => {
    const entries = Object.entries({
      profilePhoto,
      idCardFront,
      idCardBack,
      license,
      registrationCard
    }).map(([key, file]) => [
      key,
      file && file.type?.startsWith("image/") ? URL.createObjectURL(file) : ""
    ])

    return Object.fromEntries(entries)
  }, [profilePhoto, idCardFront, idCardBack, license, registrationCard])

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [previewUrls])

  const updateProviderField = (key, value) => {
    setProviderDetails((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: "" }))
  }

  const clearFieldError = (field) => {
    setErrors((current) => ({ ...current, [field]: "" }))
  }

  const validateStepOne = () => {
    const nextErrors = {}

    if (!email.trim()) nextErrors.email = "L'email est obligatoire."
    if (!password.trim()) nextErrors.password = "Le mot de passe est obligatoire."
    if (password.trim() && password.trim().length < 6) nextErrors.password = "Le mot de passe doit contenir au moins 6 caracteres."
    if (!phone.trim()) nextErrors.phone = "Le numero de telephone est obligatoire."
    if (phone.trim() && !isValidPhone(phone)) nextErrors.phone = "Utilisez un numero senegalais valide, par ex. +221 77 123 45 67."

    if (mappedRole === "technician") {
      if (!providerDetails.serviceCategory) nextErrors.serviceCategory = "Choisissez votre domaine principal."
      if (!providerDetails.serviceArea) nextErrors.serviceArea = "Choisissez une zone de couverture."
      if (!providerDetails.availability) nextErrors.availability = "Choisissez vos disponibilites."
      if (!providerDetails.experienceYears) nextErrors.experienceYears = "Choisissez votre niveau d'experience."
      if (!providerDetails.hasProfessionalTools) nextErrors.hasProfessionalTools = "Confirmez que vous disposez du materiel necessaire."
    }

    if (draft?.role === "provider" && providerDetails.serviceCategory === "Coiffure & Beaute" && !providerDetails.beautySpecialty.trim()) {
      nextErrors.beautySpecialty = "Precisez votre specialite beaute."
    }

    if (mappedRole === "driver") {
      if (!providerDetails.vehicleBrand) nextErrors.vehicleBrand = "Choisissez la marque du vehicule."
      if (!providerDetails.vehicleType) nextErrors.vehicleType = "Choisissez le type de vehicule."
      if (!providerDetails.vehiclePlate.trim()) nextErrors.vehiclePlate = "L'immatriculation est obligatoire."
      if (providerDetails.vehiclePlate.trim() && !isValidPlate(providerDetails.vehiclePlate)) nextErrors.vehiclePlate = "Format attendu: SL-1234-AA."
      if (!providerDetails.serviceArea) nextErrors.serviceArea = "Choisissez une zone de couverture."
      if (!providerDetails.availability) nextErrors.availability = "Choisissez vos disponibilites."
      if (!providerDetails.experienceYears) nextErrors.experienceYears = "Choisissez votre niveau d'experience."
      if (!providerDetails.hasProfessionalTools) nextErrors.hasProfessionalTools = "Confirmez que le vehicule et les moyens sont disponibles."
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validateDocuments = () => {
    const nextErrors = {}

    if (requiresDocuments) {
      if (!profilePhoto) nextErrors.profilePhoto = "Votre photo est obligatoire."
      if (!idCardFront) nextErrors.idCardFront = "Le recto de la carte d'identite est obligatoire."
      if (!idCardBack) nextErrors.idCardBack = "Le verso de la carte d'identite est obligatoire."
      if (mappedRole === "driver" && !license) nextErrors.license = "Le permis de conduire est obligatoire."
      if (mappedRole === "driver" && !registrationCard) nextErrors.registrationCard = "La carte grise est obligatoire."
      if (!confirmAccuracy) nextErrors.confirmAccuracy = "Vous devez confirmer l'exactitude des informations avant validation."
    }

    setErrors((current) => ({ ...current, ...nextErrors }))
    return Object.keys(nextErrors).length === 0
  }

  const handleNextStep = () => {
    setSubmitError(null)
    if (validateStepOne()) {
      setStep(2)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError(null)

    if (!validateStepOne()) {
      setStep(1)
      return
    }

    if (requiresDocuments && !validateDocuments()) {
      setStep(2)
      return
    }

    try {
      setLoading(true)

      const response = await register({
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: email.trim(),
        password: password.trim(),
        phone: phone.trim(),
        role: mappedRole,
        providerDetails: {
          ...providerDetails,
          vehiclePlate: providerDetails.vehiclePlate?.trim().toUpperCase() || ""
        }
      })

      const token = response.token

      try {
        localStorage.setItem("token", token)
      } catch (storageError) {
        console.error("Impossible de sauvegarder le token:", storageError)
      }

      if (requiresDocuments) {
        const form = new FormData()
        form.append("profilePhoto", profilePhoto)
        form.append("idCardFront", idCardFront)
        form.append("idCardBack", idCardBack)
        if (license) form.append("license", license)
        if (registrationCard) form.append("registrationCard", registrationCard)

        await api.post("/auth/upload-docs", form, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }

      await fetchProfile()
      clearAuthDraft()
      navigate("/")
    } catch (signupError) {
      console.error("Erreur d'inscription:", signupError)
      setSubmitError(signupError.userMessage || "Inscription impossible pour le moment.")
    } finally {
      setLoading(false)
    }
  }

  if (!draft) return null

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="ndar-shell space-y-4">
        <div className="ndar-panel ndar-hero-grid rounded-[38px] border border-white/10 p-6 text-center">
          <div className="ndar-hero-chip mx-auto inline-flex rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em]">
            Onboarding partenaire
          </div>
          <div className="mt-4 font-['Sora'] text-[40px] font-extrabold text-white">
            Ndar<span className="ndar-hero-accent">Express</span>
          </div>
          <p className="ndar-hero-copy mt-3 text-sm">
            Parcours d'inscription pour {draft.firstName} {draft.lastName} ({roleLabel}).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="ndar-card rounded-[38px] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="ndar-chip">Dossier professionnel</div>
              <h1 className="mt-4 font-['Sora'] text-3xl font-extrabold text-[#16324f]">Finaliser mon compte</h1>
            </div>
            <div className="rounded-[22px] bg-[linear-gradient(180deg,#edf5fb_0%,#dcebf8_100%)] px-4 py-3 text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f7894]">Etape</div>
              <div className="mt-1 font-['Sora'] text-lg font-bold text-[#1260a1]">{step}/{totalSteps}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className={`rounded-[22px] px-4 py-3 text-sm font-semibold ${step === 1 ? "bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] text-white" : "bg-[#edf3f8] text-[#5f7894]"}`}>
              1. Informations
            </div>
            {requiresDocuments && (
              <div className={`rounded-[22px] px-4 py-3 text-sm font-semibold ${step === 2 ? "bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] text-white" : "bg-[#edf3f8] text-[#5f7894]"}`}>
                2. Dossiers
              </div>
            )}
          </div>

          {step === 1 && (
            <>
              <p className="mt-5 text-sm text-[#70839a]">
                {mappedRole === "client"
                  ? "Renseignez vos informations de connexion."
                  : "Renseignez vos informations, votre zone, votre disponibilite et vos donnees professionnelles avant de passer aux documents."}
              </p>

              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Prenom</label>
                    <input value={draft.firstName} disabled className="w-full rounded-2xl border border-[#d7e5f1] bg-[#edf5fb] px-4 py-3 text-[#165c96] outline-none" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Nom</label>
                    <input value={draft.lastName} disabled className="w-full rounded-2xl border border-[#d7e5f1] bg-[#edf5fb] px-4 py-3 text-[#165c96] outline-none" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Email</label>
                  <input value={email} onChange={(event) => { setEmail(event.target.value); clearFieldError("email") }} type="email" placeholder="nom@email.com" required className="w-full rounded-2xl border border-[#e1d8cc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-3 outline-none focus:border-[#1260a1]" />
                  {errors.email && <div className="mt-2 text-sm text-[#c45860]">{errors.email}</div>}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Mot de passe</label>
                  <input value={password} onChange={(event) => { setPassword(event.target.value); clearFieldError("password") }} type="password" placeholder="Au moins 6 caracteres" required className="w-full rounded-2xl border border-[#e1d8cc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-3 outline-none focus:border-[#1260a1]" />
                  {errors.password && <div className="mt-2 text-sm text-[#c45860]">{errors.password}</div>}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Telephone</label>
                  <input value={phone} onChange={(event) => { setPhone(event.target.value); clearFieldError("phone") }} type="tel" placeholder="+221 77 123 45 67" required className="w-full rounded-2xl border border-[#e1d8cc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-3 outline-none focus:border-[#1260a1]" />
                  {errors.phone && <div className="mt-2 text-sm text-[#c45860]">{errors.phone}</div>}
                </div>
              </div>

              {mappedRole === "technician" && (
                <div className="mt-6 space-y-4 rounded-[30px] bg-[linear-gradient(180deg,#f6fbff_0%,#eef5fb_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Questions complementaires</h2>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Votre domaine principal</label>
                    <select value={providerDetails.serviceCategory} onChange={(event) => updateProviderField("serviceCategory", event.target.value)} className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 outline-none focus:border-[#1260a1]">
                      <option value="">Choisir un domaine</option>
                      {(draft.role === "other" ? otherCategoryOptions : providerCategoryOptions).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {errors.serviceCategory && <div className="mt-2 text-sm text-[#c45860]">{errors.serviceCategory}</div>}
                  </div>

                  {draft.role === "provider" && providerDetails.serviceCategory === "Coiffure & Beaute" && (
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Specialite beaute</label>
                      <input value={providerDetails.beautySpecialty} onChange={(event) => updateProviderField("beautySpecialty", event.target.value)} placeholder="Ex: tresses, make-up, soins visage" className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 outline-none focus:border-[#1260a1]" />
                      {errors.beautySpecialty && <div className="mt-2 text-sm text-[#c45860]">{errors.beautySpecialty}</div>}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Zone de couverture</label>
                      <select value={providerDetails.serviceArea} onChange={(event) => updateProviderField("serviceArea", event.target.value)} className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 outline-none focus:border-[#1260a1]">
                        <option value="">Choisir une zone</option>
                        {areaOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {errors.serviceArea && <div className="mt-2 text-sm text-[#c45860]">{errors.serviceArea}</div>}
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Disponibilites</label>
                      <select value={providerDetails.availability} onChange={(event) => updateProviderField("availability", event.target.value)} className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 outline-none focus:border-[#1260a1]">
                        <option value="">Choisir un rythme</option>
                        {availabilityOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {errors.availability && <div className="mt-2 text-sm text-[#c45860]">{errors.availability}</div>}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Annees d'experience</label>
                    <select value={providerDetails.experienceYears} onChange={(event) => updateProviderField("experienceYears", event.target.value)} className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 outline-none focus:border-[#1260a1]">
                      <option value="">Choisir une experience</option>
                      {experienceOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {errors.experienceYears && <div className="mt-2 text-sm text-[#c45860]">{errors.experienceYears}</div>}
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-[#16324f] shadow-[0_10px_22px_rgba(8,35,62,0.06)]">
                    <input type="checkbox" checked={Boolean(providerDetails.hasProfessionalTools)} onChange={(event) => updateProviderField("hasProfessionalTools", event.target.checked)} />
                    Je confirme disposer du materiel necessaire pour travailler.
                  </label>
                  {errors.hasProfessionalTools && <div className="-mt-1 text-sm text-[#c45860]">{errors.hasProfessionalTools}</div>}
                </div>
              )}

              {mappedRole === "driver" && (
                <div className="mt-6 space-y-4 rounded-[30px] bg-[linear-gradient(180deg,#f6fbff_0%,#eef5fb_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Informations chauffeur</h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Marque du vehicule</label>
                      <select value={providerDetails.vehicleBrand} onChange={(event) => updateProviderField("vehicleBrand", event.target.value)} className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 outline-none focus:border-[#1260a1]">
                        <option value="">Choisir une marque</option>
                        {vehicleBrandOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {errors.vehicleBrand && <div className="mt-2 text-sm text-[#c45860]">{errors.vehicleBrand}</div>}
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Type de vehicule</label>
                      <select value={providerDetails.vehicleType} onChange={(event) => updateProviderField("vehicleType", event.target.value)} className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 outline-none focus:border-[#1260a1]">
                        <option value="">Choisir un type</option>
                        {vehicleTypeOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {errors.vehicleType && <div className="mt-2 text-sm text-[#c45860]">{errors.vehicleType}</div>}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Immatriculation</label>
                    <input value={providerDetails.vehiclePlate} onChange={(event) => updateProviderField("vehiclePlate", event.target.value.toUpperCase())} placeholder="SL-1234-AA" className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 uppercase outline-none focus:border-[#1260a1]" />
                    {errors.vehiclePlate && <div className="mt-2 text-sm text-[#c45860]">{errors.vehiclePlate}</div>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Zone de couverture</label>
                      <select value={providerDetails.serviceArea} onChange={(event) => updateProviderField("serviceArea", event.target.value)} className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 outline-none focus:border-[#1260a1]">
                        <option value="">Choisir une zone</option>
                        {areaOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {errors.serviceArea && <div className="mt-2 text-sm text-[#c45860]">{errors.serviceArea}</div>}
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Horaires disponibles</label>
                      <select value={providerDetails.availability} onChange={(event) => updateProviderField("availability", event.target.value)} className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 outline-none focus:border-[#1260a1]">
                        <option value="">Choisir un rythme</option>
                        {availabilityOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {errors.availability && <div className="mt-2 text-sm text-[#c45860]">{errors.availability}</div>}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Experience</label>
                    <select value={providerDetails.experienceYears} onChange={(event) => updateProviderField("experienceYears", event.target.value)} className="w-full rounded-2xl border border-[#dce7f0] bg-white px-4 py-3 outline-none focus:border-[#1260a1]">
                      <option value="">Choisir une experience</option>
                      {experienceOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {errors.experienceYears && <div className="mt-2 text-sm text-[#c45860]">{errors.experienceYears}</div>}
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-[#16324f] shadow-[0_10px_22px_rgba(8,35,62,0.06)]">
                    <input type="checkbox" checked={Boolean(providerDetails.hasProfessionalTools)} onChange={(event) => updateProviderField("hasProfessionalTools", event.target.checked)} />
                    Je confirme que mon vehicule et mes moyens de travail sont disponibles.
                  </label>
                  {errors.hasProfessionalTools && <div className="-mt-1 text-sm text-[#c45860]">{errors.hasProfessionalTools}</div>}
                </div>
              )}

              {submitError && <div className="mt-4 rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{submitError}</div>}

              <div className="mt-6 flex gap-3">
                {requiresDocuments ? (
                  <button type="button" onClick={handleNextStep} className="w-full rounded-[26px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_22px_42px_rgba(8,35,62,0.22)]">
                    Continuer vers les dossiers
                  </button>
                ) : (
                  <button type="submit" disabled={loading} className="w-full rounded-[26px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_22px_42px_rgba(8,35,62,0.22)] disabled:opacity-70">
                    {loading ? "Creation du compte..." : "Creer mon compte"}
                  </button>
                )}
              </div>
            </>
          )}

          {step === 2 && requiresDocuments && (
            <>
              <div className="mt-5 rounded-[30px] bg-[linear-gradient(180deg,#fff8ee_0%,#f8ebd8_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Documents de verification</h2>
                <p className="mt-2 text-sm text-[#5f7894]">
                  Envoyez des photos nettes et bien cadrees. Le systeme verifiera automatiquement vos pieces puis activera ou corrigera le dossier.
                </p>

                <div className="mt-5 rounded-[24px] bg-white/80 px-4 py-4 shadow-[0_12px_24px_rgba(112,79,34,0.08)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70839a]">Progression du dossier</div>
                      <div className="mt-1 font-['Sora'] text-lg font-bold text-[#16324f]">{uploadedCount}/{requiredDocumentKeys.length} pieces ajoutees</div>
                    </div>
                    <div className="rounded-full bg-[#edf5fb] px-3 py-2 text-sm font-bold text-[#1260a1]">{progressPercent}%</div>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e8edf2]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#1260a1_0%,#4f9ad3_100%)] transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {requiredDocumentKeys.map((documentKey) => {
                    const file =
                      documentKey === "profilePhoto" ? profilePhoto :
                      documentKey === "idCardFront" ? idCardFront :
                      documentKey === "idCardBack" ? idCardBack :
                      documentKey === "license" ? license :
                      registrationCard
                    const previewUrl = previewUrls[documentKey]

                    return (
                      <div key={documentKey} className="flex items-center justify-between gap-4 rounded-[22px] bg-white/75 px-4 py-3 text-sm shadow-[0_10px_20px_rgba(112,79,34,0.06)]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] bg-[linear-gradient(180deg,#edf5fb_0%,#e4eef7_100%)] text-xs font-bold text-[#5f7894]">
                            {previewUrl ? (
                              <img src={previewUrl} alt={documentLabels[documentKey]} className="h-full w-full object-cover" />
                            ) : (
                              <span>{file ? "DOC" : "..."}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-[#16324f]">{documentLabels[documentKey]}</div>
                            <div className="mt-1 text-[#70839a]">
                            {file ? `Fichier choisi: ${file.name}` : "En attente d'ajout"}
                            </div>
                          </div>
                        </div>
                        <div className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] ${file ? "bg-[#edf5fb] text-[#1260a1]" : "bg-[#f3ede3] text-[#8a7b67]"}`}>
                          {file ? "Pret" : "En attente"}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Votre photo</label>
                    <div className="mb-2 text-xs text-[#70839a]">Vous pouvez prendre la photo directement avec l'appareil du telephone.</div>
                    <input type="file" accept="image/*" capture="user" onChange={(event) => { setProfilePhoto(event.target.files?.[0] || null); clearFieldError("profilePhoto") }} className="block w-full text-sm text-[#16324f]" />
                    {errors.profilePhoto && <div className="mt-2 text-sm text-[#c45860]">{errors.profilePhoto}</div>}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Carte d'identite recto</label>
                    <div className="mb-2 text-xs text-[#70839a]">Ouvrez l'appareil photo pour cadrer clairement le recto.</div>
                    <input type="file" accept="image/*" capture="environment" onChange={(event) => { setIdCardFront(event.target.files?.[0] || null); clearFieldError("idCardFront") }} className="block w-full text-sm text-[#16324f]" />
                    {errors.idCardFront && <div className="mt-2 text-sm text-[#c45860]">{errors.idCardFront}</div>}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Carte d'identite verso</label>
                    <div className="mb-2 text-xs text-[#70839a]">Ouvrez l'appareil photo pour cadrer clairement le verso.</div>
                    <input type="file" accept="image/*" capture="environment" onChange={(event) => { setIdCardBack(event.target.files?.[0] || null); clearFieldError("idCardBack") }} className="block w-full text-sm text-[#16324f]" />
                    {errors.idCardBack && <div className="mt-2 text-sm text-[#c45860]">{errors.idCardBack}</div>}
                  </div>

                  {mappedRole === "driver" && (
                    <>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Permis de conduire</label>
                        <div className="mb-2 text-xs text-[#70839a]">Vous pouvez prendre une photo ou choisir un fichier deja enregistre.</div>
                        <input type="file" accept="image/*,application/pdf" capture="environment" onChange={(event) => { setLicense(event.target.files?.[0] || null); clearFieldError("license") }} className="block w-full text-sm text-[#16324f]" />
                        {errors.license && <div className="mt-2 text-sm text-[#c45860]">{errors.license}</div>}
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">Carte grise</label>
                        <div className="mb-2 text-xs text-[#70839a]">Vous pouvez prendre une photo ou choisir un fichier deja enregistre.</div>
                        <input type="file" accept="image/*,application/pdf" capture="environment" onChange={(event) => { setRegistrationCard(event.target.files?.[0] || null); clearFieldError("registrationCard") }} className="block w-full text-sm text-[#16324f]" />
                        {errors.registrationCard && <div className="mt-2 text-sm text-[#c45860]">{errors.registrationCard}</div>}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <label className="mt-5 flex items-start gap-3 rounded-[24px] bg-[linear-gradient(180deg,#edf5fb_0%,#e2eef9_100%)] px-4 py-4 text-sm text-[#16324f]">
                <input type="checkbox" checked={confirmAccuracy} onChange={(event) => { setConfirmAccuracy(event.target.checked); clearFieldError("confirmAccuracy") }} className="mt-1" />
                <span>Je confirme que toutes les informations et toutes les pieces fournies sont exactes et peuvent etre verifiees avant validation de mon compte.</span>
              </label>
              {errors.confirmAccuracy && <div className="mt-2 text-sm text-[#c45860]">{errors.confirmAccuracy}</div>}

              {submitError && <div className="mt-4 rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{submitError}</div>}

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="w-1/3 rounded-[26px] bg-[#edf3f8] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#1260a1]">
                  Retour
                </button>
                <button type="submit" disabled={loading} className="w-2/3 rounded-[26px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_22px_42px_rgba(8,35,62,0.22)] disabled:opacity-70">
                  {loading ? "Creation du compte..." : "Confirmer et creer"}
                </button>
              </div>
            </>
          )}

          <p className="mt-5 text-sm text-[#70839a]">
            Vous preferez vous connecter ? <Link to="/login" className="font-semibold text-[#165c96]">Connexion</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default Signup
