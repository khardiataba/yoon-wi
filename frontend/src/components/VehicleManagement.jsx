import React, { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import api from "../api"
import Toast from "./Toast"

const VehicleManagement = () => {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [formData, setFormData] = useState({
    vehicleName: "",
    vehicleType: "small",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    licensePlate: "",
    pricePerDay: "",
    pricePerHour: "",
    capacity: { passengers: "", luggage: "" },
    features: "",
    insuranceIncluded: false,
    driverLicenseRequired: true,
    description: ""
  })

  useEffect(() => {
    fetchVehicles()
  }, [user?._id])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/rentals/provider/${user._id}`)
      setVehicles(response.data.rentals || [])
    } catch (err) {
      console.error("Error fetching vehicles:", err)
      setToastMessage("Erreur lors du chargement des véhicules")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    if (name.startsWith("capacity.")) {
      const key = name.split(".")[1]
      setFormData((prev) => ({
        ...prev,
        capacity: { ...prev.capacity, [key]: value }
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : name === "pricePerDay" || name === "pricePerHour" ? parseFloat(value) || "" : value
      }))
    }
  }

  const handleAddVehicle = async (e) => {
    e.preventDefault()

    if (!formData.vehicleName || !formData.pricePerDay) {
      setToastMessage("Veuillez remplir les champs obligatoires")
      return
    }

    try {
      const submitData = {
        ...formData,
        features: formData.features.split(",").map((f) => f.trim()).filter((f) => f),
        capacity: {
          passengers: parseInt(formData.capacity.passengers) || 1,
          luggage: formData.capacity.luggage || "Standard"
        }
      }

      const response = await api.post("/rentals", submitData)

      if (response.data.success) {
        setToastMessage("Véhicule ajouté avec succès ! ✅")
        setShowForm(false)
        resetForm()
        fetchVehicles()
      }
    } catch (err) {
      console.error("Error adding vehicle:", err)
      setToastMessage(err.response?.data?.error || "Erreur lors de l'ajout du véhicule")
    }
  }

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce véhicule ?")) return

    try {
      await api.delete(`/rentals/${vehicleId}`)
      setToastMessage("Véhicule supprimé avec succès")
      fetchVehicles()
    } catch (err) {
      setToastMessage("Erreur lors de la suppression")
    }
  }

  const handleToggleStatus = async (vehicleId, currentStatus) => {
    try {
      const newStatus = currentStatus === "available" ? "maintenance" : "available"
      await api.put(`/rentals/${vehicleId}`, { availabilityStatus: newStatus })
      setToastMessage(`Statut mis à jour: ${newStatus}`)
      fetchVehicles()
    } catch (err) {
      setToastMessage("Erreur lors de la mise à jour")
    }
  }

  const resetForm = () => {
    setFormData({
      vehicleName: "",
      vehicleType: "small",
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      licensePlate: "",
      pricePerDay: "",
      pricePerHour: "",
      capacity: { passengers: "", luggage: "" },
      features: "",
      insuranceIncluded: false,
      driverLicenseRequired: true,
      description: ""
    })
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0
    }).format(price)
  }

  const getStatusBadge = (status) => {
    const badges = {
      available: "🟢 Disponible",
      rented: "🔴 Loué",
      maintenance: "🟡 Maintenance"
    }
    return badges[status] || status
  }

  if (loading) {
    return <div className="text-center py-12">Chargement des véhicules...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">🚗 Mes Véhicules ({vehicles.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            showForm
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {showForm ? "✕ Annuler" : "➕ Ajouter un véhicule"}
        </button>
      </div>

      {/* Add Vehicle Form */}
      {showForm && (
        <form onSubmit={handleAddVehicle} className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          <h3 className="text-xl font-bold mb-4">📋 Nouveau Véhicule</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vehicle Name */}
            <div>
              <label className="block font-semibold mb-1">Nom du véhicule *</label>
              <input
                type="text"
                name="vehicleName"
                value={formData.vehicleName}
                onChange={handleInputChange}
                placeholder="Ex: Toyota Corolla"
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
            </div>

            {/* Vehicle Type */}
            <div>
              <label className="block font-semibold mb-1">Type *</label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="small">🏍️ Petit format (moto, scooter, compact)</option>
                <option value="large">🚐 Grand format (SUV, minibus, van)</option>
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block font-semibold mb-1">Marque</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                placeholder="Ex: Toyota"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block font-semibold mb-1">Modèle</label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                placeholder="Ex: Corolla"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            {/* Year */}
            <div>
              <label className="block font-semibold mb-1">Année</label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block font-semibold mb-1">Couleur</label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                placeholder="Ex: Bleu"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            {/* License Plate */}
            <div>
              <label className="block font-semibold mb-1">Immatriculation</label>
              <input
                type="text"
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleInputChange}
                placeholder="Ex: SL-123-ABC"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            {/* Price Per Day */}
            <div>
              <label className="block font-semibold mb-1">Prix par jour (XOF) *</label>
              <input
                type="number"
                name="pricePerDay"
                value={formData.pricePerDay}
                onChange={handleInputChange}
                placeholder="10000"
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
            </div>

            {/* Price Per Hour */}
            <div>
              <label className="block font-semibold mb-1">Prix par heure (XOF)</label>
              <input
                type="number"
                name="pricePerHour"
                value={formData.pricePerHour}
                onChange={handleInputChange}
                placeholder="1000"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            {/* Passengers */}
            <div>
              <label className="block font-semibold mb-1">Nombre de passagers</label>
              <input
                type="number"
                name="capacity.passengers"
                value={formData.capacity.passengers}
                onChange={handleInputChange}
                placeholder="5"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            {/* Luggage */}
            <div>
              <label className="block font-semibold mb-1">Bagages</label>
              <input
                type="text"
                name="capacity.luggage"
                value={formData.capacity.luggage}
                onChange={handleInputChange}
                placeholder="Standard"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block font-semibold mb-1">Équipements (séparés par des virgules)</label>
            <input
              type="text"
              name="features"
              value={formData.features}
              onChange={handleInputChange}
              placeholder="Climatisation, Bluetooth, GPS, Wifi"
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Décrivez votre véhicule..."
              rows={3}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="insuranceIncluded"
                checked={formData.insuranceIncluded}
                onChange={handleInputChange}
              />
              <span>Assurance incluse</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="driverLicenseRequired"
                checked={formData.driverLicenseRequired}
                onChange={handleInputChange}
              />
              <span>Permis de conduire requis</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            ✅ Ajouter le véhicule
          </button>
        </form>
      )}

      {/* Vehicles List */}
      {vehicles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg">Aucun véhicule</p>
          <p className="text-gray-500 text-sm">Commencez par ajouter un véhicule à la location</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vehicles.map((vehicle) => (
            <div key={vehicle._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {vehicle.photoUrl && (
                <div className="h-40 bg-gray-200 overflow-hidden">
                  <img src={vehicle.photoUrl} alt={vehicle.vehicleName} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{vehicle.vehicleName}</h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded">
                    {getStatusBadge(vehicle.availabilityStatus)}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-1">
                  {vehicle.brand} {vehicle.model} ({vehicle.year})
                </p>

                <p className="text-lg font-bold text-green-600 mb-3">{formatPrice(vehicle.pricePerDay)}/jour</p>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleToggleStatus(vehicle._id, vehicle.availabilityStatus)}
                    className={`px-3 py-1 rounded text-sm font-semibold transition ${
                      vehicle.availabilityStatus === "available"
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {vehicle.availabilityStatus === "available" ? "⚠️ Maintenance" : "✅ Disponible"}
                  </button>
                  <button
                    onClick={() => handleDeleteVehicle(vehicle._id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-semibold hover:bg-red-200 transition"
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  )
}

export default VehicleManagement
