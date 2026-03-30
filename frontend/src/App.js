import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { ToastProvider } from "./context/ToastContext"
import ProtectedRoute from "./components/ProtectedRoute"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Welcome from "./pages/Welcome"
import Home from "./pages/Home"
import Ride from "./pages/Ride"
import Service from "./pages/Service"
import MyBookings from "./pages/MyBookings"
import AdminDashboard from "./pages/AdminDashboard"
import DriverDashboard from "./pages/DriverDashboard"
import TechnicianDashboard from "./pages/TechnicianDashboard"
import RideTracking from "./pages/RideTracking"
import PendingApproval from "./pages/PendingApproval"

const DashboardRouter = () => {
  const { user } = useAuth()

  if (!user) {
    return <Welcome />
  }

  if (user.status && user.status !== "verified") {
    return <PendingApproval />
  }

  if (user.role === "client") {
    return <Home />
  }

  if (user.role === "driver") {
    return <DriverDashboard />
  }

  if (user.role === "technician") {
    return <TechnicianDashboard />
  }

  if (user.role === "admin") {
    return <AdminDashboard />
  }

  return <Home />
}

const AppRoutes = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <div className="ndar-card rounded-[34px] px-8 py-10 text-center">
          <div className="font-['Sora'] text-4xl font-extrabold text-[#165c96]">
            Ndar<span className="text-[#d7ae49]">Express</span>
          </div>
          <p className="mt-3 text-sm text-[#70839a]">Chargement de votre espace...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardRouter />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
      <Route
        path="/pending"
        element={
          <ProtectedRoute allowPending>
            <PendingApproval />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ride"
        element={
          <ProtectedRoute>
            <Ride />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tracking"
        element={
          <ProtectedRoute>
            <RideTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/service"
        element={
          <ProtectedRoute>
            <Service />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mybookings"
        element={
          <ProtectedRoute>
            <MyBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRoles={["driver"]}>
            <DriverDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/technician"
        element={
          <ProtectedRoute allowedRoles={["technician"]}>
            <TechnicianDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen selection:bg-[#d7ae49]/30">
            <AppRoutes />
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
