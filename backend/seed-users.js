/**
 * Script pour insérer les utilisateurs de test dans MongoDB
 * Exécution: node seed-users.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const testUsers = [
  {
    firstName: "Admin",
    lastName: "YOONWI",
    email: "admin@yoonwi.sn",
    password: "admin12345",
    phone: "+221781488070",
    role: "admin",
    status: "verified"
  },
  {
    firstName: "Fatou",
    lastName: "Diallo",
    email: "fatoudiallo1@gmail.com",
    password: "fatoudiallo1",
    phone: "+221771234567",
    role: "client"
  },
  {
    firstName: "Moussa",
    lastName: "Ba",
    email: "moussaba1@gmail.com",
    password: "moussaba1",
    phone: "+221772345678",
    role: "driver",
    status: "verified",
    commissionCreditBalance: 5000,
    providerDetails: {
      serviceCategory: "Livraison / Coursier",
      serviceArea: "Centre-ville",
      availability: "7j/7, 6h-20h",
      experienceYears: "5",
      hasProfessionalTools: true,
      vehicleBrand: "Toyota",
      vehicleType: "Berline",
      vehiclePlate: "AB-123-CD",
      coordinates: { lat: 16.0244, lng: -16.5015 }
    }
  },
  {
    firstName: "Cheikh",
    lastName: "Ndiaye",
    email: "chauffeur@yoonwi.sn",
    password: "chauffeur123",
    phone: "+221771112233",
    role: "driver",
    status: "verified",
    commissionCreditBalance: 10000,
    providerDetails: {
      serviceCategory: "Livraison / Coursier",
      serviceArea: "Centre-ville",
      locationLabel: "Centre-ville, Saint-Louis",
      availability: "7j/7, 7h-22h",
      experienceYears: "6",
      hasProfessionalTools: true,
      vehicleBrand: "Toyota",
      vehicleType: "Voiture",
      vehiclePlate: "DK-456-AB",
      coordinates: { lat: 16.0244, lng: -16.5015 }
    }
  },
  {
    firstName: "Aissatou",
    lastName: "Sow",
    email: "aissatousow1@gmail.com",
    password: "aissatousow1",
    phone: "+221773456789",
    role: "technician",
    status: "verified",
    commissionCreditBalance: 7000,
    providerDetails: {
      serviceCategory: "Coiffure & Beaute",
      serviceArea: "Guet-Ndar",
      availability: "Lun-Sam, 8h-18h",
      experienceYears: "8",
      hasProfessionalTools: true,
      beautySpecialty: "Coiffure, Tresses, Soins",
      coordinates: { lat: 16.0188, lng: -16.4919 }
    }
  },
  {
    firstName: "Khardiata",
    lastName: "Ba",
    email: "khardiataba1@gmail.com",
    password: "khardiataba1",
    phone: "+221774567890",
    role: "client"
  }
];

async function seedUsers() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('OK Connecté à MongoDB');

    const savedUsers = [];

    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const name = `${userData.firstName} ${userData.lastName}`.trim();

      const payload = {
        ...userData,
        password: hashedPassword,
        name: name,
        status: userData.status || (userData.role === 'driver' || userData.role === 'technician' ? 'pending' : 'verified'),
        commissionCreditBalance: Number(userData.commissionCreditBalance || 0),
        commissionCreditUpdatedAt: new Date(),
        rating: 5.0,
        totalRatings: 0,
        ratingSum: 0,
        completedRides: 0,
        cancelledRides: 0,
        onTimeRate: 1.0,
        totalEarnings: 0,
        todayEarnings: 0,
        weeklyEarnings: 0,
        monthlyEarnings: 0,
        isOnline: false,
        lastSeen: new Date(),
        safetyReportsCount: 0,
        safetySuspendedAt: null,
        safetySuspensionReason: "",
        safetyLastReportAt: null
      };

      const savedUser = await User.findOneAndUpdate(
        { email: userData.email },
        { $set: payload },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
      savedUsers.push(savedUser);
    }
    
    console.log('\nUtilisateurs de test synchronisés avec succès !\n');
    
    savedUsers.forEach((user, index) => {
      console.log(`USER ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   Rôle: ${user.role}`);
      console.log(`   Statut: ${user.status}`);
      if (["driver", "technician", "server"].includes(user.role)) {
        console.log(`   Crédit commission: ${Number(user.commissionCreditBalance || 0)} F`);
      }
      if (user.providerDetails && user.providerDetails.serviceCategory) {
        console.log(`   Catégorie: ${user.providerDetails.serviceCategory}`);
      }
      console.log('');
    });

    console.log('NOTE Pour tester, utilisez ces identifiants:');
    console.log('   - Email: l\'email de l\'utilisateur');
    console.log('   - Mot de passe: le mot de passe en clair (ex: fatoudiallo1)');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nSOCKET Déconnecté de MongoDB');
  }
}

// Exécuter le script
seedUsers();
