# Passe 3 - Matrice de validation (2026-04-26)

Legend:
- `OK`: valide dans cet environnement
- `KO`: defect reproduit
- `BLOQUE`: pre-requis manquant (compte, token, donnees, etc.)

## Verifications techniques executees

| Scope | Check | Statut | Evidence |
|---|---|---|---|
| Frontend | `npm.cmd --prefix frontend run build` | OK | Build Vite passe (bundle genere) |
| Backend routes | `node --check backend/routes/serviceRoutes.js` | OK | Syntaxe valide |
| Backend routes | `node --check backend/routes/paymentRoutes.js` | OK | Syntaxe valide |
| Backend routes | `node --check backend/routes/rideRoutes.js` | OK | Syntaxe valide |
| Backend runtime | `node backend/server.js` | OK | MongoDB connecte, serveur port 5000 |

## Matrice page par page (parcours critiques)

| Page / Route | Controle | Statut | Preuve |
|---|---|---|---|
| `RideDetails` `/ride/:id` | Bouton suivi redirige vers route valide | OK | `frontend/src/pages/RideDetails.jsx:164` |
| `RideDetails` `/ride/:id` | Gestion erreur sans casser la vue lorsque la course existe | OK | Alerte inline + rendu page (`RideDetails.jsx`) |
| `RideDetails` `/ride/:id` | Erreur au chargement initial garde la page | KO | Ecran erreur total si `!ride` (`frontend/src/pages/RideDetails.jsx:90`) |
| API `GET /services/:id` | Serialization coherente service details | OK | `backend/routes/serviceRoutes.js:1223` |
| API `POST /payments/service/:id/pay` | Controle client sur `clientId` | OK | `backend/routes/paymentRoutes.js:189` |
| Profile `/profile` (prestataire) | Section "Apercu de mes services" | OK | `frontend/src/pages/Profile.jsx:201` |
| Profile `/profile` (prestataire) | Ouverture upload directe portfolio | OK | `frontend/src/pages/Profile.jsx:37`, `:225` |
| Technician dashboard `/technician` | Pre-remplissage commission montant/reference | OK | `frontend/src/pages/TechnicianDashboard.jsx:203`, `:525`, `:909` |
| Vehicle management | Nettoyage texte action suppression | OK | `frontend/src/components/VehicleManagement.jsx:429` (pas de `DELETE Supprimer`) |

## Matrice scenario (E2E)

| Scenario | Statut | Detail |
|---|---|---|
| Inscription client/prestataire | BLOQUE | Aucun script E2E d'inscription present dans ce repo |
| Service: creation -> devis -> validation -> start(code) -> commission -> cloture | BLOQUE | Routes presentes + syntaxe OK, mais pas de jeu de test automatise execute bout-en-bout |
| Course: creation -> suivi -> chat -> paiement | KO | `test-ride-flow.js` echoue a l'etape login client (`400 Identifiants invalides`) |
| Endpoints ride/service proteges | OK | `test-endpoints.js` repond `401 Token invalide`, donc routes exposees et middleware actifs |

## Blockers explicites observes

1. Les credentials utilises par les scripts de test ne correspondent pas a un compte valide dans la base courante.
2. `test-ride-flow.js` requiert un client et un chauffeur existants, et le chauffeur doit etre en statut `verified`.
3. `test-endpoints.js` requiert un vrai token (`TEST_API_TOKEN`) pour valider le comportement metier au-dela du `401`.

## Ajustements tests appliques pendant la passe

- `test-endpoints.js`: suppression dependance `node-fetch`, usage `globalThis.fetch`, parametrage `TEST_API_BASE_URL` + `TEST_API_TOKEN`.
- `test-ride-flow.js`: credentials parametrables (`TEST_CLIENT_EMAIL`, `TEST_CLIENT_PASSWORD`, `TEST_DRIVER_EMAIL`, `TEST_DRIVER_PASSWORD`) + messages de pre-requis plus explicites.
