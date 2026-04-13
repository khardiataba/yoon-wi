# 🧪 Guide de Teste - Locations & Galeries

## 🚀 Quick Start

### 1. Démarrer le serveur backend
```bash
cd backend
npm start
```

### 2. Démarrer l'application frontend
```bash
cd frontend
npm start
```

---

## 👥 Test comme Prestataire (Technician)

### Étape 1: Créer un Compte Prestataire
1. Aller à `/signup`
2. Sélectionner rôle "Technician/Prestataire"
3. Remplir les informations
4. Sélectionner catégorie de service
5. Valider l'entrée admin

### Étape 2: Ajouter un Véhicule
1. Aller au tableau de bord technician
2. Chercher la section "Mes Véhicules"
3. Clic "➕ Ajouter un véhicule"
4. Remplir le formulaire:
   - Nom: "Toyota Corolla 2022"
   - Type: "Petit format"
   - Prix jour: 25000 XOF
   - Prix heure: 3000 XOF
   - Équipements: "Climatisation, GPS, Bluetooth"
   - Assurance: ✅ Incluse
5. Clic "Ajouter le véhicule"

### Étape 3: Uploader des Photos
1. Aller au tableau de bord technician
2. Section "Portfolio"
3. Onglet "Ajouter des photos"
4. Mode "Photo simple"
5. Sélectionner image (JPG/PNG)
6. Remplir détails:
   - Titre: "Mon véhicule en action"
   - Catégorie: "work"
   - Tags: "location, vehicule"
7. Clic "Upload"

### Étape 4: Uploader Avant/Après
1. Mode "Avant/Après"
2. Sélectionner 2 images
3. Titre: "Nettoyage intérieur"
4. Clic "Upload"

---

## 👤 Test comme Client

### Étape 1: Accéder aux Locations
1. Menu: "🚗 Locations"
2. Voir liste des véhicules disponibles

### Étape 2: Filtrer
- **Type**: Petit/Grand format
- **Recherche**: Marque, prestataire, nom

### Étape 3: Voir Détail
1. Clic sur un véhicule
2. Voir:
   - Photos véhicule
   - Galerie prestataire
   - Infos complètes
   - Prestataire

### Étape 4: Faire Réservation
1. Clic "🚗 Réserver maintenant"
2. Sélectionner dates
3. Voir prix total
4. Ajouter message
5. Clic "Confirmer"

---

## 🔧 Tests API avec cURL

### Get All Rentals
```bash
curl -X GET "http://localhost:5000/api/rentals?lat=16.0244&lng=-16.5015" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Rentals by Type
```bash
curl -X GET "http://localhost:5000/api/rentals/type/small?lat=16.0244&lng=-16.5015" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Rental
```bash
curl -X POST "http://localhost:5000/api/rentals" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleName": "Honda CB500",
    "vehicleType": "small",
    "brand": "Honda",
    "model": "CB500",
    "year": 2023,
    "color": "Rouge",
    "pricePerDay": 15000,
    "features": ["Économique", "Léger"],
    "insuranceIncluded": true
  }'
```

### Upload Photo à Galerie
```bash
curl -X POST "http://localhost:5000/api/gallery/USER_ID/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/photo.jpg" \
  -F "title=Travail réalisé" \
  -F "description=Excellent résultat" \
  -F "category=work" \
  -F "tags=menuiserie,bois"
```

### Get Gallery
```bash
curl -X GET "http://localhost:5000/api/gallery/provider/USER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Checklist de Test

### Backend
- [ ] Routes rentals créées
- [ ] Routes gallery créées  
- [ ] Upload fichiers fonctionne
- [ ] Authentification vérifiée
- [ ] Propriété vérifiée
- [ ] Calcul distance OK
- [ ] Filtres travaillent

### Frontend
- [ ] Page Rental affichée
- [ ] RentalDetail affichée
- [ ] VehicleCard affichée
- [ ] GalleryViewer fonctionne
- [ ] GalleryUploader fonctionne
- [ ] Upload photos OK
- [ ] Avant/après OK
- [ ] Filtres travaillent
- [ ] Recherche OK
- [ ] Responsive mobile/desktop

### UX/UI
- [ ] Icônes clairs
- [ ] Couleurs cohérentes
- [ ] Navigation intuitive
- [ ] Messages d'erreur clairs
- [ ] Loading states visibles
- [ ] Toasts affichés
- [ ] Boutons accessibles

---

## 🐛 Troubleshooting

### "Photo non uploadée"
- Vérifier format (JPG, PNG, WebP, GIF)
- Vérifier taille < 10MB
- Vérifier dossier `backend/uploads/gallery/` existe
- Vérifier permissions dossier

### "404 - Location non trouvée"
- Vérifier ID exists en DB
- Vérifier authentification token
- Vérifier routes importées dans server.js

### "Galerie vide"
- Créer d'abord un prestataire
- Uploader une photo
- Rafraîchir page

### "Erreur authentification"
- Vérifier token dans localStorage
- Vérifier middleware auth.js
- Vérifier JWT_SECRET dans .env

---

## 📊 Données de Test

### Prestataire Exemple
```json
{
  "name": "Service Auto Plus",
  "email": "auto@test.com",
  "role": "technician",
  "serviceCategory": "Location Véhicules",
  "providerDetails": {
    "coordinates": {
      "lat": 16.0244,
      "lng": -16.5015
    }
  }
}
```

### Véhicule Exemple
```json
{
  "vehicleName": "Toyota RAV4",
  "vehicleType": "large",
  "brand": "Toyota",
  "model": "RAV4",
  "year": 2023,
  "color": "Noir",
  "licensePlate": "SL-789-DEF",
  "pricePerDay": 45000,
  "pricePerHour": 5500,
  "capacity": {
    "passengers": 5,
    "luggage": "Coffre large"
  },
  "features": ["Climatisation", "Sièges en cuir", "GPS", "Caméra recul"],
  "insuranceIncluded": true
}
```

---

## 🎯 Cas d'Usage

### 1. Touriste à Saint-Louis
- Cherche voiture pour 3 jours
- Filter par grand format
- Vérife assurance incluse
- Reserve RAV4

### 2. Prestataire Local
- Add 2 motos pour location
- Upload 5 photos d'avant/après
- Accepte réservations

### 3. Localité
- Browse tous véhicules
- Filter par type
- Voit galerie prestataire
- Contacte directement

---

## 📝 Notes

- Les réservations sont pour le moment **UI only** (implémentation paiement future)
- Les photos sont stockées en **local filesystem** (suggérer cloud storage future)
- Distance calculée avec **formule haversine** (7MB de rayon d'action)
- Interface en **français** avec emojis
