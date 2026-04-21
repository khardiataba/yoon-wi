import { useAuth } from "../context/AuthContext"
import BottomNav from "./BottomNav"
import TopNav from "./TopNav"

const MainLayout = ({ children }) => {
  const { user } = useAuth()

  if (!user) {
    return children
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1 pt-[98px] pb-[108px] sm:pt-[112px] sm:pb-[124px]">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

export default MainLayout
