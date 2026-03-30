const multer = require("multer")
const path = require("path")
const fs = require("fs")

const uploadsDir = path.join(__dirname, "..", "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const base = path.basename(file.originalname, ext)
    const unique = `${base}-${Date.now()}${ext}`
    cb(null, unique)
  }
})

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
]

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const isAllowedMimeType = allowedMimeTypes.includes(file.mimetype)
    const hasAllowedExtension = /\.(jpg|jpeg|png|webp|pdf)$/i.test(file.originalname || "")

    if (!isAllowedMimeType || !hasAllowedExtension) {
      return cb(new Error("Format de document invalide. Utilisez JPG, PNG, WEBP ou PDF."))
    }

    cb(null, true)
  }
})

module.exports = upload
