# Configuration Google Maps pour Yoonbi

## Prérequis

Avant de pouvoir utiliser les fonctionnalités Google Maps dans Yoonbi, vous devez :

1. **Créer un compte Google Cloud Platform** (si vous n'en avez pas)
2. **Activer les APIs Google Maps** nécessaires
3. **Générer une clé API** et la configurer

## Étapes de configuration

### 1. Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez la facturation (nécessaire pour utiliser les APIs Google Maps)

### 2. Activer les APIs requises

Activez les APIs suivantes dans votre projet Google Cloud :

- **Maps JavaScript API** - Pour afficher les cartes
- **Directions API** - Pour calculer les itinéraires
- **Distance Matrix API** - Pour calculer les distances et durées
- **Geocoding API** - Pour convertir adresses ↔ coordonnées
- **Places API** - Pour la recherche de lieux

### 3. Créer une clé API

1. Dans Google Cloud Console, allez dans "APIs & Services" > "Credentials"
2. Cliquez sur "Create Credentials" > "API Key"
3. Copiez la clé générée
4. **IMPORTANT :** Restreignez la clé pour des raisons de sécurité :
   - Allez dans "APIs & Services" > "Credentials"
   - Cliquez sur votre clé API
   - Dans "Application restrictions", sélectionnez "HTTP referrers"
   - Ajoutez vos domaines (ex: `localhost:3000/*`, `votredomaine.com/*`)
   - Dans "API restrictions", sélectionnez "Restrict key" et cochez les APIs activées

### 4. Configuration dans Yoonbi

#### Backend (.env)
```env
GOOGLE_MAPS_API_KEY=votre_cle_api_google_maps
```

#### Frontend (.env)
```env
REACT_APP_GOOGLE_MAPS_API_KEY=votre_cle_api_google_maps
```

### 5. Tester la configuration

1. Démarrez le serveur backend : `npm start` dans `/backend`
2. Démarrez le frontend : `npm start` dans `/frontend`
3. Testez les fonctionnalités Google Maps :
   - Sélection de lieux sur la carte
   - Calcul d'itinéraires
   - Estimation des prix

## Fonctionnalités Google Maps dans Yoonbi

### Frontend
- **GoogleMap.jsx** : Composant principal de carte avec marqueurs et polylignes
- **LocationPicker.jsx** : Sélecteur de lieux avec recherche
- **RideEstimator.jsx** : Calculateur d'itinéraires et de prix
- **useGoogleMaps.js** : Hook pour l'initialisation Google Maps

### Backend
- **googleMapsService.js** : Service pour tous les appels API Google Maps
- **mapsRoutes.js** : Routes API pour les calculs côté serveur
- Calcul d'itinéraires, géocodage, recherche de lieux
- Calcul automatique des prix basé sur distance et durée
- Système de multiplicateur de pointe (surge pricing)

## Dépannage

### Erreur "Google Maps API key"
- Vérifiez que la clé API est correctement configurée dans les fichiers `.env`
- Assurez-vous que la clé n'est pas restreinte ou expirée

### Erreur "API not enabled"
- Vérifiez que toutes les APIs requises sont activées dans Google Cloud Console

### Erreur "Referer not allowed"
- Vérifiez les restrictions de domaine sur votre clé API
- Pour le développement local, ajoutez `localhost:3000/*`

### Erreur "Billing not enabled"
- Activez la facturation sur votre projet Google Cloud
- Google Maps nécessite un compte de facturation même pour les quotas gratuits

## Quotas et coûts

Google Maps offre des quotas gratuits généreux :
- Maps JavaScript API : 28,000 requêtes/jour gratuites
- Directions API : 40,000 requêtes/mois gratuites
- Geocoding API : 40,000 requêtes/mois gratuites

Au-delà des quotas gratuits, les coûts sont :
- ~$0.005 par requête Directions
- ~$0.005 par requête Geocoding
- ~$0.007 par requête Distance Matrix

Pour un usage modéré, les coûts restent très faibles.