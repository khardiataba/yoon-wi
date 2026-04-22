import { useEffect, useState, useCallback } from 'react'
import { useToast } from '../context/ToastContext'

const SHAKE_THRESHOLD = 20 // g-force
const MIN_SHAKE_INTERVAL = 1000 // 1s between shakes

export const useShakeDetection = (onShakeConfirmed) => {
  const [shakeDetected, setShakeDetected] = useState(false)
  const { showToast } = useToast()
  let lastShakeTime = 0

  const handleMotion = useCallback((event) => {
    const { accelerationIncludingGravity } = event
    if (!accelerationIncludingGravity) return

    const { x, y, z } = accelerationIncludingGravity
    const gForce = Math.sqrt(x * x + y * y + z * z) - 9.8

    const now = Date.now()
    if (Math.abs(gForce) > SHAKE_THRESHOLD && now - lastShakeTime > MIN_SHAKE_INTERVAL) {
      lastShakeTime = now
      setShakeDetected(true)
      showToast('Secouez encore pour SOS ?', 'warning')
    }
  }, [showToast])

  const clearShake = useCallback(() => {
    setShakeDetected(false)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Request permission iOS
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(permission => {
          if (permission === 'granted') {
            window.addEventListener('devicemotion', handleMotion)
          }
        })
        .catch(console.error)
    } else {
      // Android/other
      window.addEventListener('devicemotion', handleMotion)
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion)
    }
  }, [handleMotion])

  return { shakeDetected, clearShake, onShakeConfirmed }
}

