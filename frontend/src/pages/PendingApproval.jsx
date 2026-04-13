import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../api"

const documentLabels = {
  profilePhoto: "Photo de profil",
  idCardFront: "Carte d'identite recto",
  idCardBack: "Carte d'identite verso",
  license: "Permis de conduire",
  registrationCard: "Carte grise"
}

const getRequiredDocuments = (user) => {
  if (user?.role === "driver") {
    return ["profilePhoto", "idCardFront", "idCardBack", "license", "registrationCard"]
  }

  if (user?.role === "technician") {
    return ["profilePhoto", "idCardFront", "idCardBack"]
  }

  return []
}

const getStatusTitle = (status) => {
  if (status === "suspended") return "Compte suspendu pour raison de sécurité"
  if (status === "cancelled") return "Inscription annulée"
  if (status === "needs_revision") return "Documents à corriger"
  return "Validation admin en cours"
}

const getStatusDescription = (user) => {
  if (user?.status === "suspended") {
    return user?.safetySuspensionReason || user?.reviewNote || "Votre compte a été suspendu après plusieurs signalements de sécurité. Contactez le support pour faire le point."
  }

  if (user?.status === "cancelled") {
    return user?.reviewNote || "Votre inscription a été annulée. Merci de contacter le support si vous pensez qu'il y a une erreur."
  }

  if (user?.status === "needs_revision") {
    return user?.reviewNote || "Certains documents doivent être corrigés avant validation."
  }

  return "Vos documents sont d'abord analysés automatiquement. Si le dossier est complet, le compte peut être activé."
}

const PendingApproval = () => {
  const navigate = useNavigate()
  const { user, logout, fetchProfile } = useAuth()
  const [uploads, setUploads] = useState({})
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const requiredDocuments = useMemo(() => getRequiredDocuments(user), [user])

  const getDocumentUrl = (documentKey) => {
    if (documentKey === "profilePhoto") return user?.profilePhotoUrl
    if (documentKey === "idCardFront") return user?.idCardFrontUrl
    if (documentKey === "idCardBack") return user?.idCardBackUrl
    if (documentKey === "license") return user?.licenseUrl
    if (documentKey === "registrationCard") return user?.registrationCardUrl
    return ""
  }

  const handleFileChange = (documentKey, file) => {
    setUploads((current) => ({ ...current, [documentKey]: file || null }))
  }

  const submitCorrections = async () => {
    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      const form = new FormData()
      if (uploads.profilePhoto) form.append("profilePhoto", uploads.profilePhoto)
      if (uploads.idCardFront) form.append("idCardFront", uploads.idCardFront)
      if (uploads.idCardBack) form.append("idCardBack", uploads.idCardBack)
      if (uploads.license) form.append("license", uploads.license)
      if (uploads.registrationCard) form.append("registrationCard", uploads.registrationCard)

      if ([...form.keys()].length === 0) {
        setError("Ajoutez au moins un document corrige avant d'envoyer.")
        return
      }

      await api.post("/auth/upload-docs", form)
      await fetchProfile()
      setUploads({})
      setSuccess("Vos corrections ont bien ete envoyees a l'administration.")
    } catch (uploadError) {
      console.error("Erreur d'envoi des corrections:", uploadError)
      setError(uploadError.userMessage || "Impossible d'envoyer les corrections.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="ndar-shell space-y-4">
        <button
          onClick={() => {
            logout()
            navigate("/login", { replace: true })
          }}
          className="mb-3 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-[#1260a1] transition-all hover:bg-white/20"
        >
          ⬅️ Deconnexion
        </button>
        <header className="rounded-[38px] border border-[#d9e8f4] bg-[linear-gradient(180deg,#eef6fc_0%,#deedf8_100%)] p-6 shadow-[0_18px_42px_rgba(18,96,161,0.10)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="ndar-chip bg-[#dbeaf7] text-[#1260a1]">Verification dossier</div>
              <div className="mt-4 font-['Sora'] text-3xl font-extrabold text-[#1260a1]">{getStatusTitle(user?.status)}</div>
              <p className="mt-3 text-sm text-[#1260a1]">
                Bonjour {user?.name || "partenaire"}, {getStatusDescription(user)}
              </p>
              {user?.reviewNote && (
                <div className="mt-4 rounded-[24px] border border-[#d5e5f2] bg-white/85 px-4 py-4 text-sm text-[#1260a1] backdrop-blur-xl">
                  Message admin: {user.reviewNote}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                logout()
                navigate("/login", { replace: true })
              }}
              className="rounded-full border border-[#cfe0ee] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1260a1]"
            >
              Deconnexion
            </button>
          </div>
        </header>

        <section className="ndar-card rounded-[38px] p-6">
          <h1 className="font-['Sora'] text-2xl font-extrabold text-[#16324f]">Etat du dossier</h1>
          <p className="mt-2 text-sm text-[#70839a]">
            Tant que toutes les pieces requises ne sont pas marquees valides par l'admin, l'espace chauffeur/prestataire reste bloque.
          </p>

          <div className="mt-5 grid gap-3">
            {requiredDocuments.map((documentKey) => {
              const hasDocument = Boolean(getDocumentUrl(documentKey))
              const review = user?.documentChecks?.[documentKey]
              const status = review?.status || (hasDocument ? "pending" : "missing")
              const statusLabel =
                status === "valid"
                  ? "Valide"
                  : status === "rejected"
                    ? "Rejete"
                    : status === "pending"
                      ? "En verification"
                      : "En attente"

              const tone =
                status === "valid"
                  ? "bg-[#eefaf2] text-[#178b55]"
                  : status === "rejected"
                    ? "bg-[#fff1f1] text-[#c45860]"
                    : "bg-[#edf5fb] text-[#1260a1]"

              return (
                <div key={documentKey} className="flex items-center justify-between rounded-[26px] bg-[linear-gradient(180deg,#fffdfa_0%,#f6eee3_100%)] px-4 py-4 shadow-[0_12px_28px_rgba(8,35,62,0.06)]">
                  <div>
                    <div className="font-semibold text-[#16324f]">{documentLabels[documentKey]}</div>
                    <div className="mt-1 text-sm text-[#1260a1]">
                      {review?.note ||
                        (hasDocument
                          ? documentKey === "idCardFront" || documentKey === "idCardBack"
                            ? "Ancien dossier detecte ou piece envoyee. Verification ou reprise eventuelle a faire."
                            : "Piece envoyee, en verification."
                          : "Document en attente de depot ou de verification.")}
                    </div>
                  </div>
                  <div className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] ${tone}`}>{statusLabel}</div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="ndar-panel-beige rounded-[38px] p-6">
          <div className="font-['Sora'] text-xl font-bold text-[#16324f]">Et maintenant ?</div>
          <div className="mt-3 space-y-2 text-sm text-[#70839a]">
            <p>1. Le systeme verifie automatiquement la presence et le type des pieces, puis lit leur texte avec OCR.</p>
            <p>2. Si toutes les pieces requises sont reconnues correctement, le compte passe en actif automatiquement.</p>
            <p>3. Si une piece n'est pas reconnue ou parait incorrecte, vous devez la reprendre plus nettement.</p>
          </div>
        </section>

        {user?.status === "suspended" && (
          <section className="ndar-card rounded-[38px] border border-[#f0b0b0] bg-[#fff5f5] p-6">
            <div className="font-['Sora'] text-xl font-bold text-[#a54b55]">Besoin d'aide sécurité ?</div>
            <p className="mt-2 text-sm text-[#a54b55]">
              Votre compte est temporairement suspendu pour sécurité. Le support peut examiner le dossier et vous indiquer la marche à suivre.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/security-support")}
                className="rounded-[26px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_22px_42px_rgba(8,35,62,0.22)]"
              >
                Ouvrir support sécurité
              </button>
            </div>
          </section>
        )}

        {user?.status === "needs_revision" && (
          <section className="ndar-card rounded-[38px] p-6">
            <div className="font-['Sora'] text-xl font-bold text-[#16324f]">Reprendre la partie demandee</div>
            <p className="mt-2 text-sm text-[#70839a]">
              L'administration a demande une correction. Renvoyez les documents concernes avec des informations justes et lisibles.
            </p>

            <div className="mt-5 space-y-4">
              {requiredDocuments.map((documentKey) => (
                <div key={documentKey}>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#70839a]">{documentLabels[documentKey]}</label>
                  <div className="mb-2 text-xs text-[#70839a]">
                    {documentKey === "profilePhoto"
                      ? "Vous pouvez prendre une nouvelle photo avec la camera du telephone."
                      : "Vous pouvez reprendre la piece avec la camera ou choisir un fichier deja enregistre."}
                  </div>
                  <input
                    type="file"
                    accept={documentKey === "profilePhoto" || documentKey === "idCardFront" || documentKey === "idCardBack" ? "image/*" : "image/*,application/pdf"}
                    capture={documentKey === "profilePhoto" ? "user" : "environment"}
                    onChange={(event) => handleFileChange(documentKey, event.target.files?.[0] || null)}
                    className="block w-full rounded-2xl border border-[#e1d8cc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e7_100%)] px-4 py-3 text-sm text-[#16324f]"
                  />
                </div>
              ))}
            </div>

            {error && <div className="mt-4 rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>}
            {success && <div className="mt-4 rounded-2xl bg-[#eefaf2] px-4 py-3 text-sm text-[#178b55]">{success}</div>}

            <button
              type="button"
              onClick={submitCorrections}
              disabled={submitting}
              className="mt-5 rounded-[26px] bg-[linear-gradient(135deg,#1260a1_0%,#0a3760_100%)] px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_22px_42px_rgba(8,35,62,0.22)] disabled:opacity-70"
            >
              {submitting ? "Envoi..." : "Renvoyer les pieces"}
            </button>
          </section>
        )}
      </div>
    </div>
  )
}

export default PendingApproval
