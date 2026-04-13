// frontend/src/components/GoogleMapsError.jsx
import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

const GoogleMapsError = ({ error, onRetry }) => {
  const getErrorMessage = (error) => {
    if (error.includes('clé API')) {
      return {
        title: 'Clé API Google Maps manquante',
        message: 'La clé API Google Maps n\'est pas configurée. Suivez le guide de configuration pour l\'installer.',
        action: 'Voir le guide',
        link: '/GOOGLE_MAPS_SETUP.md'
      };
    }

    if (error.includes('chargement')) {
      return {
        title: 'Erreur de chargement Google Maps',
        message: 'Impossible de charger Google Maps. Vérifiez votre connexion internet et réessayez.',
        action: 'Réessayer',
        onClick: onRetry
      };
    }

    return {
      title: 'Erreur Google Maps',
      message: error,
      action: 'Réessayer',
      onClick: onRetry
    };
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <div className="text-center p-6">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {errorInfo.title}
        </h3>
        <p className="text-gray-600 mb-4 max-w-md">
          {errorInfo.message}
        </p>

        {errorInfo.link ? (
          <a
            href={errorInfo.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {errorInfo.action}
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        ) : (
          <button
            onClick={errorInfo.onClick}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {errorInfo.action}
          </button>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500 max-w-md text-center">
        <p>
          Besoin d'aide ? Consultez le fichier{' '}
          <code className="bg-gray-200 px-1 py-0.5 rounded">GOOGLE_MAPS_SETUP.md</code>{' '}
          à la racine du projet.
        </p>
      </div>
    </div>
  );
};

export default GoogleMapsError;