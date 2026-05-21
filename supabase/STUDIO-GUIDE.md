# 📖 Guide Supabase Studio — QMatch

Ce guide couvre toutes les manipulations courantes que tu auras à faire sur Supabase pour administrer QMatch sans toucher au code.

## 🔑 Accès

1. Connecte-toi sur [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique sur ton projet `qmatch`
3. Tu arrives sur le dashboard du projet

Les **2 sections** que tu utiliseras :
- **Table Editor** (icône table dans la colonne de gauche) → édition des données
- **Storage** (icône cube) → gestion des photos

---

## 📸 Photos — bucket `photos`

### Ajouter une nouvelle photo
1. **Storage → photos**
2. Clique **Upload file**
3. Sélectionne le JPG/PNG/SVG depuis ton ordi
4. Le fichier apparaît dans la liste

### Récupérer l'URL d'une photo
1. Clique sur la ligne du fichier
2. Bouton **Get URL** ou icône "..." → "Get URL"
3. Copie l'URL ou juste le **filename** (ex: `ClementHennequin.jpg`)

**Important** : dans la table `profiles`, on stocke **uniquement le filename** (`ClementHennequin.jpg`), pas l'URL complète. L'app construit l'URL toute seule.

---

## 👤 Ajouter un nouveau profil (directeur)

### Étape 1 : uploader sa photo
- Storage → photos → Upload `JeanDupont.jpg`

### Étape 2 : créer la ligne profil
1. **Table Editor → profiles**
2. Bouton **+ Insert** (en haut) → **Insert row**
3. Remplir :

| Champ | Valeur exemple |
|---|---|
| `type` | `profile` |
| `name` | `Jean DUPONT` |
| `title` | `Directeur du machin - Quadral` |
| `description` | `Spécialiste de blabla, il vous aide à...` |
| `email` | `jean.dupont@quadral.fr` |
| `phone` | `06.12.34.56.78` |
| `tags` | `["Vente HLM","BRS","PSLA"]` (format JSON array) |
| `stats` | `[{"number":"100","subtitle":"truc machin"}]` (JSONB) |
| `image_url` | `JeanDupont.jpg` (juste le filename) |
| `active` | `true` |

⚠️ Les champs `id`, `dashboard_token`, `sort_order`, `created_at`, `updated_at` sont **auto-remplis**. Laisse-les vides.

4. Clique **Save**
5. ✅ Le profil apparaît dans l'app, son token et son compteur sont créés automatiquement

### Étape 3 : récupérer son lien `/me/:token`
- Soit dans Studio : Table Editor → profiles → repère la ligne du nouveau profil → colonne `dashboard_token`
- Soit dans `/admin` : page Admin → ligne du profil → bouton "Copier"

---

## 🚫 Désactiver un profil (sans perdre ses stats)

1. Table Editor → profiles
2. Trouve la ligne, clique dessus
3. Mets `active` = `false`
4. Save

→ Le profil disparaît de l'app de swipe, mais ses stats historiques sont préservées dans `stats_counters` et `events`.

**Pour le réactiver** : repasse `active` à `true`.

---

## 🗑️ Supprimer définitivement un profil

⚠️ Cela efface aussi ses stats. À ne faire que si tu es certain.

1. Table Editor → profiles
2. Clique sur la ligne → bouton **Delete row**
3. Confirme

---

## 📺 Modifier une pub (BRS, Landing, etc.)

1. Table Editor → profiles
2. Filtre `type = pub` (ou cherche par nom)
3. Modifie les champs :
   - `name` : nom affiché dans /admin
   - `image_url` : filename du JPG de fond (ex: `brs.jpg`)
   - `logo_url` : filename du SVG du logo (ex: `brs_logo.svg`)
   - `cta_url` : l'URL de destination quand on clique "Voir"
   - `cta_label` : le texte du bouton (par défaut "Voir")
4. Save

---

## ➕ Ajouter une nouvelle pub

1. Storage → photos : upload le fond + le logo (ex: `partenaire.jpg` + `partenaire_logo.svg`)
2. Table Editor → profiles → Insert row :

| Champ | Valeur |
|---|---|
| `type` | `pub` |
| `name` | `Partenaire X` |
| `image_url` | `partenaire.jpg` |
| `logo_url` | `partenaire_logo.svg` |
| `cta_url` | `https://...` |
| `cta_label` | `Découvrir` (ou laisse vide pour "Voir") |
| `active` | `true` |

3. Save

---

## 🔐 Changer le mot de passe admin

1. Table Editor → **app_secrets**
2. Trouve la ligne `key = admin_password`
3. Clique dessus, modifie `value` (ex: `superMotDePasse123`)
4. Save

→ Au prochain login sur `/admin`, c'est ce nouveau mot de passe qu'il faudra entrer.

---

## 🎯 Réorganiser l'ordre des profils

Le champ `sort_order` détermine l'ordre initial avant que l'app shuffle aléatoirement. Si tu veux que certains profils apparaissent en début de liste plus souvent :

1. Table Editor → profiles
2. Modifie `sort_order` (entier) — plus le nombre est petit, plus c'est en début de liste
3. Save

Ex: `10, 20, 30, ...` pour préserver l'ordre saisi.

---

## 🔄 Régénérer un token directeur (si quelqu'un a perdu son lien ou s'il a fuité)

1. Table Editor → profiles
2. Trouve la ligne
3. Clique sur le champ `dashboard_token` et **efface la valeur** (laisse-le NULL)
4. Save

⚠️ Studio ne re-génère pas automatiquement. Pour forcer la regénération, exécute dans SQL Editor :

```sql
UPDATE profiles
SET dashboard_token = REPLACE(
  REPLACE(
    REPLACE(encode(gen_random_bytes(24), 'base64'), '+', '-'),
    '/', '_'
  ),
  '=', ''
)
WHERE name = 'Jean DUPONT';
```

(remplace `Jean DUPONT` par le nom exact)

---

## 📊 Voir les stats brutes en SQL

Quelques requêtes utiles dans SQL Editor :

**Top 5 likes**
```sql
SELECT p.name, sc.likes
FROM profiles p
JOIN stats_counters sc ON sc.profile_id = p.id
WHERE p.type = 'profile'
ORDER BY sc.likes DESC
LIMIT 5;
```

**Activité par heure**
```sql
SELECT DATE_TRUNC('hour', created_at) AS heure,
       COUNT(*) AS actions
FROM events
GROUP BY 1
ORDER BY 1 DESC
LIMIT 24;
```

**Nombre de visiteurs uniques (sessions)**
```sql
SELECT COUNT(DISTINCT session_id) AS visiteurs
FROM events;
```

**Top profils par taux de conversion vCard**
```sql
SELECT p.name,
       sc.likes,
       sc.vcard_downloads,
       ROUND(100.0 * sc.vcard_downloads / NULLIF(sc.likes, 0), 1) AS taux_pct
FROM profiles p
JOIN stats_counters sc ON sc.profile_id = p.id
WHERE p.type = 'profile' AND sc.likes > 0
ORDER BY taux_pct DESC;
```

---

## ⚠️ À ne JAMAIS faire

- ❌ Partager la clé `service_role` (Settings → API) — c'est la clé maître qui bypass toute sécurité
- ❌ Modifier directement les valeurs dans `stats_counters` (ça créerait des incohérences avec `events`)
- ❌ Activer le partage public du projet Supabase (Settings → General → Public)
- ❌ Re-exécuter `setup.sql` en plein congrès (ça efface tout)

---

## 🆘 Quelque chose cloche ?

- Une photo ne s'affiche pas → vérifie le filename dans `profiles.image_url` (sensible à la casse, sensible aux espaces)
- Un profil n'apparaît pas dans l'app → vérifie `active = true`
- Les stats ne s'incrémentent pas → ouvre `/admin` et vérifie les compteurs ; sinon vérifie la console du navigateur côté swipe
- Le projet Supabase est passé en "paused" (après 7 jours sans activité) → clique "Restore project" sur le dashboard, ça repart en 30 sec
