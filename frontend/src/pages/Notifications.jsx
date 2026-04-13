import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationAPI } from '../api'

const Notifications = () => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [marking, setMarking] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState('')

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await notificationAPI.getNotifications()
      console.log('✅ Notifications chargées:', response.data)
      setNotifications(response.data)
    } catch (err) {
      console.error('❌ Erreur chargement notifications:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        errorMsg: err.message,
        debugURL: err.debugURL
      })
      setError(
        err.response?.status === 401
          ? 'Session expirée. Veuillez vous reconnecter.'
          : err.response?.data?.message || err.message || 'Impossible de charger les notifications.'
      )
    } finally {
      setLoading(false)
    }
  }

  const markAllRead = async () => {
    try {
      setMarking(true)
      await notificationAPI.markAllRead()
      const updated = notifications.map((item) => ({ ...item, isRead: true }))
      setNotifications(updated)
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de marquer les notifications.')
    } finally {
      setMarking(false)
    }
  }

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      setPermissionMessage("Ce navigateur ne prend pas en charge les notifications en temps réel.")
      return
    }

    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setPermissionMessage('Notifications activées. Vous recevrez les alertes même lorsque vous ne regardez pas l’application.')
    } else if (permission === 'denied') {
      setPermissionMessage('Autorisation refusée. Changez les paramètres du navigateur pour réactiver les notifications.')
    } else {
      setPermissionMessage('Autorisation en attente. Essayez à nouveau si nécessaire.')
    }
  }

  useEffect(() => {
    fetchNotifications()

    const handleNewNotification = (event) => {
      const newNotification = event.detail
      setNotifications((prev) => [newNotification, ...prev])
    }

    window.addEventListener('notification:new', handleNewNotification)
    return () => window.removeEventListener('notification:new', handleNewNotification)
  }, [])

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="ndar-shell space-y-4">
        <header className="ndar-card rounded-[34px] p-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-3 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-[#eef5fb] transition-all hover:bg-white/20"
          >
            ⬅️ Retour
          </button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-['Sora'] text-3xl font-extrabold text-[#16324f]">Notifications</h1>
              <p className="mt-2 text-sm text-[#70839a]">Toutes vos alertes, messages de support et annonces importantes.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={requestBrowserPermission}
            className="rounded-2xl bg-[#22c55e] px-4 py-3 text-sm font-bold text-white hover:bg-[#16a34a]"
          >
            {Notification?.permission === 'granted' ? 'Notifications activées' : 'Activer notifications web'}
          </button>
          <button
            onClick={markAllRead}
            disabled={marking || notifications.length === 0}
            className="rounded-2xl bg-[#165c96] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {marking ? 'Marquage...' : 'Tout marquer comme lu'}
          </button>
        </div>
        {permissionMessage && (
          <div className="mt-3 rounded-2xl bg-[#eff6ff] px-4 py-3 text-sm text-[#1d4ed8]">
            {permissionMessage}
          </div>
        )}
          </div>
        </header>

        {error && (
          <div className="ndar-card rounded-[24px] bg-[#fff1f1] px-4 py-3 text-sm text-[#a54b55]">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="ndar-card h-28 animate-pulse rounded-[24px]" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="ndar-card rounded-[30px] p-6 text-sm text-[#70839a]">Aucune notification pour le moment.</div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <article
                key={notification._id}
                className={`rounded-[28px] border p-5 shadow-sm ${notification.isRead ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-[#16324f]">{notification.title}</h2>
                    <p className="mt-2 text-sm text-[#4a5568]">{notification.message}</p>
                  </div>
                  <div className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-[#70839a]">
                    {new Date(notification.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>
                {notification.link && (
                  <a
                    href={notification.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#165c96]"
                  >
                    Ouvrir
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Notifications
