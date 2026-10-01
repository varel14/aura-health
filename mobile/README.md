# AuraHealth — Application mobile (Expo + React Native + TypeScript)

Application de télémédecine (patient, médecin, pharmacie, livreur), **100 % en français**,
connectée au **backend réel** (`../backend` — Node.js / Express / PostgreSQL).
Le mock local (`src/data`) n'est plus qu'un fallback d'affichage initial : toutes les
données et toutes les actions passent par l'API.

## Démarrage

```bash
# 1) Le backend (une seule fois : créer la base + jeu de données)
cd ../backend
npm install && npm run db:reset
npm start                      # http://localhost:4000

# 2) L'application
cd ../mobile
npm install
npx expo start                 # scannez le QR (Expo Go) ou `a` / `i` / `w`
```

- **Android émulateur** : l'app joint automatiquement `http://10.0.2.2:4000`.
- **Web / iOS simulateur** : `http://localhost:4000`.
- **Appareil physique** : `EXPO_PUBLIC_API_URL=http://<ip-locale>:4000 npx expo start`.

Vérifications : `npm run typecheck` (mobile) · `npm run smoke` (backend) ·
`npx tsx scripts/contract.ts` (contrat mobile ↔ API, backend démarré requis).

## Comptes de démonstration (PIN `1234`)

L'écran de connexion propose une connexion en un clic pour chaque espace :

- **Patient** — Stéphane Nkodo (`+237 691 45 78 20`)
- **Médecin** — Dr Vanessa Mbarga
- **Pharmacie** — Pharmacie du Centre
- **Livreur** — Alain Manga

La session (token + rôle) est persistée : quitter l'application ne déconnecte pas.

## Parcours vérifiés de bout en bout

1. **Patient** : connexion → accueil (données serveur) → médecin → réservation
   (type, créneaux réels, motif, récap) → création du RDV → **paiement MoMo réel
   (simulé passerelle)** → confirmation payée → RDV dans « Mes rendez-vous ».
2. **Paiement plus tard** : RDV créé non payé → paiement depuis le détail du RDV.
3. **Messagerie** : RDV chat → fil de discussion créé → échanges patient/médecin → clôture.
4. **Compte-rendu IA** : consultation clôturée par le médecin → génération du résumé
   (observations, recommandations, ordonnance liée, document ajouté au dossier).
5. **Ordonnances** : création côté médecin, import côté patient (document + notification).
6. **Pharmacie** : panier (max 10/article) → garde Rx (ordonnance valide exigée) →
   checkout (frais de livraison 1 000 FCFA) → paiement → suivi du statut jusqu'à « livrée ».
7. **Espace pharmacien / livreur** : validation des commandes payées, préparation,
   remise contre le **code à 6 chiffres** du client (jamais lisible par le personnel).
8. **Symptômes** : triage (orientation, priorité) calculé côté serveur, envoi au médecin.
9. **Professionnel** : formulaire public d'adhésion hôpital/pharmacie.

## Architecture

```
app/                      # Routes Expo Router
  (auth)/                 # Connexion, inscription, vérification, profil initial, pro
  (patient)/              # Onglets patient : Accueil, RDV, Messages, Dossier, Profil
  (doctor)/               # Onglets médecin : Accueil, Agenda, Patients, Profil
  (pharmacy)/ (delivery)/ # Espaces professionnels (validation, préparation, livraison)
  doctors|hospitals|pharmacies|medications/
  appointment/            # book (wizard 5 étapes) + [id] (détail/annulation/reprog.)
  consultation/ prescriptions/ payments/ order/ orders/ notifications/ symptoms/
src/
  components/ui/          # Design system (Button, Input, Card, Badge, Screen…)
  components/domain/      # DoctorCard, AppointmentCard, PaymentSheet, ChatBubble…
  constants/theme.ts      # Couleurs (primaire violet), espacements, typographie
  context/                # AuthContext (session réelle), AppDataContext (hydratation
                          #   depuis l'API + mutations serveur)
  services/               # api.ts (client HTTP + token persisté), index.ts (catalogue),
                          #   orders.ts (workflow commandes), doctorDirectory.ts
  data/                   # Fallbacks d'affichage initial (avant hydratation)
  models/types.ts         # Contrat de domaines = formes renvoyées par l'API
scripts/contract.ts       # Vérifie que l'API renvoie bien les formes attendues
```

## Notes techniques

- **Session** : le token est stocké dans AsyncStorage et restauré au démarrage
  (`GET /api/auth/me` revalide le rôle). Une session invalide est supprimée silencieusement.
- **Paiement avant/après** : la réservation crée le RDV (non payé) puis la feuille de
  paiement confirme le RDV existant par son id — conforme à `POST /api/payments`.
- **Zones horaires** : le backend renvoie les dates en `yyyy-mm-dd` purs (aucun décalage UTC).
