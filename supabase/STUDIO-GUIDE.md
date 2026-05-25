# 📖 Guide d'administration QMatch

Ce guide couvre les **3 manipulations courantes** que tu auras à faire sur QMatch sans toucher au code.

> 📍 **Où se passent les choses ?**
> - **Profils directeurs** → table `profiles` dans **Supabase Studio**
> - **Photos directeurs** → fichiers WebP dans `/public/` du repo GitHub
> - **Pubs** → fichier `/public/pubs/pubs.json` du repo GitHub + SVG logos dans `/public/pubs/`
> - **Stats** → bouton Reset dans `/admin` de l'app

---

## 1️⃣ AJOUTER un directeur

### Étape 1 — Préparer la photo
1. Convertir la photo en **WebP** (recommandé) ou JPG
   - Format : portrait, ratio ~3:4 idéal
   - Poids : viser < 50 KB pour des téléchargements rapides en 4G de congrès
   - Nom de fichier : sans accent, sans espace, ex : `JeanDupont.webp`
2. Ajouter le fichier dans le dossier `public/` du repo GitHub
   (drag-drop via web interface GitHub → "Add file" → "Upload files" dans le dossier `public/`)

### Étape 2 — Créer l'entrée dans Supabase
1. Ouvre [supabase.com/dashboard](https://supabase.com/dashboard) → ton projet `qmatch`
2. **Table Editor** (icône table dans la colonne de gauche)
3. Clique sur la table **`profiles`**
4. Bouton **`+ Insert` → `Insert row`** (en haut à droite)
5. Remplis les champs :

| Champ | Valeur exemple | Note |
|---|---|---|
| `type` | `profile` | obligatoire |
| `name` | `Jean DUPONT` | nom complet en majuscule au choix |
| `title` | `Directeur du machin - Quadral` | apparaît sous le nom |
| `description` | `Spécialiste de blabla, il vous accompagne...` | 150-300 caractères idéal |
| `email` | `jean.dupont@quadral.fr` | utilisé pour la vCard |
| `phone` | `06.12.34.56.78` | utilisé pour la vCard |
| `tags` | `["Vente HLM","BRS","PSLA"]` | format **JSON array** — entre crochets, valeurs entre guillemets |
| `stats` | `[{"number":"100","subtitle":"trucs faits"}]` | format **JSONB** — 2 à 4 entrées idéal |
| `image_url` | `/JeanDupont.webp` | **important : avec le `/` au début** |
| `active` | `true` | doit être true pour apparaître |

⚠️ Laisse vides les champs `id`, `dashboard_token`, `sort_order`, `created_at`, `updated_at`, `logo_url`, `cta_url`, `cta_label` — ils sont auto-remplis ou inutiles pour un profil.

6. Clique **Save**

### Étape 3 — Récupérer le lien dashboard de la personne
- Va sur `https://qmatch.netlify.app/admin`, login avec ton mot de passe
- Tu verras la nouvelle ligne → bouton **"Copier"** à côté de son lien `/me/...`
- Tu lui envoies ce lien par mail, c'est son dashboard perso

### Étape 4 — Pousser sur GitHub
Si tu as ajouté une photo (Étape 1), elle doit être pushée sur GitHub (drag-drop dans `/public/`).
Puis Netlify → **Trigger deploy** → **Clear cache and deploy site**.

Si tu n'as pas ajouté de photo (juste créé un profil en base), pas besoin de redéployer.

---

## 2️⃣ SUPPRIMER un directeur

### Option A — Désactivation propre (préserve les stats historiques)

1. Supabase → Table Editor → `profiles`
2. Clique sur la ligne du directeur
3. Mets `active` = `false`
4. Save

→ Il disparaît de l'app, mais ses stats accumulées restent en base. **Utile si tu veux comparer plus tard.**

Pour le réactiver : repasse `active` à `true`.

### Option B — Suppression définitive

1. Supabase → Table Editor → `profiles`
2. Clique sur la ligne → **3 points** → **Delete row** (ou la touche Delete)
3. Confirme

⚠️ Cela efface **aussi** ses stats accumulées et son token. Irréversible.

→ Tu peux supprimer la photo associée du dossier `/public/` sur GitHub si tu veux faire le ménage (pas obligatoire, ça n'impacte rien).

---

## 3️⃣ AJOUTER une pub

### Étape 1 — Préparer le logo
1. Convertir le logo en **SVG** (idéal car vectoriel, scale parfaitement) ou PNG
2. Nom de fichier : sans accent, sans espace, ex : `nouveauPartenaire.svg`
3. Ajouter dans `/public/pubs/` du repo GitHub (drag-drop)

### Étape 2 — Éditer `pubs.json`

1. Sur GitHub, va dans `/public/pubs/pubs.json`
2. Clique sur l'**icône crayon** (Edit this file) en haut à droite du fichier
3. Ajoute une nouvelle entrée dans le tableau `pubs` (entre les accolades) :

```json
{
  "name": "Nouveau Partenaire",
  "logo": "nouveauPartenaire.svg",
  "url": "https://lien-vers-le-site.fr",
  "label": "Découvrir",
  "subtitle": "Service B2B Quadral",
  "description": "Une phrase explicative qui apparaît sur la card."
}
```

Les champs :
| Champ | Obligatoire ? | Détail |
|---|---|---|
| `name` | ✅ | Nom interne (apparaît dans /admin) |
| `logo` | ✅ | Nom exact du fichier dans `/pubs/` |
| `url` | ✅ | URL externe à ouvrir au clic "Voir" |
| `label` | ❌ | Texte du bouton (défaut : "Voir") |
| `subtitle` | ❌ | Court, sous le logo |
| `description` | ❌ | Plus long, sous le subtitle |

⚠️ **Attention syntaxe JSON** :
- Une virgule après chaque entrée sauf la dernière
- Toutes les valeurs entre guillemets `"..."`
- Pas de virgule traînante après le dernier `}`

4. Tout en bas, **Commit changes** → message court → **Commit**

### Étape 3 — Deploy
Netlify → **Trigger deploy** → **Clear cache and deploy site**.

---

## 4️⃣ SUPPRIMER ou MODIFIER une pub

Pareil que l'ajout, dans `pubs.json` :

**Supprimer** : retire l'entrée complète (de `{` à `}` + la virgule éventuelle).
**Modifier** : édite les valeurs (texte, url, etc.).

Ensuite : Commit + Deploy Netlify.

Tu peux laisser le SVG logo dans `/public/pubs/` même si tu retires l'entrée — il ne sera juste plus référencé.

---

## 5️⃣ RESET les compteurs (avant le congrès, après tests)

⚠️ **À faire le matin du J1 du congrès**, après tous tes tests.

### Procédure (30 sec)

1. Va sur `https://qmatch.netlify.app/admin`
2. Login avec ton mot de passe admin
3. Bouton **Reset** (rouge, en haut à droite)
4. Modal : 2 options
   - **Reset stats seul** (défaut) → efface les compteurs visibles. **L'historique brut dans `events` est conservé**. C'est ce que tu veux 99% du temps.
   - **Reset complet** (case à cocher "Effacer aussi l'historique brut") → efface tout, sans backup. À n'utiliser qu'**après le congrès, après export CSV final**.
5. Tape `RESET` dans le champ pour confirmer
6. Click **RESET stats** → un fichier CSV de snapshot des stats au moment du reset est téléchargé automatiquement → l'opération s'exécute → toast de confirmation

→ Les compteurs sont à zéro, les dashboards `/me/{token}` aussi.

---

## 6️⃣ EXPORTER les stats (pendant et après le congrès)

Depuis `/admin` :
- **Export stats CSV** → fichier avec compteurs agrégés (likes/passes/details/vCards par profil + clics pubs)
- **Export events CSV** → log brut horodaté : 1 ligne par action, avec timestamp, profil concerné, action, session_id anonymisé

Le fichier events est précieux pour les analyses post-congrès :
- Pics horaires de fréquentation
- Visiteurs uniques (par `session_id`)
- Taux de complétion (sessions qui swipent jusqu'à la fin)

---

## 7️⃣ CHANGER le mot de passe admin

1. Supabase → Table Editor → `app_secrets`
2. Ligne où `key = admin_password`
3. Modifie `value` → Save
4. Au prochain login sur `/admin`, c'est ce nouveau mot de passe qu'il faudra entrer

---

## 🆘 Quelque chose cloche ?

| Symptôme | Cause probable | Fix |
|---|---|---|
| Une photo n'apparaît pas | Mauvais nom de fichier dans `image_url` (sensible à la casse) | Vérifie l'orthographe exacte vs le fichier dans `/public/` |
| Un profil n'apparaît pas | `active = false` ou type ≠ 'profile' | Vérifie dans Studio |
| Le compteur n'incrémente pas | RLS ou function down | Regarde la console navigateur, recharge `/admin` |
| Une pub ne s'affiche pas | JSON invalide ou logo absent | Valide ton JSON sur [jsonlint.com](https://jsonlint.com) |
| Le projet Supabase est "paused" | 7 jours sans activité (free tier) | Clique "Restore project" sur le dashboard, ça reprend en 30 sec |
| Erreur réseau côté visiteur | Wi-Fi du salon défaillant | Aucune action côté code — le tracking offline est mis en file (mais imperfait) |

---

## ⚠️ À ne JAMAIS faire

- ❌ Partager la clé `service_role` (Settings → API) — c'est la clé maître qui bypass toute sécurité
- ❌ Modifier directement les valeurs dans `stats_counters` (ça crée des incohérences avec `events`)
- ❌ Activer le partage public du projet Supabase (Settings → General → Public)
- ❌ Re-exécuter `setup.sql` en plein congrès (ça efface tout)
- ❌ Reset complet (events compris) avant export CSV
