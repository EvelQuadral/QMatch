# Brief design — QMatch v2

> Document à transmettre à un designer ou à un assistant IA (claude.ai) pour la refonte visuelle.
> L'objectif n'est PAS de refaire le produit, mais d'habiller une mécanique technique déjà finalisée.

---

## 1. Contexte projet

**QMatch** est une mini-app web mobile-first qui transpose l'UX de Tinder à un usage B2B événementiel pour le groupe **QUADRAL** (groupe immobilier français : transactions HLM, BRS, gestion locative, syndic, expertise, ingénierie, promotion).

**Usage cible :** stand Quadral au **Congrès HLM 2026** (3 jours, septembre/octobre, environ 10 000 visiteurs au total sur le salon). Un visiteur scanne un QR code sur le stand, ouvre l'app sur son téléphone, et "swipe" parmi 16 directeurs Quadral pour identifier ceux dont l'expertise matche ses besoins. À la fin, il a la liste de ses contacts pertinents avec téléchargement vCard.

**Cible audience :** professionnels du logement social (bailleurs sociaux, institutionnels). 35-55 ans en majorité. Phone in hand, distraits, dans un environnement bruyant. Doivent comprendre l'interface en 5 secondes max.

**Une beta techniquement fonctionnelle est déjà en ligne** (https://qmatch.netlify.app). Le présent brief sert à conceptualiser un **redesign visuel v2** avant les arts finals.

---

## 2. Stack technique en place (NON modifiable)

Le designer doit savoir que les choix suivants sont **figés** :

- **Frontend :** React 18 + Vite 5 + React Router v6
- **Hosting :** Netlify (free tier)
- **Base de données + Storage + Realtime :** Supabase (free tier, Postgres)
- **Pas de serveur custom** (le frontend dialogue directement avec Supabase via SDK)
- **Données dynamiques** : profils, photos, stats — tout vient de Supabase au chargement, pas hardcodé
- **CSS classique** (Vanilla CSS + media queries) — pas de Tailwind installé, mais on PEUT en ajouter si besoin

→ **Implication design :** tout ce qui s'affiche peut être stylé librement (HTML/CSS), mais la **structure de données** est figée (un profil a tels champs, on ne peut pas en inventer en design).

---

## 3. Architecture de données — ce que le designer doit savoir

### Un "profil" en base contient :
- `name` (string) — ex: "Clément HENNEQUIN"
- `title` (string) — ex: "Directeur du pôle services aux Institutionnels - Quadral"
- `description` (string libre) — ~150-300 caractères
- `email`, `phone` (uniquement pour la vcard)
- `tags` (array de strings) — typiquement 3 à 6 tags par profil (ex: "Vente HLM", "BRS", "PSLA")
- `stats` (array de paires {chiffre, sous-titre}) — typiquement 2 à 4 stats chiffrées 
  - Ex : `{number: "85 Mio €", subtitle: "de chiffre d'affaires en 2024"}` (au clic sur le profil)
- `image_url` (photo portrait, format ~3:4)

### Une "pub" en base contient :
- `name`, `image_url` (image de fond), `logo_url` (logo overlay), `cta_url`, `cta_label` (texte du bouton)

### 18 entrées au total dans l'app : 16 profils + 2 pubs (BRS + Landing Quadral) mais c'est amené à bouger
### Les entrées sont mélangées aléatoirement à chaque démarrage (Fisher-Yates).

---

## 4. Trois écrans à redesigner

### Écran A — Accueil (`/`, état initial)
**Fonction :** accueillir le visiteur, expliquer le concept en 5 secondes, déclencher le swipe.

**Éléments à présenter :**
- Logo QMatch
- Titre "Bienvenue sur"
- Tagline "la seule application qui fait matcher VOS BESOINS avec NOS SERVICES"
- Mention "Bailleurs institutionnels ou sociaux..."
- Description courte (~200 caractères)
- 1 bouton CTA "Commencer à MATCHER"

**Contraintes :**
- Plein écran mobile (~390×844 sur iPhone moderne, idéalement iPhone 15)
- Pas de scroll attendu
- Le bouton CTA doit aussi déclencher un événement de tracking LinkedIn (transparent pour le design)

### Écran B — Carte de swipe (`/`, état actif — l'écran central de l'app)
**Fonction :** afficher un profil/pub, permettre le swipe gauche/droite, accéder aux détails chiffrés.

**Éléments à présenter :**
- Header fixe : logo Quadral à gauche, compteur de likes ❤️ à droite (cliquable pour voir les matches, peut-être pas idéal présenté de cette manière)
- Barre de progression (18 segments, ceux passés sont remplis)
- Une carte centrale :
  - Photo du directeur (plein cadre, ratio ~3:4)
  - Bouton "i" en overlay (déclenche la vue détails)
  - Bandeau bas : nom + titre + description + tags
  - Overlays "INTÉRESSÉ" (vert, swipe droit) et "PASSER" (rouge, swipe gauche) qui s'opacifient pendant le drag
- 2 boutons sous la carte : ✕ (pass) et ❤️ (like)

**Vue détails (état alternatif de la carte) :**
- Mêmes dimensions
- Affiche les **stats chiffrées** du profil (typiquement 2-4 chiffres impactants + sous-titres)
- Bouton "Ajouter le contact" (déclenche téléchargement vCard)

**Contraintes :**
- La carte DOIT être draggable (left/right) avec retour visuel pendant le drag (translate + rotate proportionnels)
- Le swipe au-delà d'un seuil = action validée
- Sur les cartes de **pub** : pas de nom/titre/tags/détails, juste l'image de fond — pas de bouton "i"
- Le bouton ❤️ du header doit montrer le nombre de matches en temps réel

### Écran C — Liste des matches (`/`, état final après les 18 cartes)
**Fonction :** récapituler les profils likés, permettre le téléchargement vCard et le clic sur les pubs.

**Éléments à présenter :**
- Header (même que swipe)
- Titre "Vos services matchés"
- Liste verticale scrollable :
  - Cartes profil : photo + tags + nom + titre + bouton "Ajouter le contact"
  - Cartes pub : logo + bouton "Voir" (qui ouvre l'URL externe)
- Bouton "Recommencer" en bas

**Contraintes :**
- L'utilisateur peut avoir liké 0 à 18 éléments
- Le scroll vertical est autorisé sur cet écran (contrairement aux 2 autres)

---

## 5. Deux écrans secondaires à designer

### Écran D — Dashboard directeur (`/me/:token`)
**Fonction :** chaque directeur a un lien personnel pour suivre SES stats en temps réel pendant le congrès.

**Éléments à présenter :**
- Photo + nom du directeur
- Badge "X ᵉ sur 16 en likes" (compétition voulue entre directeurs)
- 4 compteurs : Likes / vCards / Détails vus / Passes
- Graphique courbe : évolution horaire des likes sur les 3 jours

**Contraintes :**
- Auth = juste un token long dans l'URL, pas de login form
- Mise à jour live via Supabase Realtime (les chiffres s'incrémentent visuellement)
- Cible mobile mais peut être consulté sur desktop aussi

### Écran E — Dashboard superadmin (`/admin`)
**Fonction :** pour l'organisateur (PYC) — vue d'ensemble, liens directeurs copiables, reset stats, export CSV.

**Éléments à présenter :**
- Form de login (mot de passe)
- Une fois loggé :
  - 4 grands compteurs totaux
  - Tableau leaderboard (16 lignes profils : likes/passes/détails/vCards + lien copiable /me)
  - Tableau pubs (2 lignes : likes + clics)
  - Boutons : Refresh, Export stats CSV, Export events CSV, Reset (destructif, confirmation requise)

**Contraintes :**
- Plus utilitaire que glamour — doit être lisible avant d'être beau
- Doit fonctionner sur desktop ET sur mobile (tableau horizontalement scrollable sur mobile)

---

## 6. Identité QUADRAL (à respecter)

**Couleurs actuelles :**
- Bleu profond `#0e1d4d` (background principal)
- Rose magenta `#e4208d` (accent, CTA, highlights)
- Blanc pour texte sur bleu

**Logo :** Il sera fourni en SVG si besoin

**Ton :** professionnel, sérieux, mais accessible. C'est de l'immobilier institutionnel, mais un peu de fun ne tue pas. Mais le côté "Tinder" assume une légère touche ludique pour rendre l'événement mémorable.

**Marques satellites :** Quadral Transactions, Quadral Property, Quadral Expertise, Quadral E-Services, Quadral Promotion, Quadral Ingénierie Immobilière, Quadral Conseil — chacune correspond à un ou plusieurs directeurs.

→ **À demander à PYC :** *je n'ai pas encore le brand book officiel Quadral. Si tu en as un (typo, déclinaisons logo, do/don't), à transmettre au designer en complément.*

---

## 7. Ce que le designer peut TOUCHER

✅ **Liberté totale sur :**
- Typographie (toute typo Google Fonts ou system fonts disponible)
- Espacements, hiérarchie visuelle, tailles
- Animations (CSS, React Spring, Framer Motion — on peut installer)
- Iconographie (lucide-react, react-icons, SVG custom — au choix)
- Layout des cartes, des dashboards
- Style des boutons, inputs, tableaux
- Treatments visuels : ombres, gradients, glassmorphisme, neumorphisme, illustrations
- Background : peut passer en illustration animée, dégradé complexe, vidéo loop discrète, etc.
- Micro-interactions (hover, tap, transitions entre états)

✅ **Liberté de proposer (mais on en discute) :**
- Mode sombre / mode clair
- Une mascotte / illustration mascot
- Un mood plus "premium éditorial" vs "tech moderne"

---

## 8. Ce que le designer NE peut PAS toucher

❌ **Verrous techniques :**
- La mécanique de swipe (drag gauche/droite avec retour visuel) — c'est l'ADN de l'app
- La structure des données (les champs d'un profil/pub sont figés en base)
- Le téléchargement vCard (déclenche un fichier .vcf, ne pas re-designer ça comme une popup interactive — c'est un download navigateur)
- Le LinkedIn Insight Tag (script tiers dans le `<head>`, invisible visuellement)
- Le mélange aléatoire des cartes (Fisher-Yates shuffle, l'ordre change à chaque session)
- Le mode portrait forcé (l'app bloque en paysage avec un message — à intégrer dans le design)

❌ **Contraintes contextuelles :**
- Pas de **connexion utilisateur** côté visiteur — anonyme
- Pas de **persistance des likes** côté visiteur (refresh = recommence), on pourrait imaginer une persistance pour éviter qu'une seul browser puisse retomber sur la liste de ses like directement mais toujours avec le bouton recommencer s'il souhaite redémarrer.
- Pas d'**internationalisation** — français uniquement
- Pas de **mode hors-ligne** — connexion 4G du congrès, assumée présente

---

## 9. Points faibles de la version actuelle (axes d'amélioration prioritaires)

D'après l'analyse de la v1 / beta :

1. **L'intro est terne** — n'évoque pas la mécanique du swipe, ne donne pas envie de commencer
2. **Le bandeau bas des cartes est lourd** (gros dégradé noir, texte tassé)
3. **Les tags sont en pavé rose uniforme** — ils ne sont pas hiérarchisés
4. **La vue détails est austère** (chiffres en gros sur fond noir)
5. **La page "matches" ressemble à une liste de contacts** — pas de récompense visuelle d'avoir fait le parcours
6. **Le dashboard directeur est dépouillé** — pourrait être plus motivant (le classement mérite d'être mis en scène)
7. **Le dashboard admin est utilitaire** — OK pour la prod mais peut être plus agréable

---

## 10. Inspirations possibles à explorer

- **Tinder, Bumble, Hinge** : pour les mécaniques de swipe (mais éviter de cloner — l'app est B2B)
- **Apple Maps / Lieux** : pour les cartes detail (clean, hiérarchisé)
- **Notion / Linear** : pour les dashboards (sobriété élégante)
- **Stripe** : pour l'esthétique B2B premium (mais peut-être trop SaaS)
- **Apps événementielles haut de gamme** : Cannes Festival app, Davos…

---

## 11. Livrables attendus du designer

Idéalement (à adapter selon outil utilisé) :

1. **Mood board / direction visuelle** : 1 à 3 pistes contrastées avant de choisir
2. **Maquettes haute-fidélité** des 5 écrans (A à E) en mobile (390×844) :
   - État de base + états alternatifs (carte en mode détails, drag actif, etc.)
3. **Spec d'animation** : durées, easings, séquences (verbaux ou via Lottie/JSON si possible)
4. **Palette finale + typo finale** : valeurs hex, font names
5. **Composants réutilisables identifiés** : boutons, cartes, badges, tableaux → pour faciliter l'implémentation
6. **Notes pour le développeur** : tout ce qui pourrait être tricky côté code (animations complexes, états multiples, transitions…)

---

## 12. Workflow proposé pour le designer / l'IA

1. Lire ce brief en entier
2. Poser les questions de clarification AVANT de commencer (notamment sur le brand book Quadral, et sur les attentes émotionnelles de PYC)
3. Proposer 2-3 directions visuelles distinctes
4. Une direction sélectionnée → produire les maquettes des 5 écrans
5. Itérer avec PYC
6. Une fois validé → transmettre les specs à l'équipe technique (= moi, Claude Code) pour implémentation propre dans le code React existant

---

## 13. Ce que je (le développeur) m'engage à fournir

- Le code React + CSS actuel sur demande (le repo est sur GitHub : `EvelQuadral/QMatch`)
- Une URL Netlify de prévisualisation pour voir l'app fonctionner avant de redesigner
- Une session de Q/R technique si tu as un doute sur ce qui est faisable
- L'implémentation finale dans le code, à partir de tes maquettes
