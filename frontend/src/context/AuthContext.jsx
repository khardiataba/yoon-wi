import React, { createContext, useContext, useEffect, useState } from "react"
import api from "../api"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const setSession = (token, userData) => {
    try {
      if (token) {
        localStorage.setItem("token", token)
        setUser(userData)
      } else {
        localStorage.removeItem("token")
        setUser(null)
      }
    } catch (error) {
      console.error("Erreur de session:", error)
      setUser(userData || null)
    }
  }

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password })
      setSession(res.data.token, res.data.user)
      return res.data
    } catch (error) {
      console.error("Erreur de connexion:", error)
      throw error
    }
  }

  const register = async (payload) => {
    try {
      const res = await api.post("/auth/register", payload)
      setSession(res.data.token, res.data.user)
      return res.data
    } catch (error) {
      console.error("Erreur d'inscription:", error)
      throw error
    }
  }

  const logout = () => {
    setSession(null, null)
  }

  const updateUser = (partialUser) => {
    setUser((prev) => {
      if (!prev) return partialUser || null
      return { ...prev, ...(partialUser || {}) }
    })
  }

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/me")
      setUser(res.data)
      return res.data
    } catch (err) {
      console.error("fetchProfile failed:", err.debugURL || err.config?.url, err.message)
      setUser(null)
      err.userMessage = err.userMessage || "Impossible de récupérer le profil. Vérifiez votre connexion et réessayez."
      throw err
    }
  }

  useEffect(() => {
    try {
      const token = localStorage.getItem("token")
      if (token) {
        fetchProfile().finally(() => setLoading(false))
        return
      }
      setLoading(false)
    } catch (error) {
      console.error("Erreur de lecture du token:", error)
      setLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setSession, fetchProfile, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
