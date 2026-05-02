import { useState, useEffect } from 'react'
import useSpeechRecognition from '../hooks/useSpeechRecognition'

/**
 * Composant Input réutilisable avec Support:
 * - Saisie texte normale
 * - Reconnaissance vocale (microphone)
 * - Accessibilité complète
 */
export default function SpeechInput({
  placeholder = 'Écrivez ou parlez...',
  value,
  onChange,
  onSubmit,
  icon = 'Search',
  disabled = false,
  type = 'text',
  isDark = false // Pour les variantes de couleur
}) {
  const { startListening, stopListening, transcript, isListening, error, isSupported } = useSpeechRecognition()
  const [inputValue, setInputValue] = useState(value || '')

  // Mettre à jour l'input avec la reconnaissance vocale
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript)
      onChange?.(transcript)
    }
  }, [transcript, onChange])

  // Mettre à jour avec le prop value
  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  const handleMicClick = () => {
    if (isListening) {
      stopListening()
    } else {
      setInputValue('') // Effacer avant le nouvel enregistrement
      startListening()
    }
  }

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    onChange?.(e.target.value)
  }

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit?.(inputValue)
      if (inputValue.trim()) {
        setInputValue('')
      }
    }
  }

  const bgClass = isDark ? 'bg-[#082f50]' : 'bg-white'
  const textClass = isDark ? 'text-white' : 'text-gray-800'
  const borderClass = isDark ? 'border-white/10' : 'border-gray-300'
  const placeholderClass = isDark ? 'placeholder-[#8fa3b5]' : 'placeholder-gray-400'

  return (
    <div className={`w-full space-y-2 ${isDark ? '' : ''}`}>
      {/* Input avec icônes */}
      <div className={`flex items-center gap-2 ${bgClass} ${borderClass} border rounded-2xl px-4 py-3 shadow-md hover:${borderClass} transition flex-wrap`}>
        {/* Icône principale */}
        {icon && <span className={`text-xl ${isDark ? 'text-[#eef5fb]' : 'text-gray-600'}`}>{icon}</span>}

        {/* Input texte */}
        <input
          type={type}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 outline-none ${bgClass} ${textClass} ${placeholderClass} text-sm min-w-[150px]`}
          style={{ background: 'transparent', color: isDark ? '#ffffff' : '#1f2937' }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSubmit()
            }
          }}
        />

        {/* Bouton Microphone */}
        {isSupported && (
          <button
            onClick={handleMicClick}
            disabled={disabled}
            className={`p-2 rounded-lg transition flex items-center justify-center text-lg ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : disabled
                ? `${isDark ? 'text-gray-500' : 'text-gray-300'} cursor-not-allowed`
                : `${isDark ? 'text-[#8fa3b5] hover:text-white' : 'text-gray-600 hover:bg-gray-100'}`
            }`}
            title={isListening ? 'Arrêter l\'enregistrement' : 'Parler au lieu d\'écrire'}
            aria-label="Reconnaissance vocale"
          >
            {isListening ? 'Mic On' : 'Mic'}
          </button>
        )}

        {/* Bouton Submit */}
        {inputValue.trim() && (
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="p-2 bg-[#1260a1] text-white rounded-lg hover:bg-blue-700 transition font-bold text-sm"
            title="Envoyer"
          >
            OK
          </button>
        )}
      </div>

      {/* Messages d'erreur vocale */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* État en écoute */}
      {isListening && (
        <div className="flex items-center gap-2 text-orange-600 text-sm font-semibold animate-pulse">
          <span className="text-lg">Mic</span>
          <span>Écoute en cours...</span>
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-orange-600 rounded animate-bounce"></div>
            <div className="w-1 h-3 bg-orange-600 rounded animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-3 bg-orange-600 rounded animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}

      {/* Message supportabilité */}
      {!isSupported && (
        <p className="text-xs text-gray-500 italic">
          Astuce: la reconnaissance vocale n'est pas supportee sur ce navigateur
        </p>
      )}
    </div>
  )
}
