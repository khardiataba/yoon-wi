// backend/models/Wallet.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'refund', 'bonus', 'withdrawal'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'XOF' // Franc CFA
  },
  description: {
    type: String,
    required: true
  },
  reference: {
    type: String, // ID de course, paiement Stripe, etc.
    required: true
  },
  referenceType: {
    type: String,
    enum: ['ride', 'service', 'stripe_payment', 'manual', 'bonus'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'stripe', 'cash', 'wave', 'om', 'free_money', 'bank_transfer'],
    default: 'wallet'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'XOF'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  autoRecharge: {
    enabled: {
      type: Boolean,
      default: false
    },
    threshold: {
      type: Number,
      default: 5000 // Seuil de recharge automatique
    },
    amount: {
      type: Number,
      default: 10000 // Montant de recharge automatique
    }
  },
  paymentMethods: [{
    type: {
      type: String,
      enum: ['stripe', 'wave', 'om', 'free_money', 'bank_card'],
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  statistics: {
    totalCredited: {
      type: Number,
      default: 0
    },
    totalDebited: {
      type: Number,
      default: 0
    },
    totalRides: {
      type: Number,
      default: 0
    },
    totalServices: {
      type: Number,
      default: 0
    },
    lastTransactionAt: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

// Index pour les performances
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ reference: 1, referenceType: 1 });
walletSchema.index({ userId: 1 });

// Méthodes d'instance pour Wallet
walletSchema.methods.addBalance = function(amount, description, reference, referenceType, paymentMethod = 'wallet') {
  this.balance += amount;
  this.statistics.totalCredited += amount;
  this.statistics.lastTransactionAt = new Date();

  return this.save();
};

walletSchema.methods.deductBalance = function(amount, description, reference, referenceType, paymentMethod = 'wallet') {
  if (this.balance < amount) {
    throw new Error('Solde insuffisant');
  }

  this.balance -= amount;
  this.statistics.totalDebited += amount;
  this.statistics.lastTransactionAt = new Date();

  return this.save();
};

walletSchema.methods.canAfford = function(amount) {
  return this.balance >= amount;
};

walletSchema.methods.getTransactionHistory = function(limit = 20, offset = 0) {
  return mongoose.model('Transaction').find({ userId: this.userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

// Méthodes statiques
walletSchema.statics.findOrCreate = async function(userId) {
  let wallet = await this.findOne({ userId });
  if (!wallet) {
    wallet = new this({ userId });
    await wallet.save();
  }
  return wallet;
};

const Wallet = mongoose.model('Wallet', walletSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = { Wallet, Transaction };