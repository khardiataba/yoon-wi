// frontend/src/components/RatingModal.jsx
import React, { useState } from 'react';
import RatingStars from './RatingStars';
import Toast from './Toast';

const RatingModal = ({
  isOpen,
  onClose,
  onSubmit,
  title = "Noter le service",
  subtitle = "Votre avis nous aide à améliorer nos services",
  type = "ride", // "ride" ou "service"
  targetName = "",
  loading = false
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setToast({
        type: 'error',
        message: 'Veuillez sélectionner une note'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        rating,
        comment: comment.trim()
      });

      setToast({
        type: 'success',
        message: 'Merci pour votre notation !'
      });

      // Fermer la modal après un court délai
      setTimeout(() => {
        onClose();
        // Reset form
        setRating(0);
        setComment('');
      }, 1500);

    } catch (error) {
      setToast({
        type: 'error',
        message: error.message || 'Erreur lors de la soumission'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabels = () => {
    const labels = {
      1: "Très insatisfait",
      2: "Insatisfait",
      3: "Moyen",
      4: "Satisfait",
      5: "Excellent"
    };
    return labels[rating] || "";
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
            {targetName && (
              <p className="text-sm font-medium text-gray-800 mt-2">
                {type === 'ride' ? 'Chauffeur' : 'Prestataire'}: {targetName}
              </p>
            )}
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Rating Stars */}
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Votre note
                </label>
                <RatingStars
                  rating={rating}
                  interactive={true}
                  onRatingChange={setRating}
                  size="xl"
                  className="justify-center"
                />
                {rating > 0 && (
                  <p className="text-sm text-gray-600 mt-2">{getRatingLabels()}</p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partagez votre expérience..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {comment.length}/500 caractères
                </p>
              </div>

              {/* Rating Tips */}
              <div className="bg-blue-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  💡 Conseils pour une bonne notation
                </h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Soyez honnête et constructif</li>
                  <li>• Mentionnez les points positifs et les améliorations possibles</li>
                  <li>• Votre avis aide les autres utilisateurs</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                disabled={isSubmitting}
              >
                Plus tard
              </button>
              <button
                type="submit"
                disabled={rating === 0 || isSubmitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Envoi...
                  </div>
                ) : (
                  'Noter'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default RatingModal;