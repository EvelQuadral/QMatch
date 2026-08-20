# Journal de bord — QMatch

> Ce fichier est le **point d'entrée** du projet. Il est tenu à jour à la fin de chaque
> itération pour qu'on puisse reprendre le dossier sur une autre machine, un autre compte,
> ou après plusieurs mois d'interruption, sans rien avoir à redécouvrir.
>
> Convention : on ajoute une entrée datée en haut de la section « Itérations », la plus
> récente en premier.

---

## 1. État du projet au 20 août 2026

| | Statut |
|---|---|
| **Code** | ✅ Complet, redesign v3 implémenté |
| **Base Supabase** | ✅ En ligne, 13 profils, migrations 01→05 appliquées |
| **Site Netlify** | ⏸️ **En pause** — mis en pause volontairement par PYC, à réactiver (le 404 vient de là) |
| **Environnement local** | ✅ Node 22.23.2 installé, build validé en 1 s |
| **Dépôt GitHub** | ✅ `EvelQuadral/QMatch`, branche `main` |

**Échéance : congrès HLM, septembre/octobre 2026.**

### Ce qui bloque encore

1. **Réactiver le site Netlify** et le rebrancher sur le dépôt renommé (voir §4).
   C'est le dernier point bloquant : le reste est fait.

---

## 2. Accès et coordonnées techniques

| Ressource | Où |
|---|---|
| Dépôt | https://github.com/EvelQuadral/QMatch |
| Supabase | https://supabase.com/dashboard → projet QMatch |
| Identifiant projet Supabase | `gmzagoosptphsuxohgjd` |
| Mot de passe `/admin` | `quadral2026` (par défaut — **à changer avant le congrès**) |
| Landing liée depuis une pub | https://congres-hlm.quadral.fr |
| Site BRS lié depuis une pub | https://www.toutsurlebrs.fr |

Les clés Supabase vivent dans `.env.local`, **jamais commité**. Sur une machine neuve, il faut
les recopier depuis **Supabase → Settings → API**.

---

## 3. Itérations

### 📅 20 août 2026 (après-midi) — Node installé, build validé, migration 05 appliquée

**Node 22.23.2 LTS installé** (et non Node 20 : sorti de support en 2026). `netlify.toml` a été
aligné sur la même version, pour que le build serveur reproduise exactement le build local.

**Premier build réussi du code v3** : 1854 modules, 976 ms, bundle principal 381 Ko / 110 Ko gzip.
Deux enseignements :

- **`node_modules` était corrompu** : ses liens symboliques avaient été cassés par la
  synchronisation OneDrive, qui ne sait pas les gérer. `vite` refusait de démarrer.
  ⚠️ **Réflexe à avoir sur ce dossier** : si un build échoue de façon inexplicable,
  `rm -rf node_modules && npm install` avant toute autre hypothèse.
- Un avertissement a révélé une vraie erreur dans `PhaseLoader` : `minHeight` déclaré deux fois.
  En CSS c'est un repli valable, dans un objet JS la seconde clé écrase la première — le repli
  `100vh` n'a jamais servi. Corrigé.

**Migration `05_pub_tracking.sql` appliquée** sur Supabase, RPC `increment_pub_stat` et
`admin_get_pub_stats` vérifiées présentes et fonctionnelles.

**Vérification visuelle** (première depuis le redesign) : écran d'accueil conforme, animation
des cartes fluide, aucune erreur en console (seulement deux avertissements React Router v7,
sans conséquence), les deux pubs se chargent avec les bonnes clés de stats `BRS` et `Landing`.

---

### 📅 20 août 2026 (fin de journée) — Mise en ligne sur GitHub

Premier `git push` réussi depuis le Mac de PYC. Le dépôt distant était resté au 28 mai.

**Le compte GitHub avait été renommé** : `MKT-EvelQuadral` → `EvelQuadral`. GitHub suit
la redirection en **lecture** (les `git fetch` passaient sans rien signaler) mais la refuse en
**écriture** : le push renvoyait un 403 qui ressemblait à tort à un problème de droits.
`git remote set-url` a réglé le cas. Toutes les URL de la documentation ont été corrigées.

Autres points rencontrés, notés ici parce qu'ils reviendront :

- La branche `main` n'avait pas de branche amont après le repointage du matin
  (`git branch --set-upstream-to=origin/main main`).
- Le jeton d'accès GitHub était de type *fine-grained* et n'avait **aucune permission**
  (`Repositories: 0`). Il faut y ajouter **Contents: Read and write** pour pouvoir pousser.
  ⚠️ Ce jeton **expire le 19 septembre 2026**, soit potentiellement pendant le congrès.
  À prolonger avant l'événement si un correctif doit être poussé sur place.
- `credential.helper osxkeychain` a été activé : l'authentification n'est à refaire qu'une fois.

**Audit du dépôt après push** — rien à nettoyer côté GitHub :
une seule branche (`main`), 13 photos correspondant exactement aux 13 profils actifs en base,
aucun asset orphelin, aucun fichier référencé manquant, aucun secret versionné
(`.env.example` ne contient que des placeholders, `.env.local` est ignoré).

---

### 📅 20 août 2026 — Reprise après 3 mois d'interruption

**Contexte.** Dernier travail le 28 mai 2026. À la reprise : infra partiellement morte,
dépôt git local dans un état trompeur, dette technique accumulée pendant le redesign v3.

#### Diagnostic

- Le projet Supabase avait été **mis en veille** par inactivité (réactivé par PYC le 20/08).
- Le site Netlify répondait 404 : diagnostiqué à tort comme supprimé, il était en réalité
  **mis en pause** volontairement par PYC. Un site Netlify en pause renvoie un 404 sec,
  indiscernable d'un site supprimé vu de l'extérieur — ne pas retomber dans le piège.
- **Node.js n'est pas installé** sur le Mac : ni `node`, ni `npm`, ni Homebrew.
- Le dépôt git local était **orphelin** : la branche `main` locale pointait sur une vieille
  histoire issue de Replit, **sans aucun ancêtre commun** avec `origin/main`. Résultat :
  `git status` affichait ~90 fichiers « non suivis », donnant l'impression que tout le
  travail v3 n'était pas sauvegardé. Vérification faite, le working tree était **identique
  octet pour octet** à `origin/main` : rien n'était perdu.

#### Réalisé

**A. Remise en ordre du dépôt git**

- `main` repointée sur `origin/main` **sans toucher aux fichiers** (`git update-ref`), l'ancienne
  histoire Replit conservée sur la branche `main-replit-legacy` par sécurité.
- `git config core.fileMode false` : OneDrive force les permissions à 755 sur tous les
  fichiers, ce que git interprétait comme 91 fichiers modifiés. Le réglage supprime ce bruit.
- Conséquence pratique : **on peut de nouveau committer et pousser normalement**, au lieu de
  ré-uploader les fichiers à la main via l'interface web de GitHub.

**B. Nettoyage**

Code mort supprimé (aucune référence nulle part, vestiges de l'architecture v1/v2) :
`src/App.css` (1112 lignes), `components/ContactList.jsx`, `components/ExplanationOverlay.jsx`,
`components/Header.jsx`, `components/IntroScreen.jsx`, `hooks/useSwipe.js`.

Dossier nettoyé : résidus Replit (`.replit`, `.config/`, `.local/`, `.agents/`), worktree git
orphelin, `dist/` (build périmé, régénéré par Netlify à chaque déploiement), fichiers `.DS_Store`.
**191 Mo → 120 Mo.**

`.gitignore` ajouté au dépôt : il n'existait que localement, `origin/main` n'en avait aucun —
un clone frais risquait de committer `node_modules/` et `dist/`.

**C. Tracking des pubs — le trou dans les stats**

*Le problème.* Depuis la migration 03, les pubs ne sont plus des lignes de `profiles` : elles
vivent dans `public/pubs/pubs.json`. Leur identifiant est donc une chaîne, pas un `BIGINT`.
`increment_stat()` les refusait, et `useTracking` les ignorait silencieusement. **Aucun like,
aucun pass, aucun clic sur les pubs n'était comptabilisé** — les deux pubs étaient des angles morts.

*La solution.* Un compteur séparé indexé sur une clé texte, sans remettre les pubs en base :

- nouvelle table `pub_counters` + colonne `events.pub_key` (migration `05_pub_tracking.sql`) ;
- RPC `increment_pub_stat(pub_key, action, session)` ;
- l'id d'une pub passe de `pub-0-BRS` (dépendant de l'ordre dans le fichier) à `pub:BRS`
  (dérivé de son nom) : **réordonner les pubs ne casse plus l'historique de stats** ;
- `useTracking` aiguille vers la bonne RPC selon l'id ;
- les pass sur les pubs sont désormais trackés eux aussi — savoir qu'une pub est
  systématiquement passée est une information utile pour arbitrer les visuels.

La ligne de compteur se crée à la volée au premier événement : **ajouter une pub dans
`pubs.json` ne demande aucune action en base.**

**D. Feedbacks rendus visibles**

Le bloc de notation existait côté visiteur et écrivait bien en base, mais `/admin` n'affichait
rien : les avis n'étaient consultables nulle part. Nouvelle section « Retours visiteurs » —
note moyenne, répartition 1→5 en barres, commentaires dépliables (colorés vert/rouge selon la
note pour repérer les retours négatifs), export CSV.

Les commentaires sont chargés **à la demande** : le dashboard se rafraîchit à chaque événement
Realtime, on ne veut pas tirer toute la table d'avis à chaque fois.

Aucune migration SQL nécessaire : les RPC `admin_get_feedback_stats` et `admin_export_feedback`
existaient déjà en base depuis mai, elles n'étaient simplement jamais appelées.

**E. Nouvelle section « Pubs » dans `/admin`**

Likes, pass, clics et taux de clic par pub. Les compteurs sont croisés avec `pubs.json` pour
qu'une pub sans aucun événement apparaisse quand même à zéro, au lieu d'être absente du tableau
(ce qui se lirait à tort comme « pas encore déployée »).

**F. Documentation**

`README.md` réécrit — il décrivait encore l'architecture v1 et annonçait 18 cartes alors qu'il
y en a 15. Ajout de **l'ordre d'exécution des migrations SQL**, qui n'était documenté nulle part
et constituait le principal piège d'une réinstallation. Création de ce journal.

#### Points de vigilance introduits

- Les deux nouvelles sections de `/admin` appellent leurs RPC **hors du `Promise.all` principal** :
  si la migration 05 n'est pas encore jouée, la section reste vide au lieu de faire tomber tout
  le dashboard.
- ⚠️ **Le code de cette itération n'a pas été compilé ni testé**, faute de Node sur la machine.
  Un contrôle syntaxique automatisé a validé les 59 fichiers de `src/`, mais ça ne remplace pas
  un build. **Premier réflexe une fois Node installé : `npm run build`, puis tester `/admin`.**

---

### 📅 Mai 2026 — Redesign v3 (pour mémoire)

Refonte visuelle complète à partir de [`DESIGN-BRIEF.md`](DESIGN-BRIEF.md) : passage à une
architecture `screens/` + composants avec CSS dédié, design tokens centralisés, bottom-sheet
des matches pendant le swipe, dashboard directeur avec leaderboard et récap de la veille,
dashboard admin refait. Migration des photos en WebP servies en statique, passage des pubs
en fichier `pubs.json`, réduction de 16 à 13 directeurs.

---

## 4. Remettre le site en ligne (Netlify)

**Le site Netlify existe toujours** — il a été mis en pause volontairement. Il ne faut donc
**pas** en créer un nouveau : les variables d'environnement, le nom de domaine et l'historique
de déploiement sont attachés au site existant et seraient perdus.

1. **Réactiver le site** (le bouton de reprise s'affiche sur le tableau de bord du site en pause)
2. **Rebrancher le dépôt**, renommé entre-temps :
   *Site configuration → Build & deploy → Continuous deployment → Manage repository* →
   choisir `EvelQuadral/QMatch`. Netlify redemandera d'autoriser son application GitHub,
   l'ancienne autorisation ne correspondant plus au compte renommé.
3. **Vérifier les variables d'environnement** (elles devraient déjà être là) :
   `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, identiques à `.env.local`
4. *Deploys → Trigger deploy → Deploy site*
5. Noter l'URL servie ci-dessous et la reporter dans le **QR code du stand**

> **URL de production :** _à compléter_

⚠️ Un site Netlify en pause renvoie un **404 sec**, impossible à distinguer d'un site supprimé
vu de l'extérieur. Avant de conclure que l'infra est morte, vérifier l'état dans le tableau de bord.

---

## 5. Éviter que l'infra retombe en veille

Le projet Supabase gratuit **se met en pause après 7 jours sans requête**, et un projet resté
en pause finit par être supprimé. C'est ce qui a coûté 3 mois de silence sur ce projet.

Trois options, par ordre de robustesse :

1. **Passer Supabase en plan Pro** (~25 $/mois) sur la période du congrès — plus de pause,
   plus de sauvegardes. Le plus sûr pour un événement à enjeu.
2. **Ping automatique** : une tâche planifiée qui appelle une RPC légère
   (`get_public_leaderboard`) une fois par jour suffit à maintenir le projet éveillé.
3. **Ouvrir `/admin` une fois par semaine** — gratuit, mais repose sur une habitude humaine.

À trancher avant de partir en congé.

---

## 6. Reste à faire

**Bloquants avant le congrès**

- [x] ~~Installer Node.js et valider le build~~ — Node 22.23.2, build OK
- [x] ~~Jouer `supabase/05_pub_tracking.sql`~~ — appliquée et vérifiée le 20/08
- [ ] Réactiver le site Netlify, rebrancher le dépôt, reporter l'URL sur le QR code
- [ ] Changer le mot de passe `/admin` (`quadral2026` par défaut)
- [ ] Choisir une stratégie anti-veille Supabase (§5)

**Contenu (en fin de projet)**

- [ ] Intégrer la liste définitive des directeurs depuis le fichier Excel + les photos
      (procédure dans [`supabase/STUDIO-GUIDE.md`](supabase/STUDIO-GUIDE.md) — photos en WebP,
      ratio 3:4, < 50 Ko, nom sans accent ni espace)

**Confort**

- [ ] Tester le parcours complet sur un vrai téléphone en conditions congrès (4G, une main)
- [ ] Vérifier que les liens `/me/:token` fonctionnent et les envoyer aux directeurs

---

## 7. Décisions techniques actées

**Rester sur Supabase, ne pas migrer vers Netlify DB** *(arbitré le 20/08/2026)*

Netlify propose désormais une base Postgres managée (Neon). Étudiée, écartée :

- **Pas d'API appelable depuis le navigateur.** Les requêtes doivent passer par des Netlify
  Functions. Il faudrait écrire et maintenir une fonction serveur pour chacune des 12 RPC
  actuellement appelées directement depuis le front.
- **Pas de Realtime.** Les dashboards `/me` et `/admin` s'actualisent en direct via les
  souscriptions Supabase ; il faudrait tout repasser en polling.
- **Plus de stockage gratuit** : la gratuité annoncée s'arrêtait au 1er juillet 2026, la
  formule est désormais à crédits.

Le seul avantage aurait été d'échapper à la mise en veille de Supabase — problème qui se
règle pour bien moins cher (§5). Une réécriture de la couche données à quelques semaines du
congrès serait un risque disproportionné.

**Les pubs restent pilotées par fichier, pas par la base** *(confirmé le 20/08/2026)*

Ajouter ou modifier une pub se fait dans `public/pubs/pubs.json` + un SVG, sans toucher à
Supabase. Le tracking a été construit pour préserver cette propriété : la ligne de compteur
se crée toute seule au premier événement.
