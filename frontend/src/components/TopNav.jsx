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

  // Fonction pour aller en arrière
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate("/")
    }
  }

  // Déterminer si afficher le bouton retour (pas sur la page d'accueil)
  const showBackButton = location.pathname !== "/" && location.pathname !== "/login"

  if (!user) {
    return null
  }

  return (
    <nav className="fixed left-0 right-0 top-0 z-[9998] px-3 pt-4 sm:px-4 sm:pt-5">
      <div className="ndar-shell">
        <div className="ndar-panel flex items-center justify-between rounded-[22px] border border-[#d7ae49]/30 bg-gradient-to-b from-[#1a1f2e] to-[#0f1419] px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          {/* Left: Back Button + Logo + App Name */}
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            {/* Back Button */}
            {showBackButton && (
              <button
                onClick={goBack}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d7ae49]/20 bg-[#2a3f5f]/40 transition-colors hover:bg-[#3a5f7f]/60 sm:h-10 sm:w-10"
                title="Retour"
              >
                <span className="text-lg sm:text-xl">←</span>
              </button>
            )}

            {/* Logo + App Name */}
            <div 
              onClick={() => navigate("/")}
              className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10 sm:h-10 sm:w-10">
                <img src="/logo.svg" alt={APP_NAME} className="h-7 w-7 object-contain sm:h-8 sm:w-8" />
              </div>
              <div className="whitespace-nowrap font-['Sora'] text-sm font-extrabold text-[#d7ae49] transition-colors hover:text-[#e8c45f] sm:text-xl">
                {APP_NAME}
              </div>
            </div>
          </div>

          {/* Right: Language Selector + User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* User Profile Button */}
            <button
              onClick={() => navigate("/profile")}
              className="flex flex-shrink-0 items-center gap-2 rounded-full border border-[#d7ae49]/20 bg-[#2a3f5f]/40 px-2 py-2 transition-colors hover:bg-[#3a5f7f]/60 sm:gap-3 sm:px-4"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={getUserDisplayName(user)}
                  className="h-7 w-7 rounded-full border border-[#d7ae49] object-cover sm:h-8 sm:w-8"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d7ae49] text-[10px] font-bold text-[#fff7ec] sm:h-8 sm:w-8 sm:text-xs">
                  {getUserDisplayName(user).slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-semibold text-[#fff7ec]">{getUserDisplayName(user)}</span>
                <span className="text-xs text-[#d7ae49]">{user.role === 'client' ? 'Client' : user.role === 'driver' ? 'Chauffeur' : user.role === 'technician' ? 'Technicien' : 'Administrateur'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default TopNav
