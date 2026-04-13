# ✅ CHECKLIST IMPLÉMENTATION - Locations & Galeries

## 🎯 Avant de Démarrer

- [ ] Node.js v14+ installé
- [ ] MongoDB en cours d'exécution
- [ ] Variables d'env backend configurées (.env)
- [ ] Variables d'env frontend configurées (.env)

---

## 📦 Backend - Vérifications

### Models
- [ ] `backend/models/VehicleRental.js` créé
- [ ] `backend/models/ProviderGallery.js` créé
- [ ] Imports dans server.js

### Routes
- [ ] `backend/routes/rentalRoutes.js` créé
- [ ] `backend/routes/galleryRoutes.js` créé
- [ ] Routes enregistrées dans server.js:
  ```js
  app.use("/api/rentals", rentalRoutes)
  app.use("/api/gallery", galleryRoutes)
  ```

### Utils
- [ ] `backend/utils/distance.js` créé
- [ ] Haversine math correct

### Dossiers
- [ ] `backend/uploads/gallery/` folder exists (créé auto par multer)

### Tests Backend
```bash
# Démarrer
cd backend && npm start

# GET locations
curl http://localhost:5000/api/rentals -H "Authorization: Bearer YOUR_TOKEN"

# Health check
curl http://localhost:5000/
```

---

## 🎨 Frontend - Vérifications

### Composants
- [ ] `src/components/VehicleCard.jsx` créé
- [ ] `src/components/GalleryViewer.jsx` créé
- [ ] `src/components/GalleryUploader.jsx` créé
- [ ] `src/components/ProviderPortfolio.jsx` créé
- [ ] `src/components/VehicleManagement.jsx` créé

### Pages
- [ ] `src/pages/Rental.jsx` créé
- [ ] `src/pages/RentalDetail.jsx` créé

### Configuration
- [ ] `src/App.js` imports ajoutés:
  ```js
  import Rental from "./pages/Rental"
  import RentalDetail from "./pages/RentalDetail"
  ```

- [ ] `src/App.js` routes ajoutées:
  ```js
  <Route path="/rental" element={<ProtectedRoute><Rental /></ProtectedRoute>} />
  <Route path="/rental/:id" element={<ProtectedRoute><RentalDetail /></ProtectedRoute>} />
  ```

- [ ] `src/components/BottomNav.jsx` updated:
  ```js
  { to: "/rental", label: "Locations", iconSymbol: "🚗" }
  ```

- [ ] `src/pages/Home.jsx` feature card ajoutée:
  ```js
  {
    key: "rental",
    title: "Location de Vehicules",
    action: "/rental"
  }
  ```

### Tests Frontend
```bash
# Démarrer
cd frontend && npm start

# Tester:
- Navigate to http://localhost:3000/rental
- Voir liste locations
- Cliquer sur une location
- Voir détails + galerie (si prestataire a photos)
```

---

## 🧪 Workflow Complet - Test

### 1️⃣ Préparation
```
✓ Backend running on :5000
✓ Frontend running on :3000
✓ MongoDB connected
✓ JWT token disponible
```

### 2️⃣ Tester comme Prestataire

#### Ajouter Véhicule
```
POST /api/rentals
Header: Authorization: Bearer YOUR_TECHNICIAN_TOKEN
{
  "vehicleName": "Honda CB500",
  "vehicleType": "small",
  "brand": "Honda",
  "model": "CB500",
  "year": 2023,
  "color": "Red",
  "pricePerDay": 15000,
  "capacity": {"passengers": 1, "luggage": "Small"},
  "features": ["Economique", "Leger"],
  "insuranceIncluded": true
}

Response: 201
✓ Rental créé
```

#### Upload Photo Galerie
```
POST /api/gallery/{USER_ID}/upload
Header: Authorization: Bearer YOUR_TECHNICIAN_TOKEN
FormData:
  image: <fichier.jpg>
  title: "Mon véhicule"
  category: "work"
  tags: "location,moto"

Response: 201
✓ Photo uploadée
```

### 3️⃣ Tester comme Client

#### Voir Locations
```
Frontend: Navigate to /rental
- Voir locations listées
- Filtrer par type
- Rechercher par marque
- Voir localisation
```

#### Voir Détail
```
Frontend: Click on location
- Voir photos véhicule
- Voir galerie prestataire
- Voir infos prestataire
- Voir tarifs
- Formulaire réservation
```

---

## 🐛 Debugging Checklist

### "Location not found"
- [ ] ID corrects dans MongoDB
- [ ] Token valide
- [ ] Route enregistrée dans server.js
- [ ] Model importé dans route

### "Photo not uploading"
- [ ] Folder `backend/uploads/gallery/` exists
- [ ] Permissions folder OK
- [ ] Fichier < 10MB
- [ ] Format: JPG/PNG/WebP/GIF
- [ ] multer config correct

### "404 on /rental"
- [ ] Route importée dans App.js
- [ ] Route registered in AppRoutes
- [ ] ProtectedRoute wrapping
- [ ] Component correct path

### "Gallery not showing"
- [ ] GET /api/gallery/provider/{id} works
- [ ] Prestataire ID correct
- [ ] Photos uploadées pour ce prestataire
- [ ] GalleryViewer component receives items

### "Multer error"
- [ ] `npm install multer` in backend
- [ ] Storage config correct
- [ ] Destination folder créé

---

## 📱 Testing Devices

### Mobile (iPhone/Android)
- [ ] Layout responsive
- [ ] Touches tapables
- [ ] Images load
- [ ] Scrolling smooth

### Tablet
- [ ] Grille 2 colonnes affichée
- [ ] Images scaled
- [ ] UI pas cramped

### Desktop
- [ ] Grille 3 colonnes affichée
- [ ] Full featured view
- [ ] Hover effects work

---

## 🔐 Security Checklist

- [ ] Auth required on routes
- [ ] Ownership verified (provider == user)
- [ ] MIME types validated
- [ ] File size limited (10MB)
- [ ] Malicious files rejected
- [ ] XSS protected (React escaping)
- [ ] CSRF token not needed (JWT auth)

---

## 📊 Database Checklist

### Collections
- [ ] `vehiclerentals` collection created
- [ ] `providergalleries` collection created
- [ ] Indexes created if needed

### Sample Data
```js
// VehicleRental
{
  _id: ObjectId,
  provider: ObjectId,
  vehicleName: "...",
  vehicleType: "small",
  // ... autres champs
}

// ProviderGallery
{
  _id: ObjectId,
  provider: ObjectId,
  galleryItems: [
    {
      _id: ObjectId,
      imageUrl: "/uploads/gallery/...",
      // ... autres champs
    }
  ]
}
```

---

## 📖 Documentation Checklist

- [ ] `FEATURES_RENTALS_GALLERY.md` lié
- [ ] `TESTING_GUIDE.md` lié
- [ ] `IMPLEMENTATION_SUMMARY.md` lié
- [ ] Code comments clear
- [ ] README updated (optional)

---

## 🚀 Pre-Launch Checklist

### Backend
- [ ] All routes tested via cURL
- [ ] Error handling working
- [ ] Database connections stable
- [ ] Logs clear

### Frontend
- [ ] All pages render
- [ ] All components load
- [ ] Navigation works
- [ ] No console errors
- [ ] No console warnings (critical)

### Integration
- [ ] Frontend ↔ Backend communication OK
- [ ] Auth flows working
- [ ] Upload flows working
- [ ] Data persists

### Performance
- [ ] Images load fast
- [ ] Pages render < 2s
- [ ] No console errors
- [ ] Memory usage acceptable

---

## 📝 Post-Launch Monitoring

- [ ] Monitor error logs
- [ ] Check upload disk space
- [ ] Verify backups running
- [ ] Performance metrics
- [ ] User feedback

---

## ✉️ Final Verification

- [ ] All files created ✅
- [ ] All imports correct ✅
- [ ] All routes registered ✅
- [ ] Security verified ✅
- [ ] Tests passing ✅
- [ ] Documentation complete ✅

**Status: 🟢 READY TO LAUNCH** 🚀

