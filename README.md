# RSC — Réseau Social Communautaire

Application web de gestion communautaire pour la diaspora africaine au Canada.
Frontend React déployé sur **Railway** · Backend Spring Boot · Base de données PostgreSQL.

---

## Présentation du projet

RSC est une plateforme numérique centralisée qui permet aux membres de la communauté diaspora africaine (résidents permanents, citoyens, étudiants…) de :

- Gérer leurs cotisations et abonnements annuels
- Déclarer et suivre un décès, avec publication d'un avis officiel partageable
- Accéder à un suivi de dossier de rapatriement
- Faire des dons et gérer les aides financières
- Parrainer de nouveaux membres
- Communiquer via messagerie interne et notifications
- Consulter les actualités et les événements de la communauté

Les administrateurs disposent d'un espace dédié avec gestion des utilisateurs, validation des déclarations, audit complet des actions et paramétrage du système.

---

## Stack technique

| Couche      | Technologie                                       |
| ----------- | ------------------------------------------------- |
| Frontend    | React 19 · React Router 6 · React Icons           |
| Styles      | CSS natif (variables, grid, flexbox, responsive)  |
| Paiements   | Stripe (CardElement, PaymentIntent)               |
| Auth        | JWT + Refresh Token + MFA (code OTP email)        |
| HTTP        | Axios (intercepteurs JWT, refresh automatique)    |
| Temps réel  | Polling configurable (useRealtimeResource)        |
| Déploiement | Railway (Docker + Nginx) · `npm ci` strict        |

---

## Architecture

```text
src/
├── App.js                    # Routes principales (public + privé + admin)
├── App.css                   # Système de design complet (2000+ lignes)
├── context/
│   └── AuthContext.jsx       # Session, rôles, balance, idle timeout
├── components/
│   ├── Navbar.jsx
│   ├── Footer.jsx            # Liens sociaux dynamiques depuis API
│   ├── PrivateRoute.jsx
│   └── AdminRoute.jsx        # Garde de route par rôle
├── hooks/
│   ├── useRealtimeResource.js
│   └── useFinancesBoard.js
├── config/
│   ├── realtime.js           # Intervalles de polling par ressource
│   └── stripe.js
├── pages/                    # 13 pages publiques
│   ├── Home / About / Services / Contact / SavoirPlus
│   ├── Login / Register / AdminLogin
│   ├── ForgotPassword / ResetPassword / Validation
│   ├── ActualitesPublic
│   └── AvisPublic            # Avis de décès via lien de partage (public)
├── dashboard/                # 21 écrans dashboard
│   ├── DashboardLayout.jsx   # Sidebar dynamique par rôle
│   ├── Statistics.jsx        # KPIs + abonnement annuel
│   ├── Finances.jsx          # Paiements Stripe
│   ├── Cotisations.jsx       # Cotisations + abonnement
│   ├── Donation.jsx          # Dons avec frais dynamiques
│   ├── Parrainage.jsx        # Lien de parrainage + filleuls
│   ├── Profile.jsx           # Profil utilisateur
│   ├── Parametres.jsx        # Préférences (statuts dynamiques)
│   ├── AyantsDroit.jsx       # Gestion des bénéficiaires
│   ├── Addresses.jsx
│   ├── Messagerie.jsx
│   ├── Notifications.jsx
│   ├── SignalerEvenement.jsx # Déclaration de décès (utilisateur)
│   ├── Suivi.jsx             # Suivi dossier rapatriement
│   ├── Actualites.jsx        # Gestion articles (admin)
│   ├── DeclarationsAdmin.jsx # Déclarations + documents + avis de décès (admin)
│   ├── AidesFinancieres.jsx  # Aides financières + workflow (admin)
│   ├── AdminUsers.jsx        # Gestion membres (admin)
│   ├── Administrateurs.jsx   # Gestion admins (super admin)
│   ├── ParametresSysteme.jsx # Configuration système (super admin)
│   └── AuditLogs.jsx         # Journal d'audit (super admin)
└── services/                 # 21 services API (Axios)
    ├── api.js                # Instance Axios + intercepteurs
    ├── auth.js               # Login, register, MFA, refresh, reset
    ├── users.js / administrateurs.js
    ├── declarations.js / declarationDocuments.js
    ├── avisDecès.js          # Avis + PDF + publication + partage public
    ├── dossiers.js           # Rapatriement
    ├── paiements.js / dons.js / cotisations.js
    ├── aidesFinancieres.js
    ├── parametresSysteme.js / auditLogs.js
    ├── messages.js / notifications.js
    ├── articles.js / parrainages.js / ayantsDroit.js / addresses.js
    └── public.js             # Config publique, réseaux sociaux, types
```

---

## Rôles et accès

| Rôle              | Accès                                                                   |
| ----------------- | ----------------------------------------------------------------------- |
| Utilisateur       | Dashboard personnel, cotisations, dons, parrainage, signalement, suivi  |
| ADMIN\_CONTENU    | Actualités, signalement, suivi                                          |
| ADMIN\_FINANCIER  | Finances, cotisations, aides financières                                |
| ADMIN\_VALIDATEUR | Déclarations de décès                                                   |
| ADMIN\_SUPPORT    | Gestion utilisateurs, suivi                                             |
| SUPER\_ADMIN      | Accès total + paramètres système + audit logs                           |

---

## Fonctionnalités clés

### Authentification

- Connexion email/mot de passe avec détection MFA automatique
- Modal MFA à 6 chiffres (OTP email) avec renvoi de code
- Inscription avec vérification email (code OTP)
- Mot de passe oublié / réinitialisation par lien
- Refresh token automatique (transparent pour l'utilisateur)
- Déconnexion automatique après 15 minutes d'inactivité

### Déclarations de décès

- Formulaire de signalement côté utilisateur
- Validation / rejet admin avec motif
- Gestion des documents joints (CRUD)
- Avis de décès : création, modification, publication
- Lien de partage public (token) avec page dédiée `/avis/:token`
- Téléchargement PDF (admin et public)

### Cotisations & Finances

- Abonnement annuel avec barre de progression et jours restants
- Types de cotisation chargés depuis l'API
- Intégration Stripe (CardElement + PaymentIntent)
- Historique des paiements et statistiques

### Administration

- Journal d'audit complet avec détails (ancienne/nouvelle valeur, IP, user-agent)
- Statistiques par type d'événement et par période
- Paramètres système avec édition inline des valeurs
- Aides financières : workflow approuver / refuser / marquer versée

---

## Installation et lancement

```bash
# Installer les dépendances
npm ci

# Lancer en développement
npm start

# Build de production
npm run build
```

### Variables d'environnement

```env
REACT_APP_API_BASE_URL=/api/v1        # URL base API (production)
REACT_APP_API_PORT=8080               # Port API (développement local)
REACT_APP_STRIPE_PUBLIC_KEY=pk_...    # Clé publique Stripe
```

---

## Déploiement (Railway)

Le projet utilise un `Dockerfile` multi-stage :

1. **Build** — `node:18-alpine` + `npm ci` + `react-scripts build`
2. **Serve** — `nginx:alpine` avec reverse proxy vers le backend

> Le fichier `package-lock.json` doit toujours être synchronisé avec `package.json`.
> Ne jamais utiliser `--legacy-peer-deps` sans régénérer le lock file.

---

## Responsive

Trois breakpoints CSS :

| Breakpoint | Comportement                                                              |
| ---------- | ------------------------------------------------------------------------- |
| ≤ 1024px   | Sidebar masquable, stats 2 colonnes                                       |
| ≤ 768px    | Navbar hamburger, auth 1 colonne, formulaires empilés, tables scrollables |
| ≤ 480px    | Contenu ultra-compact, modales pleine largeur                             |

---

## Scripts disponibles

```bash
npm start       # Développement (port 3000)
npm run build   # Build production
npm test        # Tests unitaires
```

---

*Développé pour la communauté RSC — Diaspora africaine au Canada.*
