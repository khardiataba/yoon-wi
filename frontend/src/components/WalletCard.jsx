// frontend/src/components/WalletCard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Toast from './Toast';

const WalletCard = ({ className = '' }) => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [walletResponse, transactionsResponse] = await Promise.all([
        axios.get('/api/payments/wallet/balance'),
        axios.get('/api/payments/wallet/transactions?limit=10')
      ]);

      setWallet(walletResponse.data);
      setTransactions(transactionsResponse.data.transactions);
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
      setToast({
        type: 'error',
        message: 'Erreur lors du chargement du portefeuille'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    const icons = {
      credit: '💰',
      debit: '💸',
      refund: '↩️',
      bonus: '🎁',
      withdrawal: '🏦'
    };
    return icons[type] || '💳';
  };

  const getTransactionColor = (type) => {
    const colors = {
      credit: 'text-green-600',
      debit: 'text-red-600',
      refund: 'text-blue-600',
      bonus: 'text-purple-600',
      withdrawal: 'text-orange-600'
    };
    return colors[type] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-white rounded-lg shadow-md ${className}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Mon Portefeuille</h3>
              <p className="text-blue-100 text-sm">Solde disponible</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {formatAmount(wallet?.balance || 0)}
              </div>
              <div className="text-xs text-blue-100">
                {wallet?.currency || 'XOF'}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
              <span className="text-lg mr-2">💳</span>
              <span className="text-sm font-medium">Recharger</span>
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="text-lg mr-2">📊</span>
              <span className="text-sm font-medium">Historique</span>
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                +{formatAmount(wallet?.statistics?.totalCredited || 0)}
              </div>
              <div className="text-xs text-gray-500">Reçus</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                -{formatAmount(wallet?.statistics?.totalDebited || 0)}
              </div>
              <div className="text-xs text-gray-500">Dépensés</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {wallet?.statistics?.totalRides || 0}
              </div>
              <div className="text-xs text-gray-500">Courses</div>
            </div>
          </div>

          {/* Transaction History Toggle */}
          {showHistory && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Dernières transactions
              </h4>

              {transactions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucune transaction récente
                </p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <span className="text-lg mr-3">
                          {getTransactionIcon(transaction.type)}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'credit' ? '+' : '-'}
                        {formatAmount(transaction.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {transactions.length >= 10 && (
                <button className="w-full mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Voir tout l'historique →
                </button>
              )}
            </div>
          )}
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

export default WalletCard;