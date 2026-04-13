const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const path = require("path")
const http = require("http")
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
const socketManager = require("./socket/socketManager")

const app = express()
const server = http.createServer(app)

// Initialize Socket.io
socketManager.initialize(server)

app.use(cors())
app.use(express.json())

// Health Check Route
app.get("/", (req, res) => {
  res.json({ message: "✅ Ndar Express API - Saint-Louis", status: "OK", version: "1.0" })
})

// Exposer les fichiers uploadés (cartes d'identité / permis)
const uploadsPath = path.join(__dirname, "uploads")
app.use("/uploads", express.static(uploadsPath))

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
    await mongoose.connect(process.env.MONGO_URI)
    console.log("MongoDB connecté")

    server.listen(PORT, () => {
      console.log(`🚀 Serveur lancé sur port ${PORT} avec Socket.io`)
    })
  } catch (err) {
    console.error("Impossible de démarrer le serveur:", err.message)
    process.exit(1)
  }
}

startServer()
