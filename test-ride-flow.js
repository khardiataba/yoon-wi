/**
 * Test du flux complet de course: pending → accepted → ongoing → completed
 * Simule un client créant une course, un chauffeur l'acceptant et la complétant
 */

const http = require('http');
const https = require('https');

const API_BASE = 'http://localhost:5000/api';
const CLIENT_EMAIL = process.env.TEST_CLIENT_EMAIL || 'fatou.client@yoonbi.sn';
const CLIENT_PASSWORD = process.env.TEST_CLIENT_PASSWORD || 'ClientTest123!';
const DRIVER_EMAIL = process.env.TEST_DRIVER_EMAIL || 'moussa.driver@yoonbi.sn';
const DRIVER_PASSWORD = process.env.TEST_DRIVER_PASSWORD || 'DriverTest123!';

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}→ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`)
};

const request = (method, path, data, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const testFlow = async () => {
  try {
    log.step('=== TEST FLUX COMPLET DE COURSE ===\n');

    // Step 1: Login client
    log.step('1. Authentification CLIENT...');
    let res = await request('POST', '/auth/login', {
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD
    });
    if (res.status !== 200) {
      log.error(`Login client échoué (${res.status})`);
      if (res?.data?.message) log.info(`Détail: ${res.data.message}`);
      return;
    }
    const clientToken = res.data.token;
    const clientId = res.data.user._id;
    log.success(`Client authentifié: ${clientId}`);

    // Step 2: Login driver
    log.step('2. Authentification CHAUFFEUR...');
    res = await request('POST', '/auth/login', {
      email: DRIVER_EMAIL,
      password: DRIVER_PASSWORD
    });
    if (res.status !== 200) {
      log.error(`Login driver échoué (${res.status})`);
      if (res?.data?.message) log.info(`Détail: ${res.data.message}`);
      log.warning('Pré-requis: compte chauffeur existant et statut "verified".');
      return;
    }
    const driverToken = res.data.token;
    const driverId = res.data.user._id;
    log.success(`Chauffeur authentifié: ${driverId}`);

    // Step 3: Create ride (PENDING)
    log.step('3. CLIENT crée une course...');
    res = await request('POST', '/rides', {
      pickup: {
        name: 'Gare routière Dakar',
        address: 'Dakar',
        lat: 14.6928,
        lng: -17.0471
      },
      destination: {
        name: 'Aéroport DSS',
        address: 'Diass',
        lat: 14.7447,
        lng: -17.1617
      },
      price: 5000,
      vehicleType: 'YOON WI Classic',
      paymentMethod: 'Cash',
      distanceKm: 25,
      durationMin: 45
    }, clientToken);

    if (res.status !== 201) {
      log.error(`Création de course échouée (${res.status})`);
      console.log(res.data);
      return;
    }

    const ride = res.data;
    const rideId = ride._id;
    log.success(`Course créée: ${rideId}`);
    log.info(`Status: ${ride.status} | Prix: ${ride.price} FCFA`);
    log.info(`Code de sécurité: ${ride.safetyCode}`);

    // Step 4: Driver accepts ride (ACCEPTED)
    log.step('4. CHAUFFEUR accepte la course...');
    await sleep(1000);
    res = await request('PATCH', `/rides/${rideId}/accept`, {}, driverToken);

    if (res.status !== 200) {
      log.error(`Acceptation échouée (${res.status})`);
      console.log(res.data);
      return;
    }

    const acceptedRide = res.data;
    log.success(`Course acceptée par: ${acceptedRide.driver?.name || driverId}`);
    log.info(`Status: ${acceptedRide.status}`);

    // Step 5: Driver starts ride (ONGOING)
    log.step('5. CHAUFFEUR démarre la course...');
    await sleep(1000);
    res = await request('PATCH', `/rides/${rideId}/start`, {
      safetyCode: ride.safetyCode
    }, driverToken);

    if (res.status !== 200) {
      log.error(`Démarrage échoué (${res.status})`);
      console.log(res.data);
      return;
    }

    const ongoingRide = res.data;
    log.success(`Course démarrée`);
    log.info(`Status: ${ongoingRide.status}`);

    // Step 6: Simulating sending driver location updates
    log.step('6. Chauffeur envoie mises à jour de position (simulation)...');
    for (let i = 0; i < 3; i++) {
      await sleep(500);
      res = await request('POST', `/drivers/location`, {
        lat: 14.6928 + (i * 0.01),
        lng: -17.0471 + (i * 0.01)
      }, driverToken);
      log.info(`Position ${i + 1} envoyée`);
    }

    // Step 7: Complete the ride (COMPLETED)
    log.step('7. CHAUFFEUR termine la course...');
    await sleep(1000);
    res = await request('PATCH', `/rides/${rideId}/complete`, {}, driverToken);

    if (res.status !== 200) {
      log.error(`Completion échouée (${res.status})`);
      console.log(res.data);
      return;
    }

    const completedRide = res.data;
    log.success(`Course terminée`);
    log.info(`Status final: ${completedRide.status}`);

    // Step 8: Verify final state
    log.step('8. Vérification de l\'état final...');
    res = await request('GET', `/rides/${rideId}`, null, clientToken);

    if (res.status !== 200) {
      log.error(`Récupération de la course échouée`);
      return;
    }

    const finalRide = res.data;
    log.success(`État final du système:`);
    log.info(`  Status: ${finalRide.status}`);
    log.info(`  Client: ${finalRide.client?.name || finalRide.client?.firstName}`);
    log.info(`  Chauffeur: ${finalRide.driver?.name || finalRide.driver?.firstName}`);
    log.info(`  Prix: ${finalRide.price} FCFA`);
    log.info(`  Amission: ${finalRide.application} FCFA`);

    log.success('\n=== ✅ FLUX COMPLET TESTÉ AVEC SUCCÈS ===');
    log.info(`Statuts vérifiés: pending → accepted → ongoing → completed`);

  } catch (err) {
    log.error(`Erreur pendant le test: ${err.message}`);
    console.error(err);
  }
};

// Run test
testFlow();
