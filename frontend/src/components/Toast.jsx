import React from "react"

const Toast = ({ message, type, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500"
  }[type] || "bg-gray-500"

  return (
    <div className={`${bgColor} text-white px-4 py-3 rounded shadow-lg fixed bottom-4 right-4 z-50 animate-bounce`}>
      {message}
    </div>
  )
}

export default Toast
