import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const navItems = [
  { to: "/", label: "Home", icon: "⌂" },
  { to: "/ride", label: "Courses", icon: "✦" },
  { to: "/service", label: "Services", icon: "✚" },
  { to: "/mybookings", label: "Mes jobs", icon: "▣" }
]

const BottomNav = () => {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
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
              <span className="text-lg leading-none">{item.icon}</span>
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
