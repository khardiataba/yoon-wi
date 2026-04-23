import React from 'react'
import AppIcon from './AppIcon'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-red-50 px-4">
          <div className="rounded-lg bg-white p-8 shadow-lg max-w-md">
            <div className="flex items-center justify-center mb-4">
              <AppIcon name="info" className="h-12 w-12 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Oups! Une erreur s'est produite</h1>
            <p className="text-gray-600 mb-4">
              Notre équipe a été notifiée. Veuillez réessayer.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-gray-100 p-3 rounded text-xs text-gray-700 mb-4 max-h-32 overflow-auto">
                <pre>{this.state.error.toString()}</pre>
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full bg-[#165c96] text-white py-2 px-4 rounded font-semibold hover:bg-[#0d4273] transition"
            >
              Retourner à l'accueil
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
