import { NavLink, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { notificationAPI } from "../api"

const navItems = [
  { to: "/", label: "Home", iconSymbol: "🏠" },
  { to: "/ride", label: "Courses", iconSymbol: "🚗" },
  { to: "/service", label: "Services", iconSymbol: "🧰" },
  { to: "/rental", label: "Locations", iconSymbol: "🚗" },
  { to: "/notifications", label: "Alerts", iconSymbol: "🔔" },
  { to: "/support", label: "Support", iconSymbol: "💬" },
  { to: "/mybookings", label: "Mes jobs", iconSymbol: "📋" }
]

const BottomNav = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount()
      setUnreadCount(response.data.unreadCount || 0)
    } catch (err) {
      console.warn('Impossible de recuperer le compteur de notifications:', err)
    }
  }

  useEffect(() => {
    if (!user) return

    fetchUnreadCount()
    const handleNotificationEvent = () => fetchUnreadCount()
    window.addEventListener('notification:new', handleNotificationEvent)
    return () => window.removeEventListener('notification:new', handleNotificationEvent)
  }, [user])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-4">
      <div className="ndar-shell">
        <div className="ndar-panel flex items-center justify-around rounded-[30px] border border-white/10 px-2 py-3 backdrop-blur-xl">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-w-[72px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold transition-all ${
                  isActive ? "bg-white/14 text-[#fff7ec] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" : "text-[#eef5fb] hover:bg-white/10 hover:text-[#fff7ec]"
                }`
              }
            >
              <div className="relative">
                <span className="text-lg leading-none">{item.iconSymbol}</span>
                {item.to === "/notifications" && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#f87171] px-1.5 text-[10px] font-black text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => {
              logout()
              navigate("/login", { replace: true })
            }}
            className="flex min-w-[72px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold text-[#eef5fb] transition-all hover:bg-white/10 hover:text-[#fff2df]"
          >
            <span className="text-lg leading-none">⎋</span>
            <span>Deconnexion</span>
          </button>
        </div>
      </div>
    </nav>
  )
}

export default BottomNav
