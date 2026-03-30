import React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const ProtectedRoute = ({ allowedRoles, allowPending = false, children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="p-4">Chargement...</div>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (!allowPending && user.status && user.status !== "verified") {
    return <Navigate to="/pending" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
