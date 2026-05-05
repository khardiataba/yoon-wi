const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const path = require("path")
const http = require("http")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
require("dotenv").config({ path: path.join(__dirname, ".env") })

const authRoutes = require("./routes/authRoutes")
const adminRoutes = require("./routes/adminRoutes")
const rideRoutes = require("./routes/rideRoutes")
const serviceRoutes = require("./routes/serviceRoutes")
const applicationRoutes = require("./routes/applicationRoutes")
const ratingRoutes = require("./routes/ratingRoutes")
const paymentRoutes = require("./routes/paymentRoutes")
const mapsRoutes = require("./routes/mapsRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const supportRoutes = require("./routes/supportRoutes")
const rentalRoutes = require("./routes/rentalRoutes")
const galleryRoutes = require("./routes/galleryRoutes")
const userRoutes = require("./routes/userRoutes")
const socketManager = require("./socket/socketManager")

const app = express()
const server = http.createServer(app)

// Initialize Socket.io
socketManager.initialize(server)

const DEFAULT_ALLOWED_ORIGINS = [
  "https://ndar-express-eezj.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174"
]

const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/, "")
const buildAllowedOrigins = () =>
  String(process.env.FRONTEND_URL || DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean)

const isOriginAllowed = (origin, allowedOrigins) => {
  if (!origin) return true
  const normalizedOrigin = normalizeOrigin(origin)

  return allowedOrigins.some((allowed) => {
    if (allowed.includes("*")) {
      const regexPattern = `^${allowed
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\*/g, ".*")}$`
      return new RegExp(regexPattern, "i").test(normalizedOrigin)
    }

    return normalizedOrigin.toLowerCase() === allowed.toLowerCase()
  })
}

// Security Headers
app.use(helmet())

// Rate Limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: "Trop de tentatives de connexion. Réessayez plus tard.",
  standardHeaders: true,
  legacyHeaders: false,
})

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: "Trop de demandes. Réessayez plus tard.",
  standardHeaders: true,
  legacyHeaders: false,
})

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Trop de requêtes. Réessayez plus tard.",
  standardHeaders: true,
  legacyHeaders: false,
})

const allowedOrigins = buildAllowedOrigins()
const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true)
      return
    }

    const error = new Error("Origine CORS non autorisee")
    error.status = 403
    callback(error)
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
}

app.use(
  cors(corsOptions)
)
app.options(/.*/, cors(corsOptions))
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "100kb" }))
app.use(express.urlencoded({ limit: process.env.URLENCODED_BODY_LIMIT || "100kb", extended: true }))
app.use(generalLimiter)

// Health Check Route
app.get("/", (req, res) => {
  res.json({ message: "OK YOON WI API - Saint-Louis", status: "OK", version: "1.0" })
})

// Exposer les fichiers uploadés (cartes d'identité / permis)
const uploadsPath = path.join(__dirname, "uploads")
app.use("/uploads", express.static(uploadsPath))

app.use("/api/auth/login", loginLimiter)
app.use("/api/auth/register", authLimiter)
app.use("/api/auth/forgot-password", authLimiter)
app.use("/api/auth/reset-password", authLimiter)
app.use("/api/auth", authRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/rides", rideRoutes)
app.use("/api/services", serviceRoutes)
app.use("/api/applications", applicationRoutes)
app.use("/api/ratings", ratingRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/maps", mapsRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/support", supportRoutes)
app.use("/api/rentals", rentalRoutes)
app.use("/api/gallery", galleryRoutes)
app.use("/api/user", userRoutes)
app.use("/api/users", userRoutes)

app.use("/api", (req, res) => {
  res.status(404).json({
    message: `Route API introuvable: ${req.method} ${req.originalUrl}`
  })
})

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)

  const status = err.status || err.statusCode || 500
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Requete trop volumineuse" })
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ message: "JSON invalide" })
  }

  if (status >= 500) {
    console.error("Erreur serveur:", err.message)
  } else if (process.env.NODE_ENV !== "production") {
    console.warn("Requete refusee:", err.message)
  }

  return res.status(status).json({
    message: status >= 500 ? "Erreur interne du serveur" : err.message
  })
})

const PORT = process.env.PORT || 5000

const startServer = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI est manquant. Vérifiez le fichier backend/.env.")
    process.exit(1)
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET est manquant. Vérifiez le fichier backend/.env.")
    process.exit(1)
  }

  try {
    mongoose.set("strictQuery", true)
    mongoose.set("bufferCommands", false)

    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      maxIdleTimeMS: 30000,
      autoIndex: process.env.NODE_ENV !== "production"
    })
    console.log("MongoDB connecté")

    server.listen(PORT, () => {
      console.log(`GO Serveur lancé sur port ${PORT} avec Socket.io`)
    })
  } catch (err) {
    console.error("Impossible de démarrer le serveur:", err.message)
    process.exit(1)
  }
}

startServer()

process.on("unhandledRejection", (reason) => {
  console.error("Promesse non geree:", reason?.message || reason)
})

process.on("uncaughtException", (err) => {
  console.error("Exception non geree:", err.message)
  process.exit(1)
})

const shutdown = async (signal) => {
  console.log(`${signal} recu, arret propre du serveur`)
  server.close(async () => {
    await mongoose.connection.close(false)
    process.exit(0)
  })
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

