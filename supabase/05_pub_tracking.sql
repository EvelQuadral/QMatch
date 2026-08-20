-- ============================================================================
-- QMatch — Migration 05 : tracking des pubs
-- ============================================================================
-- À EXÉCUTER après setup.sql, 02_feedback.sql, 03_cleanup_webp.sql et
-- 04_dashboards_extras.sql.
--
-- PROBLÈME RÉSOLU
-- Depuis la migration 03, les pubs ne sont plus des lignes de la table
-- `profiles` : elles vivent en statique dans /public/pubs/pubs.json. Leurs
-- identifiants sont donc des chaînes (ex: "pub:BRS") et non des BIGINT.
-- Résultat : `increment_stat()` (qui attend un BIGINT référençant `profiles`)
-- ne pouvait pas les enregistrer, et le front les ignorait silencieusement.
-- Aucun like, aucun pass, aucun clic sur les pubs n'était comptabilisé.
--
-- SOLUTION
-- Un compteur séparé, indexé sur une clé texte libre. Les pubs restent
-- pilotées à 100 % depuis pubs.json : ajouter une pub sur GitHub ne demande
-- AUCUNE action en base, sa ligne de stats se crée toute seule au premier
-- événement (UPSERT).
--
-- RE-EXÉCUTION : SAFE et IDEMPOTENTE. Contrairement à 02_feedback.sql, ce
-- script ne DROP aucune table de données : les compteurs déjà accumulés
-- survivent à un re-run.
-- ============================================================================


-- ============================================================================
-- 1. TABLE pub_counters
-- ============================================================================
-- Une ligne par pub, créée à la volée. `pub_key` correspond au champ `key`
-- de pubs.json (ou à `name` si `key` est absent).

CREATE TABLE IF NOT EXISTS pub_counters (
  pub_key TEXT PRIMARY KEY,
  likes INT DEFAULT 0 NOT NULL,
  passes INT DEFAULT 0 NOT NULL,
  clicks INT DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


-- ============================================================================
-- 2. COLONNE events.pub_key
-- ============================================================================
-- Les events de pub ont profile_id = NULL et pub_key renseigné.
-- Note : on n'ajoute PAS de contrainte "profile_id OU pub_key non nul", car
-- les events des profils supprimés en migration 03 ont déjà profile_id = NULL
-- (effet du ON DELETE SET NULL) et violeraient la contrainte.

ALTER TABLE events ADD COLUMN IF NOT EXISTS pub_key TEXT;

CREATE INDEX IF NOT EXISTS idx_events_pub_key ON events(pub_key) WHERE pub_key IS NOT NULL;


-- ============================================================================
-- 3. FONCTION increment_pub_stat (publique, anon)
-- ============================================================================
-- Équivalent de increment_stat() pour les pubs. Actions acceptées :
--   • 'like'      → la pub a été gardée dans le carnet
--   • 'pass'      → la pub a été passée
--   • 'pub_click' → clic sur le CTA (ouverture du site externe)

CREATE OR REPLACE FUNCTION increment_pub_stat(
  p_pub_key TEXT,
  p_action TEXT,
  p_session_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF p_pub_key IS NULL OR LENGTH(TRIM(p_pub_key)) = 0 THEN
    RAISE EXCEPTION 'pub_key is required';
  END IF;

  IF p_action NOT IN ('like', 'pass', 'pub_click') THEN
    RAISE EXCEPTION 'Invalid pub action: %', p_action;
  END IF;

  -- Filet de sécurité : la clé vient du client, on borne sa longueur
  v_key := LEFT(TRIM(p_pub_key), 80);

  -- 1. Log brut horodaté (profile_id NULL, pub_key renseigné)
  INSERT INTO events (profile_id, action, session_id, pub_key)
  VALUES (NULL, p_action, p_session_id, v_key);

  -- 2. Compteur atomique — la ligne se crée au premier événement
  INSERT INTO pub_counters (pub_key, likes, passes, clicks)
  VALUES (
    v_key,
    CASE WHEN p_action = 'like' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'pass' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'pub_click' THEN 1 ELSE 0 END
  )
  ON CONFLICT (pub_key) DO UPDATE SET
    likes = pub_counters.likes + CASE WHEN p_action = 'like' THEN 1 ELSE 0 END,
    passes = pub_counters.passes + CASE WHEN p_action = 'pass' THEN 1 ELSE 0 END,
    clicks = pub_counters.clicks + CASE WHEN p_action = 'pub_click' THEN 1 ELSE 0 END,
    updated_at = NOW();
END;
$$;


-- ============================================================================
-- 4. FONCTION admin_get_pub_stats (admin only)
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_get_pub_stats(p_password TEXT)
RETURNS TABLE(
  pub_key TEXT,
  likes INT,
  passes INT,
  clicks INT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin password';
  END IF;

  RETURN QUERY
  SELECT pc.pub_key, pc.likes, pc.passes, pc.clicks, pc.updated_at
  FROM pub_counters pc
  ORDER BY pc.clicks DESC, pc.likes DESC;
END;
$$;


-- ============================================================================
-- 5. MISE À JOUR admin_reset_stats — remet aussi les pubs à zéro
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_reset_stats(
  p_password TEXT,
  p_include_events BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin password';
  END IF;

  UPDATE stats_counters SET
    likes = 0,
    passes = 0,
    details_views = 0,
    vcard_downloads = 0,
    pub_clicks = 0,
    updated_at = NOW();

  UPDATE pub_counters SET
    likes = 0,
    passes = 0,
    clicks = 0,
    updated_at = NOW();

  IF p_include_events THEN
    DELETE FROM events;
  END IF;
END;
$$;


-- ============================================================================
-- 6. MISE À JOUR admin_export_events — expose les events de pub
-- ============================================================================
-- La colonne "Profil" affiche le nom du directeur, ou la clé de la pub
-- préfixée "[pub] " pour rester lisible dans le CSV.

CREATE OR REPLACE FUNCTION admin_export_events(p_password TEXT)
RETURNS TABLE(
  created_at TIMESTAMPTZ,
  profile_name TEXT,
  action TEXT,
  session_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin password';
  END IF;

  RETURN QUERY
  SELECT
    e.created_at,
    COALESCE(p.name, CASE WHEN e.pub_key IS NOT NULL THEN '[pub] ' || e.pub_key END, '(profil supprimé)'),
    e.action,
    e.session_id
  FROM events e
  LEFT JOIN profiles p ON p.id = e.profile_id
  ORDER BY e.created_at DESC;
END;
$$;


-- ============================================================================
-- 7. MISE À JOUR admin_get_global_kpis — cumule les clics pub des 2 sources
-- ============================================================================
-- total_pub_clicks additionne l'ancien compteur (stats_counters.pub_clicks,
-- hérité de l'époque où les pubs étaient en base) et le nouveau (pub_counters).

CREATE OR REPLACE FUNCTION admin_get_global_kpis(p_password TEXT)
RETURNS TABLE(
  visitors_count BIGINT,
  total_likes BIGINT,
  total_details BIGINT,
  total_vcards BIGINT,
  total_passes BIGINT,
  total_pub_clicks BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin password';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT e.session_id) FROM events e WHERE e.session_id IS NOT NULL),
    COALESCE(SUM(sc.likes), 0),
    COALESCE(SUM(sc.details_views), 0),
    COALESCE(SUM(sc.vcard_downloads), 0),
    COALESCE(SUM(sc.passes), 0),
    COALESCE(SUM(sc.pub_clicks), 0) + (SELECT COALESCE(SUM(pc.clicks), 0) FROM pub_counters pc)
  FROM stats_counters sc
  JOIN profiles p ON p.id = sc.profile_id
  WHERE p.active = true;
END;
$$;


-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================
-- Même principe que les autres tables : aucun accès direct, tout passe par
-- les fonctions SECURITY DEFINER.

ALTER TABLE pub_counters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON pub_counters FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION increment_pub_stat(TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_pub_stats(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_reset_stats(TEXT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_export_events(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_global_kpis(TEXT) TO anon, authenticated;


-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
-- Simuler un clic puis lire les compteurs :
--   SELECT increment_pub_stat('BRS', 'pub_click', gen_random_uuid());
--   SELECT * FROM admin_get_pub_stats('quadral2026');
--   SELECT * FROM events WHERE pub_key IS NOT NULL ORDER BY created_at DESC LIMIT 5;
--
-- Nettoyer le test :
--   DELETE FROM events WHERE pub_key IS NOT NULL;
--   UPDATE pub_counters SET likes = 0, passes = 0, clicks = 0;
-- ============================================================================
