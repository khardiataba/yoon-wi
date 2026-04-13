import { useEffect, useState } from "react"
import api from "../api"

const dossierItems = [
  { key: "serviceCategory", label: "Activite" },
  { key: "experienceYears", label: "Experience" },
  { key: "serviceArea", label: "Zone" },
  { key: "availability", label: "Disponibilite" },
  { key: "vehicleType", label: "Vehicule" },
  { key: "vehiclePlate", label: "Immatriculation" },
  { key: "beautySpecialty", label: "Specialite beaute" }
]

const documentLabels = {
  profilePhoto: "Photo",
  idCardFront: "CNI recto",
  idCardBack: "CNI verso",
  license: "Permis",
  registrationCard: "Carte grise"
}

const getBackendOrigin = () => {
  const apiBaseURL = api.defaults.baseURL || ""
  return apiBaseURL.replace(/\/api\/?$/, "")
}

const AdminDashboard = () => {
  const [pendingUsers, setPendingUsers] = useState([])
  const [serviceContributions, setServiceContributions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savingDocumentKey, setSavingDocumentKey] = useState("")
  const [reviewNotes, setReviewNotes] = useState({})

  const fetchPending = async () => {
    try {
      setLoading(true)
      setError(null)
      const [usersRes, servicesRes] = await Promise.all([
        api.get("/admin/users/pending"),
        api.get("/admin/services/contributions")
      ])
      setPendingUsers(usersRes.data)
      setServiceContributions(Array.isArray(servicesRes.data) ? servicesRes.data : [])
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  const verifyUser = async (id) => {
    try {
      await api.patch(`/admin/users/${id}/verify`)
      fetchPending()
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de valider")
    }
  }

  const reviewDocument = async (userId, documentKey, status) => {
    try {
      setSavingDocumentKey(`${userId}-${documentKey}-${status}`)
      setError(null)
      await api.patch(`/admin/users/${userId}/documents-review`, {
        documentKey,
        status
      })
      fetchPending()
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de mettre a jour le document")
    } finally {
      setSavingDocumentKey("")
    }
  }

  const updateReviewNote = (userId, value) => {
    setReviewNotes((current) => ({ ...current, [userId]: value }))
  }

  const requestRevision = async (userId) => {
    try {
      setError(null)
      await api.patch(`/admin/users/${userId}/request-revision`, {
        note: reviewNotes[userId] ?? ""
      })
      fetchPending()
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'envoyer la demande de correction")
    }
  }

  const cancelRegistration = async (userId) => {
    try {
      setError(null)
      await api.patch(`/admin/users/${userId}/cancel`, {
        note: reviewNotes[userId] ?? ""
      })
      fetchPending()
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'annuler l'inscription")
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const backendOrigin = getBackendOrigin()

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="ndar-shell space-y-4">
        <header className="ndar-card rounded-[34px] p-6">
          <div className="font-['Sora'] text-3xl font-extrabold text-[#16324f]">Validation des dossiers</div>
          <p className="mt-2 text-sm text-[#70839a]">Analysez les reponses, les documents et validez les chauffeurs ou prestataires.</p>
        </header>

        <section className="ndar-card rounded-[34px] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Contributions services</h2>
              <p className="text-sm text-[#70839a]">Suivi des contributions obligatoires de 1% avec minimum 100 F pour les services.</p>
            </div>
            <div className="rounded-full bg-[#edf5fb] px-3 py-2 text-xs font-bold text-[#165c96]">
              {serviceContributions.filter((item) => item.platformContributionStatus === "due").length} dues
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] bg-[#f8fbff] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Total demandes</div>
              <div className="mt-2 font-['Sora'] text-2xl font-bold text-[#16324f]">{serviceContributions.length}</div>
            </div>
            <div className="rounded-[22px] bg-[#eefaf2] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4e8a67]">Payées</div>
              <div className="mt-2 font-['Sora'] text-2xl font-bold text-[#178b55]">
                {serviceContributions.filter((item) => item.platformContributionStatus === "paid").length}
              </div>
            </div>
            <div className="rounded-[22px] bg-[#fff8ea] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7a24]">Dues</div>
              <div className="mt-2 font-['Sora'] text-2xl font-bold text-[#9a7a24]">
                {serviceContributions.filter((item) => item.platformContributionStatus === "due").length}
              </div>
            </div>
          </div>
        </section>

        {error && <div className="ndar-card rounded-[24px] bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((item) => <div key={item} className="ndar-card h-40 animate-pulse rounded-[24px]" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <section className="ndar-card rounded-[30px] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-['Sora'] text-xl font-bold text-[#16324f]">Dernières contributions</h2>
                  <p className="text-sm text-[#70839a]">Vérifiez rapidement les demandes de service et leur statut de paiement.</p>
                </div>
                <span className="rounded-full bg-[#edf5fb] px-3 py-2 text-xs font-bold text-[#165c96]">Admin</span>
              </div>

              {serviceContributions.length === 0 ? (
                <div className="rounded-[24px] bg-[#f8fbff] px-5 py-6 text-sm text-[#70839a]">Aucune contribution enregistrée.</div>
              ) : (
                <div className="space-y-3">
                  {serviceContributions.slice(0, 8).map((item) => (
                    <div key={item._id} className="rounded-[24px] border border-[#e2eaf2] bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[#16324f]">{item.title || item.category}</div>
                          <div className="mt-1 text-sm text-[#70839a]">{item.description}</div>
                          <div className="mt-2 text-xs text-[#70839a]">
                            Client: {item.clientId} • Prestataire: {item.technicianId || "en attente"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="rounded-full bg-[#f8fbff] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#165c96]">
                            {item.platformContributionStatus || "due"}
                          </div>
                          <div className="mt-2 font-['Sora'] text-xl font-bold text-[#16324f]">
                            {Number(item.appCommissionAmount || 0).toLocaleString()} F
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {pendingUsers.length === 0 ? (
              <div className="ndar-card rounded-[30px] p-6 text-sm text-[#70839a]">Aucun compte en attente.</div>
            ) : (
              pendingUsers.map((user) => (
                <article key={user._id} className="ndar-card rounded-[30px] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-['Sora'] text-xl font-bold text-[#16324f]">
                        {user.firstName || user.name} {user.lastName || ""}
                      </div>
                      <div className="mt-1 text-sm text-[#70839a]">{user.email}</div>
                      <div className="mt-2 inline-flex rounded-full bg-[#edf5fb] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#165c96]">
                        {user.role}
                      </div>
                      <div className="mt-2 text-sm text-[#70839a]">Statut dossier: {user.status}</div>
                    </div>
                    <button
                      onClick={() => verifyUser(user._id)}
                      className="rounded-2xl bg-[#165c96] px-4 py-3 text-sm font-bold text-white"
                    >
                      Valider le dossier
                    </button>
                  </div>

                  <div className="mt-4 rounded-[24px] bg-[#fff8ea] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70839a]">Retour admin</div>
                    <textarea
                      value={reviewNotes[user._id] ?? user.reviewNote ?? ""}
                      onChange={(event) => updateReviewNote(user._id, event.target.value)}
                      rows={3}
                      placeholder="Expliquez ce qui doit etre corrige ou pourquoi l'inscription doit etre annulee."
                      className="mt-3 w-full rounded-2xl border border-[#eadfbd] bg-white px-4 py-3 text-sm text-[#16324f] outline-none focus:border-[#d7ae49]"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => requestRevision(user._id)}
                        className="rounded-2xl bg-[#fff3d8] px-4 py-3 text-sm font-bold text-[#9a7a24]"
                      >
                        Demander une reprise
                      </button>
                      <button
                        onClick={() => cancelRegistration(user._id)}
                        className="rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm font-bold text-[#c45860]"
                      >
                        Annuler l'inscription
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[24px] bg-[#f8fbff] p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[#70839a]">Contact</div>
                      <div className="mt-2 text-sm text-[#16324f]">Telephone: {user.phone || "Non renseigne"}</div>
                      <div className="mt-2 text-sm text-[#16324f]">Statut: {user.status}</div>
                    </div>
                    <div className="rounded-[24px] bg-[#fff8ea] p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[#70839a]">Documents</div>
                      <div className="mt-2 text-sm text-[#16324f]">CNI: {user.idCardUrl ? "Fournie" : "Manquante"}</div>
                      <div className="mt-2 text-sm text-[#16324f]">CNI recto: {user.idCardFrontUrl ? "Fournie" : "Manquante"}</div>
                      <div className="mt-2 text-sm text-[#16324f]">CNI verso: {user.idCardBackUrl ? "Fournie" : "Manquante"}</div>
                      <div className="mt-2 text-sm text-[#16324f]">Permis: {user.licenseUrl ? "Fourni" : "Non fourni"}</div>
                      <div className="mt-2 text-sm text-[#16324f]">Carte grise: {user.registrationCardUrl ? "Fournie" : "Non fournie"}</div>
                      <div className="mt-2 text-sm text-[#16324f]">Photo: {user.profilePhotoUrl ? "Fournie" : "Manquante"}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[24px] bg-white/80 p-4 ring-1 ring-[#e2eaf2]">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#70839a]">Verification des pieces</div>
                    <div className="grid gap-3">
                      {[
                        { key: "profilePhoto", url: user.profilePhotoUrl, required: true },
                        { key: "idCardFront", url: user.idCardFrontUrl, required: true },
                        { key: "idCardBack", url: user.idCardBackUrl, required: true },
                        { key: "license", url: user.licenseUrl, required: user.role === "driver" },
                        { key: "registrationCard", url: user.registrationCardUrl, required: user.role === "driver" }
                      ].map((document) => {
                        const review = user.documentChecks?.[document.key]
                        const reviewStatus = review?.status || (document.url ? "pending" : "missing")
                        const reviewClass =
                          reviewStatus === "valid"
                            ? "text-[#178b55]"
                            : reviewStatus === "rejected"
                              ? "text-[#c45860]"
                              : "text-[#9a7a24]"

                        return (
                          <div key={document.key} className="rounded-[18px] bg-[#f8fbff] px-4 py-4 text-sm text-[#16324f]">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="font-semibold">{documentLabels[document.key]}</div>
                                <div className={`mt-1 text-xs font-semibold uppercase tracking-[0.16em] ${reviewClass}`}>
                                  {reviewStatus}
                                  {document.required ? " • requis" : " • optionnel"}
                                </div>
                              </div>
                              {document.url ? (
                                <a
                                  href={`${backendOrigin}${document.url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full bg-[#edf5fb] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#165c96]"
                                >
                                  Ouvrir
                                </a>
                              ) : (
                                <span className="text-xs text-[#70839a]">Aucun fichier</span>
                              )}
                            </div>

                            {document.url && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  onClick={() => reviewDocument(user._id, document.key, "valid")}
                                  disabled={savingDocumentKey === `${user._id}-${document.key}-valid`}
                                  className="rounded-full bg-[#eefaf2] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#178b55] disabled:opacity-70"
                                >
                                  Valide
                                </button>
                                <button
                                  onClick={() => reviewDocument(user._id, document.key, "rejected")}
                                  disabled={savingDocumentKey === `${user._id}-${document.key}-rejected`}
                                  className="rounded-full bg-[#fff1f1] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#c45860] disabled:opacity-70"
                                >
                                  Rejete
                                </button>
                                <button
                                  onClick={() => reviewDocument(user._id, document.key, "pending")}
                                  disabled={savingDocumentKey === `${user._id}-${document.key}-pending`}
                                  className="rounded-full bg-[#fff8ea] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#9a7a24] disabled:opacity-70"
                                >
                                  A revoir
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[24px] bg-white/80 p-4 ring-1 ring-[#e2eaf2]">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#70839a]">Dossier detaille</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {dossierItems.map((item) => (
                        <div key={item.key} className="rounded-[18px] bg-[#f8fbff] px-4 py-3 text-sm text-[#16324f]">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">{item.label}</div>
                          <div className="mt-1">{user.providerDetails?.[item.key] || "Non renseigne"}</div>
                        </div>
                      ))}
                      <div className="rounded-[18px] bg-[#f8fbff] px-4 py-3 text-sm text-[#16324f]">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#70839a]">Materiel pro</div>
                        <div className="mt-1">{user.providerDetails?.hasProfessionalTools ? "Oui" : "Non"}</div>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
