import { NavLink, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { notificationAPI } from "../api"

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

const iconByName = {
  home: "M3 10.5 12 3l9 7.5v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9Z",
  tools: "m4 20 6-6m4-4 6-6M8.5 14.5 3 9l2.5-2.5L11 12m2 2 5.5 5.5L21 17l-5.5-5.5",
  car: "M5 14.5h14l-1.2-4.2a2 2 0 0 0-1.9-1.4H8.1a2 2 0 0 0-1.9 1.4L5 14.5Zm1 0v2.5m12-2.5v2.5M8 18.5a1.5 1.5 0 1 0 0 .01V18.5Zm8 0a1.5 1.5 0 1 0 0 .01V18.5Z",
  bell: "M12 4a4 4 0 0 0-4 4v2.4c0 .7-.2 1.4-.6 2L6 14.5h12l-1.4-2.1a3.8 3.8 0 0 1-.6-2V8a4 4 0 0 0-4-4Zm-2 12a2 2 0 1 0 4 0",
  chat: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  list: "M8 7h12M8 12h12M8 17h12M4.5 7h.01M4.5 12h.01M4.5 17h.01",
  user: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0Z",
  menu: "M4 7h16M4 12h16M4 17h16",
  logout: "M15 17l5-5-5-5M20 12H9M11 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h6"
}

const Icon = ({ name, className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={iconByName[name] || iconByName.menu} />
  </svg>
)

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
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] px-3 sm:px-4 pb-3 sm:pb-4">
      <div className="ndar-shell">
        <div className="ndar-panel flex items-center justify-around rounded-[30px] border border-[#d7ae49]/40 px-1 sm:px-2 py-2 sm:py-3 backdrop-blur-xl bg-gradient-to-b from-[#1a1f2e] to-[#0f1419]">
          {mainItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setShowMenu(false)}
              className={({ isActive }) =>
                `flex min-w-[60px] sm:min-w-[72px] flex-col items-center gap-1 rounded-2xl px-2 sm:px-3 py-2 text-[10px] sm:text-[11px] font-semibold transition-all ${
                  isActive ? "bg-[#d7ae49]/30 text-[#ffd700] shadow-[inset_0_1px_0_rgba(215,174,73,0.3)]" : "text-[#e8f0ff] hover:bg-[#3a5f7f]/60 hover:text-[#ffd700]"
                }`
              }
            >
              <Icon name={item.icon} className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="line-clamp-1">{item.label}</span>
            </NavLink>
          ))}

          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`flex min-w-[60px] sm:min-w-[72px] flex-col items-center gap-1 rounded-2xl px-2 sm:px-3 py-2 text-[10px] sm:text-[11px] font-semibold transition-all ${
                showMenu ? "bg-[#d7ae49]/30 text-[#ffd700] shadow-[inset_0_1px_0_rgba(215,174,73,0.3)]" : "text-[#e8f0ff] hover:bg-[#3a5f7f]/60 hover:text-[#ffd700]"
              }`}
            >
              <Icon name="menu" className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="line-clamp-1">Menu</span>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute bottom-full right-0 mb-2 rounded-2xl border border-[#d7ae49]/40 bg-gradient-to-b from-[#1a1f2e] to-[#0f1419] backdrop-blur-xl shadow-lg overflow-hidden w-44 sm:w-48">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setShowMenu(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-all ${
                        isActive ? "bg-[#d7ae49]/25 text-[#ffd700]" : "text-[#e8f0ff] hover:bg-[#3a5f7f]/50 hover:text-[#ffd700]"
                      }`
                    }
                  >
                    <span className="flex-shrink-0 text-[#d7ae49]">
                      <Icon name={item.icon} className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                    <div className="flex-1 flex items-center justify-between">
                      <span>{item.label}</span>
                      {item.to === "/notifications" && unreadCount > 0 && (
                        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#f87171] px-1.5 text-[10px] font-black text-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </NavLink>
                ))}
                
                {/* Logout */}
                <button
                  onClick={() => {
                    logout()
                    navigate("/login", { replace: true })
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#ff6b6b] hover:bg-red-500/15 transition-colors border-t border-[#d7ae49]/20"
                >
                  <Icon name="logout" className="h-5 w-5" />
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
