import { NavLink, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { notificationAPI } from "../api"
import AppIcon from "./AppIcon"

const mainItems = [
  { to: "/", label: "Accueil", icon: "home" },
  { to: "/service", label: "Services", icon: "tools" },
  { to: "/ride", label: "Courses", icon: "car" }
]

const menuItems = [
  { to: "/rental", label: "Locations", icon: "car" },
  { to: "/notifications", label: "Notifications", icon: "bell" },
  { to: "/support", label: "Support", icon: "chat" },
  { to: "/mybookings", label: "Mes réservations", icon: "list" },
  { to: "/profile", label: "Mon profil", icon: "user" }
]

const BottomNav = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showMenu, setShowMenu] = useState(false)

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount()
      setUnreadCount(response.data.unreadCount || 0)
    } catch (err) {
      console.warn("Impossible de recuperer le compteur de notifications:", err)
    }
  }

  useEffect(() => {
    if (!user) return

    fetchUnreadCount()
    const handleNotificationEvent = () => fetchUnreadCount()
    window.addEventListener("notification:new", handleNotificationEvent)
    return () => window.removeEventListener("notification:new", handleNotificationEvent)
  }, [user])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] max-w-full overflow-visible px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="ndar-shell">
        <div className="ndar-panel flex min-w-0 items-center justify-around rounded-[30px] px-1 py-2 backdrop-blur-xl sm:px-2 sm:py-3">
          {mainItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setShowMenu(false)}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-bold transition-all duration-200 sm:min-w-[72px] sm:px-3 sm:text-[11px] ${
                  isActive ? "bg-white text-[#07335a] shadow-[0_18px_35px_rgba(0,0,0,0.18)]" : "text-white hover:bg-white/10"
                }`
              }
            >
              <AppIcon name={item.icon} className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="line-clamp-1">{item.label}</span>
            </NavLink>
          ))}

          <div className="relative flex min-w-0 flex-1 sm:flex-none">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-bold transition-all duration-200 sm:min-w-[72px] sm:px-3 sm:text-[11px] ${
                showMenu ? "bg-white text-[#07335a] shadow-[0_18px_35px_rgba(0,0,0,0.18)]" : "text-white hover:bg-white/10"
              }`}
            >
              <AppIcon name="menu" className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="line-clamp-1">Menu</span>
            </button>

            {showMenu && (
              <div className="absolute bottom-full right-0 mb-3 w-52 max-w-[calc(100vw-2rem)] origin-bottom-right animate-[premiumMenuIn_180ms_ease-out] overflow-hidden rounded-[24px] bg-white/98 p-2 shadow-[0_28px_80px_rgba(8,35,62,0.26)] backdrop-blur-xl sm:w-56">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setShowMenu(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-[18px] px-3 py-3 text-xs font-bold transition-all duration-200 sm:gap-3 sm:px-4 sm:text-sm ${
                        isActive ? "bg-[#eaf4ff] text-[#07335a]" : "text-[#0b1f33] hover:bg-[#f1f7ff]"
                      }`
                    }
                  >
                    <span className="flex-shrink-0 text-[#1260a1]">
                      <AppIcon name={item.icon} className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                    <div className="flex flex-1 items-center justify-between">
                      <span>{item.label}</span>
                      {item.to === "/notifications" && unreadCount > 0 && (
                        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#f87171] px-1.5 text-[10px] font-black text-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </NavLink>
                ))}

                <button
                  onClick={() => {
                    logout()
                    navigate("/login", { replace: true })
                  }}
                  className="mt-1 flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-bold text-[#b4232a] transition-colors hover:bg-red-50"
                >
                  <AppIcon name="logout" className="h-5 w-5" />
                  <span>Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default BottomNav
