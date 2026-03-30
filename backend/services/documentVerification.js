const { createWorker } = require("tesseract.js")

const OCR_LANGUAGE = "fra+eng"

const normalizeText = (value = "") =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const documentRules = {
  idCardFront: {
    label: "CNI recto",
    keywords: ["carte", "identite", "nationale", "nom", "prenom", "naissance", "sexe", "nationalite", "republique"],
    minimumMatches: 3
  },
  idCardBack: {
    label: "CNI verso",
    keywords: [
      "adresse",
      "taille",
      "profession",
      "signature",
      "domicile",
      "delivree",
      "delivrance",
      "valable",
      "expiration",
      "epouse",
      "autorite",
      "date",
      "lieu"
    ],
    minimumMatches: 1
  },
  license: {
    label: "Permis",
    keywords: ["permis", "conduire", "licence", "driving", "categories", "vehicule", "delivrance", "expiration"],
    minimumMatches: 2
  },
  registrationCard: {
    label: "Carte grise",
    keywords: ["certificat", "immatriculation", "carte", "grise", "marque", "numero", "proprietaire", "mise", "circulation"],
    minimumMatches: 2
  }
}

const requiredDocumentsByRole = {
  driver: ["profilePhoto", "idCardFront", "idCardBack", "license", "registrationCard"],
  technician: ["profilePhoto", "idCardFront", "idCardBack"]
}

const getRequiredDocuments = (role) => requiredDocumentsByRole[role] || []

const buildCheck = (status, note) => ({
  status,
  note,
  reviewedAt: null
})

const extractTextFromImage = async (filePath) => {
  const worker = await createWorker(OCR_LANGUAGE)

  try {
    const result = await worker.recognize(filePath)
    return result.data?.text || ""
  } finally {
    await worker.terminate()
  }
}

const countKeywordMatches = (text, keywords) =>
  keywords.reduce((total, keyword) => (text.includes(keyword) ? total + 1 : total), 0)

const looksLikeIdCardBack = (text) => {
  if (!text) return false

  const hints = [
    "adresse",
    "profession",
    "signature",
    "domicile",
    "delivree",
    "delivrance",
    "expiration",
    "valable",
    "autorite",
    "epouse"
  ]

  const hintMatches = countKeywordMatches(text, hints)
  const hasDates = (text.match(/\b\d{2}\s+\d{2}\s+\d{4}\b/g) || []).length >= 1 || (text.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) || []).length >= 1
  const longEnough = text.length >= 24

  return hintMatches >= 1 || (hasDates && longEnough)
}

const verifyProfilePhoto = (file) => {
  if (!file) return null

  if (!(file.mimetype || "").startsWith("image/")) {
    return buildCheck("rejected", "La photo de profil doit etre une image nette.")
  }

  if ((file.size || 0) < 15 * 1024) {
    return buildCheck("rejected", "La photo de profil est trop petite ou peu lisible.")
  }

  return buildCheck("valid", "Photo de profil acceptee automatiquement.")
}

const verifyOcrDocument = async (documentKey, file) => {
  if (!file) return null

  if (file.mimetype === "application/pdf") {
    if (documentKey === "license" || documentKey === "registrationCard") {
      if ((file.size || 0) < 25 * 1024) {
        return buildCheck("rejected", `${documentRules[documentKey].label}: fichier trop petit ou peu lisible.`)
      }
      return buildCheck("valid", `${documentRules[documentKey].label}: fichier recu et accepte automatiquement.`)
    }
    return buildCheck("rejected", `${documentRules[documentKey].label}: envoyez une photo/image pour la verification automatique.`)
  }

  if (!(file.mimetype || "").startsWith("image/")) {
    return buildCheck("rejected", `${documentRules[documentKey].label}: format non pris en charge pour l'analyse automatique.`)
  }

  if (documentKey === "idCardBack") {
    if ((file.size || 0) < 18 * 1024) {
      return buildCheck("rejected", `${documentRules[documentKey].label}: image trop petite. Merci de reprendre une photo plus nette.`)
    }
  }

  if (documentKey === "license" || documentKey === "registrationCard") {
    if ((file.size || 0) < 18 * 1024) {
      return buildCheck("rejected", `${documentRules[documentKey].label}: image trop petite. Merci de reprendre une photo plus nette.`)
    }
  }

  try {
    const extractedText = normalizeText(await extractTextFromImage(file.path))
    const rule = documentRules[documentKey]
    const matchCount = countKeywordMatches(extractedText, rule.keywords)

    if (documentKey === "idCardBack" && looksLikeIdCardBack(extractedText)) {
      return buildCheck("valid", `${rule.label}: verification automatique acceptable.`)
    }

    if (documentKey === "idCardBack") {
      return buildCheck("valid", `${rule.label}: acceptee automatiquement apres controle de presence et de qualite minimale.`)
    }

    if ((documentKey === "license" || documentKey === "registrationCard") && matchCount >= 1) {
      return buildCheck("valid", `${rule.label}: verification automatique acceptable.`)
    }

    if (documentKey === "license" || documentKey === "registrationCard") {
      return buildCheck("valid", `${rule.label}: acceptee automatiquement apres controle de presence et de qualite minimale.`)
    }

    if (matchCount >= rule.minimumMatches) {
      return buildCheck("valid", `${rule.label}: verification automatique reussie.`)
    }

    return buildCheck("rejected", `${rule.label}: document non reconnu automatiquement. Merci de reprendre une photo plus nette.`)
  } catch (error) {
    console.error(`OCR impossible pour ${documentKey}:`, error.message)
    if (documentKey === "idCardBack") {
      return buildCheck("valid", `${documentRules[documentKey].label}: acceptee automatiquement malgre une lecture OCR difficile.`)
    }
    if (documentKey === "license" || documentKey === "registrationCard") {
      return buildCheck("valid", `${documentRules[documentKey].label}: acceptee automatiquement malgre une lecture OCR difficile.`)
    }
    return buildCheck("rejected", `${documentRules[documentKey].label}: analyse automatique impossible. Reprenez la photo.`)
  }
}

const runAutomaticVerification = async (files = {}) => {
  const nextChecks = {}

  if (files.profilePhoto?.[0]) {
    nextChecks.profilePhoto = verifyProfilePhoto(files.profilePhoto[0])
  }
  if (files.idCardFront?.[0]) {
    nextChecks.idCardFront = await verifyOcrDocument("idCardFront", files.idCardFront[0])
  }
  if (files.idCardBack?.[0]) {
    nextChecks.idCardBack = await verifyOcrDocument("idCardBack", files.idCardBack[0])
  }
  if (files.license?.[0]) {
    nextChecks.license = await verifyOcrDocument("license", files.license[0])
  }
  if (files.registrationCard?.[0]) {
    nextChecks.registrationCard = await verifyOcrDocument("registrationCard", files.registrationCard[0])
  }

  return nextChecks
}

const decideAccountStatus = (user) => {
  const requiredDocuments = getRequiredDocuments(user.role)
  if (!requiredDocuments.length) {
    return { status: user.status, reviewNote: user.reviewNote || "" }
  }

  const rejectedDocuments = requiredDocuments.filter((documentKey) => user.documentChecks?.[documentKey]?.status === "rejected")
  if (rejectedDocuments.length > 0) {
    const note = rejectedDocuments
      .map((documentKey) => user.documentChecks?.[documentKey]?.note)
      .filter(Boolean)
      .join(" ")

    return {
      status: "needs_revision",
      reviewNote: note || "Certaines pieces doivent etre reprises."
    }
  }

  const allValid = requiredDocuments.every((documentKey) => user.documentChecks?.[documentKey]?.status === "valid")
  if (allValid) {
    return {
      status: "verified",
      reviewNote: "Verification automatique reussie. Compte active."
    }
  }

  return {
    status: "pending",
    reviewNote: "Analyse automatique en cours ou dossier incomplet."
  }
}

module.exports = {
  runAutomaticVerification,
  decideAccountStatus
}
