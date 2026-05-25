-- ============================================================================
-- QMatch v2 — Migration dashboards extras (écrans D + E)
-- ============================================================================
-- À EXÉCUTER après setup.sql, 02_feedback.sql et 03_cleanup_webp.sql.
-- Ajoute :
--   • get_public_leaderboard()       — top des directeurs (D et E)
--   • get_director_recap_yesterday() — récap J-1 pour /me/:token
--   • admin_get_global_kpis()        — KPIs globaux pour /admin (avec visiteurs uniques)
--
-- Re-exécution : SAFE (CREATE OR REPLACE).
-- ============================================================================

-- ============================================================================
-- 1. NETTOYAGE
-- ============================================================================

DROP FUNCTION IF EXISTS get_public_leaderboard() CASCADE;
DROP FUNCTION IF EXISTS get_director_recap_yesterday(TEXT) CASCADE;
DROP FUNCTION IF EXISTS admin_get_global_kpis(TEXT) CASCADE;

-- ============================================================================
-- 2. get_public_leaderboard
-- ============================================================================
-- Retourne le classement public de tous les directeurs actifs.
-- Pas de dashboard_token exposé (privacy).

CREATE OR REPLACE FUNCTION get_public_leaderboard()
RETURNS TABLE(
  profile_id BIGINT,
  name TEXT,
  title TEXT,
  image_url TEXT,
  likes INT,
  passes INT,
  details_views INT,
  vcard_downloads INT,
  rank_likes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.title,
    p.image_url,
    COALESCE(sc.likes, 0),
    COALESCE(sc.passes, 0),
    COALESCE(sc.details_views, 0),
    COALESCE(sc.vcard_downloads, 0),
    RANK() OVER (ORDER BY COALESCE(sc.likes, 0) DESC) AS rank_likes
  FROM profiles p
  LEFT JOIN stats_counters sc ON sc.profile_id = p.id
  WHERE p.type = 'profile' AND p.active = true
  ORDER BY rank_likes;
END;
$$;

-- ============================================================================
-- 3. get_director_recap_yesterday
-- ============================================================================
-- Retourne le récap "hier" d'un directeur : rang + 3 chiffres.
-- "Hier" = jour calendaire précédent en timezone Europe/Paris.

CREATE OR REPLACE FUNCTION get_director_recap_yesterday(p_token TEXT)
RETURNS TABLE(
  rank_yesterday INT,
  total_active INT,
  likes BIGINT,
  details BIGINT,
  vcards BIGINT,
  is_first_day BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id BIGINT;
  v_yesterday_start TIMESTAMPTZ;
  v_yesterday_end TIMESTAMPTZ;
  v_first_event_date DATE;
  v_first_day BOOLEAN;
BEGIN
  SELECT p.id INTO v_profile_id
  FROM profiles p
  WHERE p.dashboard_token = p_token
    AND p.type = 'profile'
    AND p.active = true;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive token';
  END IF;

  -- Bornes "hier" en heure de Paris
  v_yesterday_start := DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Paris') - INTERVAL '1 day';
  v_yesterday_end := DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Paris');
  v_yesterday_start := v_yesterday_start AT TIME ZONE 'Europe/Paris';
  v_yesterday_end := v_yesterday_end AT TIME ZONE 'Europe/Paris';

  -- Détecter si c'est le premier jour (aucun event avant aujourd'hui)
  SELECT MIN(e.created_at::DATE) INTO v_first_event_date FROM events e;
  v_first_day := (v_first_event_date IS NULL OR v_first_event_date >= (NOW() AT TIME ZONE 'Europe/Paris')::DATE);

  RETURN QUERY
  WITH yesterday_per_profile AS (
    SELECT
      p.id,
      COUNT(*) FILTER (WHERE e.action = 'like') AS l_count,
      COUNT(*) FILTER (WHERE e.action = 'details') AS d_count,
      COUNT(*) FILTER (WHERE e.action = 'vcard') AS v_count
    FROM profiles p
    LEFT JOIN events e ON e.profile_id = p.id
      AND e.created_at >= v_yesterday_start
      AND e.created_at < v_yesterday_end
    WHERE p.type = 'profile' AND p.active = true
    GROUP BY p.id
  ),
  ranked AS (
    SELECT id, l_count, d_count, v_count,
           RANK() OVER (ORDER BY l_count DESC) AS r,
           COUNT(*) OVER () AS total
    FROM yesterday_per_profile
  )
  SELECT
    r.r::INT,
    r.total::INT,
    r.l_count::BIGINT,
    r.d_count::BIGINT,
    r.v_count::BIGINT,
    v_first_day
  FROM ranked r
  WHERE r.id = v_profile_id;
END;
$$;

-- ============================================================================
-- 4. admin_get_global_kpis
-- ============================================================================
-- KPIs globaux pour le header de /admin :
--   • visitors_count = nombre de session_id uniques (visiteurs)
--   • totals likes, details, vcards (somme sur tous les profils actifs)

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
    (SELECT COUNT(DISTINCT session_id) FROM events WHERE session_id IS NOT NULL),
    COALESCE(SUM(sc.likes), 0),
    COALESCE(SUM(sc.details_views), 0),
    COALESCE(SUM(sc.vcard_downloads), 0),
    COALESCE(SUM(sc.passes), 0),
    COALESCE(SUM(sc.pub_clicks), 0)
  FROM stats_counters sc
  JOIN profiles p ON p.id = sc.profile_id
  WHERE p.active = true;
END;
$$;

-- ============================================================================
-- 5. GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_public_leaderboard() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_director_recap_yesterday(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_global_kpis(TEXT) TO anon, authenticated;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
-- SELECT * FROM get_public_leaderboard() LIMIT 5;
-- SELECT * FROM admin_get_global_kpis('quadral2026');
-- ============================================================================
