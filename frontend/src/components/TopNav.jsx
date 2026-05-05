import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { resolveMediaUrl } from "../utils/mediaUrl"

const APP_NAME = "YOONWI"

const getUserDisplayName = (user) => user?.firstName || user?.name?.split(" ")[0] || "Compte"

const TopNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const photoUrl = resolveMediaUrl(user?.profilePhotoUrl || user?.profileImage)

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  const showBackButton = location.pathname !== "/" && location.pathname !== "/login"

  if (!user) {
    return null
  }

  return (
    <nav className="fixed left-0 right-0 top-0 z-[9998] max-w-full overflow-hidden px-3 pt-4 sm:px-4 sm:pt-5">
      <div className="ndar-shell">
        <div className="ndar-panel flex min-w-0 items-center justify-between gap-2 rounded-[24px] px-3 py-3 backdrop-blur-xl sm:gap-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-shrink items-center gap-2 sm:gap-3">
            {showBackButton && (
              <button
                onClick={goBack}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/15 sm:h-10 sm:w-10"
                title="Retour"
              >
                <span className="text-lg sm:text-xl">←</span>
              </button>
            )}

            <div 
              onClick={() => navigate("/")}
              className="flex min-w-0 cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_12px_25px_rgba(0,0,0,0.12)] sm:h-10 sm:w-10">
                <img src="/logo.svg" alt={APP_NAME} className="h-7 w-7 object-contain sm:h-8 sm:w-8" />
              </div>
              <div className="truncate font-['Sora'] text-sm font-extrabold text-white transition-colors sm:text-xl">
                {APP_NAME}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/profile")}
              className="flex flex-shrink-0 items-center gap-2 rounded-full bg-white/10 px-2 py-2 transition-colors hover:bg-white/15 sm:gap-3 sm:px-4"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={getUserDisplayName(user)}
                  className="h-7 w-7 rounded-full object-cover ring-2 ring-white/30 sm:h-8 sm:w-8"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#07335a] sm:h-8 sm:w-8 sm:text-xs">
                  {getUserDisplayName(user).slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-bold text-white">{getUserDisplayName(user)}</span>
                <span className="text-xs font-bold text-[#c7dcf1]">{user.role === "client" ? "Client" : user.role === "driver" ? "Chauffeur" : user.role === "technician" ? "Technicien" : "Administrateur"}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default TopNav
