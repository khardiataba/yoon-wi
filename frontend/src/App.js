import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { ToastProvider } from "./context/ToastContext"
import ErrorBoundary from "./components/ErrorBoundary"
import ProtectedRoute from "./components/ProtectedRoute"
import MainLayout from "./components/MainLayout"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Welcome from "./pages/Welcome"
import Home from "./pages/Home"
import Ride from "./pages/Ride"
import Service from "./pages/Service"
import Rental from "./pages/Rental"
import RentalDetail from "./pages/RentalDetail"
import MyBookings from "./pages/MyBookings"
import Profile from "./pages/Profile"
import AdminDashboard from "./pages/AdminDashboard"
import DriverDashboard from "./pages/DriverDashboard"
import TechnicianDashboard from "./pages/TechnicianDashboard"
import RideTracking from "./pages/RideTracking"
import DriverTracking from "./pages/DriverTracking"
import RideDetails from "./pages/RideDetails"
import ServiceDetails from "./pages/ServiceDetails"
import Notifications from "./pages/Notifications"
import Support from "./pages/Support"
import PendingApproval from "./pages/PendingApproval"
import ResetPassword from "./pages/ResetPassword"
import ForgotPassword from "./pages/ForgotPassword"
import NotFound from "./pages/NotFound"
import ServerError from "./pages/ServerError"
import useSocket from "./hooks/useSocket"
import useSessionTimeout from "./hooks/useSessionTimeout"

const DashboardRouter = () => {
  const { user } = useAuth()

  if (!user) {
    return <Welcome />
  }

  if (user.status && user.status !== "verified") {
    return <PendingApproval />
  }

  let content
  if (user.role === "client") {
    content = <Home />
  } else if (user.role === "driver") {
    content = <DriverDashboard />
  } else if (user.role === "technician") {
    content = <TechnicianDashboard />
  } else if (user.role === "admin") {
    content = <AdminDashboard />
  } else {
    content = <Home />
  }

  return <MainLayout>{content}</MainLayout>
}

const AppRoutes = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <div className="ndar-card rounded-[34px] px-8 py-10 text-center">
          <div className="font-['Sora'] text-4xl font-extrabold text-[#165c96]">
            YOONWI
          </div>
          <p className="mt-3 text-sm text-[#5a8fd1]">Chargement de votre espace...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardRouter />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
      <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" />} />
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
            <MainLayout>
              <Home />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ride"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Ride />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ride/:id"
        element={
          <ProtectedRoute>
            <RideDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tracking"
        element={
          <ProtectedRoute>
            <MainLayout>
              <RideTracking />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ride/:rideId/tracking"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DriverTracking />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Notifications />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Support />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/service"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Service />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/service/:id"
        element={
          <ProtectedRoute>
            <ServiceDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rental"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Rental />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rental/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <RentalDetail />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mybookings"
        element={
          <ProtectedRoute>
            <MainLayout>
              <MyBookings />
            </MainLayout>
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
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Profile />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="/500" element={<ServerError />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

const SessionManager = () => {
  useSocket()
  useSessionTimeout()
  return null
}

const App = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <SessionManager />
            <div className="min-h-screen selection:bg-[#d7ae49]/30">
              <AppRoutes />
            </div>
          </ToastProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
