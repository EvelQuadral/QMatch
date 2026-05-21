# QMatch — Congrès HLM 2026

App de swipe type Tinder qui matche les besoins des bailleurs HLM avec les services Quadral.

## 📋 Stack

- **Frontend** : React 18 + Vite 5 + React Router
- **Hosting** : Netlify (gratuit)
- **Base de données / Storage / Realtime** : Supabase (gratuit)
- **Auth admin** : mot de passe stocké en base
- **Auth directeurs** : token unique dans l'URL (`/me/:token`)

## 🚀 Première installation

### 1. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com) (région **Frankfurt** recommandée)
2. Ouvrir le **SQL Editor**, coller le contenu de [`supabase/setup.sql`](supabase/setup.sql) et cliquer **Run**
3. Uploader les photos (16 directeurs + 2 pubs + 2 logos SVG) dans le bucket `photos` via **Storage → photos → Upload file**
4. Récupérer les credentials dans **Settings → API** :
   - `Project URL`
   - `anon public` key

### 2. Variables d'environnement

En local, créer `.env.local` à la racine :

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Sur Netlify : **Site settings → Environment variables**, ajouter les deux variables (mêmes noms, mêmes valeurs).

### 3. Déploiement Netlify

1. Push ce dossier sur un repo GitHub
2. Sur Netlify : **Add new site → Import from GitHub**, sélectionner le repo
3. Build settings (auto-détectés grâce à `netlify.toml`) :
   - Build command : `npm run build`
   - Publish directory : `dist`
4. Ajouter les 2 variables d'env (étape 2)
5. **Deploy** — le site est en ligne

## 🛠️ Développement local

```bash
npm install
npm run dev      # serveur dev sur localhost:5173
npm run build    # bundle production dans dist/
npm run preview  # preview du bundle local
```

## 🗂️ Structure

```
src/
├── lib/
│   ├── supabase.js       # client Supabase + helper photoUrl()
│   └── vcard.js          # génération vCard côté client
├── data/
│   └── useDirectors.js   # hook fetch profils + shuffle
├── hooks/
│   ├── useSwipe.js       # logique drag/touch
│   ├── useTracking.js    # envoi des actions à Supabase
│   ├── useScrollLock.js  # blocage scroll body en mode swipe
│   └── useSession.js     # UUID session anonyme
├── components/
│   ├── Header.jsx        # logo + compteur ❤️
│   ├── IntroScreen.jsx   # écran d'accueil
│   ├── SwipeCard.jsx     # carte + drag + détails + vCard
│   ├── ContactList.jsx   # liste des matches
│   ├── ProgressBar.jsx   # barre de progression
│   └── ExplanationOverlay.jsx
├── pages/
│   ├── Home.jsx          # /         — app de swipe
│   ├── Admin.jsx         # /admin    — dashboard superadmin
│   └── Me.jsx            # /me/:tok  — dashboard directeur
└── App.jsx               # routeur
```

## 🔐 Routes & accès

| URL | Pour qui | Auth |
|---|---|---|
| `/` | Public (visiteurs du congrès) | — |
| `/me/:token` | Chaque directeur | Token unique dans l'URL |
| `/admin` | Toi (organisateur) | Mot de passe (défaut : `quadral2026`) |

## 📊 Tracking & stats

Chaque action (like, pass, details, vcard, pub_click) déclenche :

1. Un **incrément atomique** dans `stats_counters` (compteurs live)
2. Une **ligne dans `events`** (log brut horodaté avec `session_id`)

→ Aucune race condition possible (atomicité Postgres).
→ La table `events` n'est jamais effacée par le bouton Reset standard. Backup permanent pour analyse post-congrès.

## ⚙️ Gestion quotidienne (Supabase Studio)

Voir [`supabase/STUDIO-GUIDE.md`](supabase/STUDIO-GUIDE.md) pour les manipulations courantes :

- Ajouter / supprimer / désactiver un profil
- Modifier les pubs
- Changer le mot de passe admin
- Régénérer un token directeur

## 🔄 Reset des stats

Depuis `/admin` :

- Bouton **Reset** → modal de confirmation
- Tape `RESET` pour valider
- Un CSV snapshot est téléchargé automatiquement avant le zeroing
- Option "Reset complet" pour effacer aussi `events` (à n'utiliser qu'après export final)

## 📦 Export des données

Depuis `/admin` :
- **Export stats CSV** : compteurs agrégés par profil
- **Export events CSV** : log brut de toutes les actions (timestamp + profil + action + session)
