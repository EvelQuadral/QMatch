# QMatch — Congrès HLM 2026

App de swipe type Tinder qui met en relation les besoins des bailleurs HLM avec les expertises Quadral.
Le visiteur scanne un QR code sur le stand, swipe les cartes, et repart avec son carnet d'adresses en vCard.

> 📌 **Nouveau sur le projet ou reprise après une pause ?**
> Lis d'abord [`JOURNAL.md`](JOURNAL.md) : il contient l'état réel du projet, l'historique des
> itérations et la procédure de remise en route sur une machine neuve.

---

## 📋 Stack

| Brique | Choix |
|---|---|
| Frontend | React 18 + Vite 5 + React Router 6 |
| Styles | CSS vanilla + design tokens (`src/styles/tokens.css`) |
| Icônes | lucide-react |
| Hébergement | Netlify |
| Base / Realtime | Supabase (Postgres) |
| Auth admin | mot de passe stocké en base (`app_secrets`) |
| Auth directeurs | token unique dans l'URL (`/me/:token`) |

Pas de serveur custom : le navigateur parle directement à Supabase via le SDK, en s'appuyant
sur des fonctions `SECURITY DEFINER` (aucun accès direct aux tables).

---

## 🗂️ Contenu de l'app

**15 cartes** dans le deck, mélangées à chaque session (Fisher-Yates) :

- **13 profils directeurs** — table `profiles` dans Supabase, photos WebP dans `/public/`
- **2 pubs** — 100 % statiques dans `/public/pubs/pubs.json` (aucune ligne en base)

> Le nombre de directeurs augmentera en fin de projet (fichier Excel + photos à intégrer).
> Les itérations en cours se font sur les 13 profils actuels.

---

## 🚀 Installation sur une machine neuve

### 1. Prérequis

**Node.js 20+** est indispensable (`node -v` pour vérifier).
S'il est absent : [nodejs.org](https://nodejs.org) → installer la version LTS.

### 2. Récupérer le code

```bash
git clone https://github.com/MKT-EvelQuadral/QMatch.git
cd QMatch
npm install
```

### 3. Variables d'environnement

Créer un fichier `.env.local` à la racine (jamais commité) :

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Ces valeurs se trouvent dans **Supabase → Settings → API**.
Sur Netlify, les mêmes variables sont à déclarer dans **Site settings → Environment variables**.

### 4. Lancer

```bash
npm run dev
```

---

## 🗄️ Base de données — ordre d'exécution des migrations

⚠️ **L'ordre compte.** Sur une base vierge, ouvrir le **SQL Editor** de Supabase et exécuter
les fichiers de `supabase/` dans cet ordre exact :

| # | Fichier | Rôle | Re-exécutable ? |
|---|---|---|---|
| 1 | `setup.sql` | Schéma complet + seed des 16 directeurs + mot de passe admin | ⚠️ **Efface tout** |
| 2 | `02_feedback.sql` | Table `feedback` + RPC de collecte et de lecture | ⚠️ **Efface les avis** |
| 3 | `03_cleanup_webp.sql` | Retire 3 profils, bascule les photos en `/…webp` statiques | ✅ Idempotent |
| 4 | `04_dashboards_extras.sql` | Leaderboard public, récap directeur, KPIs admin | ✅ Idempotent |
| 5 | `05_pub_tracking.sql` | Compteurs de pubs (`pub_counters`) + RPC associées | ✅ Idempotent |

Après le 1 et le 2, il faut ré-exécuter le 3 pour retomber sur les 13 profils actuels.

**Mot de passe admin par défaut : `quadral2026`** — à changer avant le congrès :

```sql
UPDATE app_secrets SET value = 'nouveau_mot_de_passe' WHERE key = 'admin_password';
```

---

## 🔐 Routes & accès

| URL | Pour qui | Auth |
|---|---|---|
| `/` | Public (visiteurs du congrès) | — |
| `/me/:token` | Chaque directeur | Token unique dans l'URL |
| `/admin` | Organisateur | Mot de passe |

Les liens `/me/:token` se copient depuis `/admin` (bouton copier sur chaque ligne du leaderboard).

---

## 📊 Tracking

Deux compteurs distincts, car profils et pubs n'ont pas la même nature :

| | Profils | Pubs |
|---|---|---|
| Source | table `profiles` (id numérique) | `pubs.json` (clé texte) |
| Compteur | `stats_counters` | `pub_counters` |
| RPC | `increment_stat` | `increment_pub_stat` |
| Actions | like · pass · details · vcard | like · pass · pub_click |

Chaque action fait **deux écritures atomiques** : un incrément de compteur, et une ligne
horodatée dans `events` (log brut, conservé pour analyse post-congrès).

La ligne de `pub_counters` se crée toute seule au premier événement : **ajouter une pub dans
`pubs.json` ne demande aucune intervention en base.**

---

## 🛠️ Commandes

```bash
npm run dev      # serveur de dev sur localhost:5173
npm run build    # bundle de production dans dist/
npm run preview  # prévisualisation du bundle
```

---

## 📁 Structure

```
src/
├── styles/
│   ├── tokens.css        # couleurs, typos, radius, timings — source unique
│   └── reset.css
├── lib/
│   ├── supabase.js       # client + helper photoUrl()
│   └── vcard.js          # génération du .vcf côté client
├── data/
│   └── useDirectors.js   # fetch profils + merge pubs.json + shuffle
├── hooks/
│   ├── useSwipeGesture.js  # drag/touch de la carte
│   ├── useTracking.js      # aiguillage profil ↔ pub vers la bonne RPC
│   ├── useScrollLock.js
│   ├── useSession.js       # UUID de session anonyme
│   └── useAdminAuth.js
├── screens/              # les 3 états du parcours visiteur
│   ├── Intro.jsx
│   ├── Swipe.jsx
│   └── Matches.jsx
├── components/           # 1 composant = 1 .jsx + 1 .css
│   ├── SwipeCard.jsx       ProfileOverlay.jsx    BottomSheet.jsx
│   ├── MatchRow.jsx        ActionButtons.jsx     ProgressBar.jsx
│   ├── FeedbackBlock.jsx   FeedbackPanel.jsx     PubStatsPanel.jsx
│   ├── LeaderboardRow.jsx  DirectorRankCard.jsx  StatCounter.jsx
│   └── Logo.jsx  Tag.jsx  Toast.jsx  LiveDot.jsx  CounterPill.jsx  ConfirmModal.jsx
├── pages/
│   ├── Home.jsx          # /         — orchestre intro → swipe → matches
│   ├── Admin.jsx         # /admin    — dashboard organisateur
│   └── Me.jsx            # /me/:tok  — dashboard directeur
└── App.jsx               # routeur
```

`FeedbackBlock` collecte les avis côté visiteur ; `FeedbackPanel` les restitue côté admin.

---

## ⚙️ Gestion quotidienne

[`supabase/STUDIO-GUIDE.md`](supabase/STUDIO-GUIDE.md) couvre les manipulations sans toucher au code :
ajouter / retirer / désactiver un profil, modifier les pubs, changer le mot de passe admin,
régénérer un token directeur.

---

## 📦 Exports & reset

Depuis `/admin` :

- **Export Stats** — compteurs agrégés par profil
- **Export Events** — log brut horodaté (profils **et** pubs)
- **Export Feedback** — avis avec note et commentaire
- **Reset** — snapshot CSV téléchargé automatiquement avant la remise à zéro, confirmation
  par saisie de `RESET`. L'option « reset complet » efface aussi `events` : à ne faire
  qu'après l'export final.
