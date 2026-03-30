import React, { createContext, useContext, useState } from "react"
import Toast from "../components/Toast"

const ToastContext = createContext(null)

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const showToast = (message, type = "info") => {
    const id = Date.now()
    setToasts([...toasts, { id, message, type }])
    return id
  }

  const removeToast = (id) => {
    setToasts(toasts.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast doit être utilisé dans ToastProvider")
  }
  return context
}
