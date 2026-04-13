# 🆕 Nouvelles Fonctionnalités - Locations de Véhicules & Galeries

## 📋 Vue d'ensemble

Cette mise à jour ajoute deux features majeures à l'application Ubbi Ndar:

### 1. **Locations de Véhicules** 🚗
Service de location de véhicules avec deux catégories:
- **Petit format** (🏍️): Motos, scooters, voitures compactes
- **Grand format** (🚐): SUV, minibus, vans

### 2. **Galeries de Prestataires** 📸
Système de galerie photos pour les prestataires afin de présenter:
- Leurs travaux réalisés (avant/après)
- Leur portfolio
- Leur équipe
- Leurs installations

---

## 🔧 Structure Backend

### Nouveaux Modèles MongoDB

#### 1. **VehicleRental** (`backend/models/VehicleRental.js`)
```
├── provider (ref: User)
├── vehicleName (String)
├── vehicleType (small | large)
├── description
├── pricePerDay (Number)
├── pricePerHour (Number, optionnel)
├── capacity
│   ├── passengers
│   └── luggage
├── brand, model, year, color
├── licensePlate
├── availabilityStatus (available, rented, maintenance)
├── location
│   ├── address
│   ├── lat, lng
├── features (Array)
├── insuranceIncluded (Boolean)
├── driverLicenseRequired (Boolean)
├── photoUrl
├── additionalPhotos (Array)
├── rating
└── totalRentals
```

#### 2. **ProviderGallery** (`backend/models/ProviderGallery.js`)
```
├── provider (ref: User, unique)
├── galleryItems (Array)
│   ├── title
│   ├── description
│   ├── imageUrl
│   ├── thumbnailUrl
│   ├── category (work, portfolio, before-after, team, facility)
│   ├── beforeAfter
│   │   ├── beforeUrl
│   │   └── afterUrl
│   ├── tags (Array)
│   └── uploadedAt
├── coverImage
├── totalImages
└── timestamps
```

### Nouvelles Routes API

#### Rentals (`/api/rentals`)
```
GET    /rentals                    # Lister les locations disponibles
GET    /rentals/:id                # Détails d'une location
GET    /rentals/type/:typeQuery    # Locations par type
GET    /rentals/provider/:providerId  # Locations d'un prestataire
POST   /rentals                    # Créer une location (Technician)
PUT    /rentals/:id                # Modifier une location (Technician)
DELETE /rentals/:id                # Supprimer une location (Technician)
```

#### Gallery (`/api/gallery`)
```
GET    /gallery/provider/:providerId                    # Galerie complète
GET    /gallery/provider/:providerId/category/:category # Par catégorie
POST   /gallery/:providerId/upload                      # Upload simple
POST   /gallery/:providerId/upload-before-after         # Upload avant/après
PUT    /gallery/:providerId/cover                       # Changer couverture
DELETE /gallery/:providerId/item/:itemId                # Supprimer un item
```

---

## 🎨 Structure Frontend

### Nouveaux Composants

#### 1. **VehicleCard** (`src/components/VehicleCard.jsx`)
Affiche un véhicule en format carte avec:
- Photo du véhicule
- Infos principales (marque, modèle, année)
- Prix par jour/heure
- Fonctionnalités
- Infos prestataire
- Statut assurance

#### 2. **GalleryViewer** (`src/components/GalleryViewer.jsx`)
Lecteur de galerie avec:
- Slideshow principal
- Filtrage par catégorie
- Mode avant/après
- Thumbnails
- Navigation
- Compteur images

#### 3. **GalleryUploader** (`src/components/GalleryUploader.jsx`)
Gestionnaire d'upload avec:
- Upload simple ou avant/après
- Métadonnées (titre, description, tags)
- Aperçu avant upload
- Gestion d'erreurs

#### 4. **ProviderPortfolio** (`src/components/ProviderPortfolio.jsx`)
Tableau de bord galerie pour prestataires avec:
- Visualisation galerie
- Upload/gestion photos
- Suppression images

#### 5. **VehicleManagement** (`src/components/VehicleManagement.jsx`)
Gestion des véhicules pour prestataires avec:
- Ajouter/modifier/supprimer véhicules
- Changer statut (disponible/maintenance)
- Formulaire complet avec validations

### Nouvelles Pages

#### 1. **Rental** (`src/pages/Rental.jsx`)
Page de navigation pour les locations:
- Filtre par type (petit/grand)
- Recherche par nom/marque
- Liste en grille
- Localisation utilisateur

#### 2. **RentalDetail** (`src/pages/RentalDetail.jsx`)
Page détail d'une location avec:
- Photos et carrousel
- Infos complètes du véhicule
- Galerie prestataire intégrée
- Formulaire de réservation
- Infos prestataire

---

## 🔌 Intégrations

### App.js - Nouvelles Routes
```javascript
<Route path="/rental" element={<Rental />} />
<Route path="/rental/:id" element={<RentalDetail />} />
```

### BottomNav - Nouveau Lien
```
Locations 🚗 → /rental
```

### Home.jsx - Nouvelle Section
```
Carte feature "Location de Vehicules"
Action: /rental
```

---

## 📤 Upload de Fichiers

### Configuration Multer
- **Dossier**: `backend/uploads/gallery/`
- **Format**: JPG, PNG, WebP, GIF
- **Taille max**: 10MB
- **Nommage**: `gallery-{timestamp}-{random}.{ext}`

---

## 🚀 Utilisation

### Pour les Clients
1. Aller à la page "Locations" depuis le menu
2. Filtrer par type de véhicule
3. Cliquer sur un véhicule pour voir les détails
4. Voir la galerie du prestataire
5. Faire une demande de réservation

### Pour les Prestataires (Technicians)
1. **Ajouter des véhicules**:
   - Aller au tableau de bord
   - Section "Mes Véhicules"
   - Clic "Ajouter un véhicule"
   - Remplir formulaire complet

2. **Gérer les photos**:
   - Aller au tableau de bord
   - Section "Portfolio"
   - Ajouter photos simples ou avant/après
   - Organiser par catégorie
   - Supprimer si besoin

---

## 📊 Exemple de Données

### Créer une Location
```bash
POST /api/rentals
{
  "vehicleName": "Toyota Corolla",
  "vehicleType": "small",
  "brand": "Toyota",
  "model": "Corolla",
  "year": 2022,
  "color": "Bleu",
  "licensePlate": "SL-456-XYZ",
  "pricePerDay": 25000,
  "pricePerHour": 3000,
  "capacity": {
    "passengers": 5,
    "luggage": "Standard"
  },
  "features": ["Climatisation", "GPS", "Bluetooth"],
  "insuranceIncluded": true,
  "driverLicenseRequired": true,
  "description": "Voiture de tourisme confortable..."
}
```

### Upload Photo Galerie
```bash
POST /api/gallery/:providerId/upload (multipart/form-data)
- image: <fichier>
- title: "Rénovation salon"
- description: "Travail de refonte..."
- category: "work"
- tags: "salons,finition,peinture"
```

---

## 🛡️ Sécurité

- ✅ Authentification requise pour upload/création
- ✅ Vérification propriété (user = provider)
- ✅ Validation MIME types fichiers
- ✅ Taille maximale fichiers
- ✅ Suppression fichiers anciens lors suppression item

---

## 📱 Responsive Design

- ✅ Mobile-first approach
- ✅ Grille adaptative (1 col mobile → 3 cols desktop)
- ✅ Images optimisées
- ✅ Touches ergonomiques pour mobile

---

## 🚧 Prochaines Améliorations

- [ ] Intégration de paiement pour réservations
- [ ] Système de notation pour véhicules
- [ ] Calendrier de disponibilité
- [ ] Notifications de réservation
- [ ] Compression d'images automatique
- [ ] Support vidéo courtes (TikTok-like)
- [ ] Statistiques prestataires
- [ ] Export galerie PDF

---

## 📞 Support

Pour toute question, consulter:
- [ROADMAP_TO_100_PERCENT.md](../ROADMAP_TO_100_PERCENT.md)
- [Backend README](../backend/)
- [Frontend README](../frontend/)

