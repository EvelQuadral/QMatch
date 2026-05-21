-- ============================================================================
-- QMatch — Setup complet de la base Supabase
-- ============================================================================
-- COMMENT UTILISER CE FICHIER :
--   1. Va sur Supabase → SQL Editor → "New query"
--   2. Colle tout le contenu de ce fichier
--   3. Clique "Run" (en bas à droite) — durée ~5 secondes
--
-- Ce script crée :
--   • 4 tables : profiles · stats_counters · events · app_secrets
--   • Triggers : auto-token + auto-counter + auto sort_order
--   • Fonctions atomiques : increment_stat, get_*_by_token, admin_*
--   • Row Level Security (RLS)
--   • Bucket Storage "photos"
--   • Realtime activé sur stats_counters
--   • Données initiales : 16 directeurs + 2 pubs (BRS + Landing)
--
-- RE-EXÉCUTION : SAFE mais DESTRUCTIVE.
--   Le script drop/recrée tout. Si tu le relances : les stats accumulées
--   sont effacées et les profils repartent de leur état initial.
--   À n'utiliser que si tu veux repartir de zéro.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. NETTOYAGE (drop existant)
-- ============================================================================

DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS stats_counters CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS app_secrets CASCADE;

DROP FUNCTION IF EXISTS increment_stat(BIGINT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_profile_stats_by_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_hourly_stats_by_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS verify_admin_password(TEXT) CASCADE;
DROP FUNCTION IF EXISTS admin_get_dashboard(TEXT) CASCADE;
DROP FUNCTION IF EXISTS admin_reset_stats(TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS admin_export_events(TEXT) CASCADE;
DROP FUNCTION IF EXISTS profiles_before_insert() CASCADE;
DROP FUNCTION IF EXISTS profiles_after_insert() CASCADE;
DROP FUNCTION IF EXISTS profiles_before_update() CASCADE;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- profiles : directeurs (type='profile') + pubs (type='pub')
CREATE TABLE profiles (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('profile', 'pub')),
  name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  email TEXT,
  phone TEXT,
  tags TEXT[] DEFAULT '{}',
  stats JSONB DEFAULT '[]'::jsonb,
  image_url TEXT NOT NULL,
  logo_url TEXT,
  cta_url TEXT,
  cta_label TEXT DEFAULT 'Voir',
  sort_order INT,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  dashboard_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_profiles_active_sort ON profiles(active, sort_order);
CREATE INDEX idx_profiles_token ON profiles(dashboard_token) WHERE dashboard_token IS NOT NULL;
CREATE INDEX idx_profiles_type ON profiles(type);

-- stats_counters : compteurs agrégés par profil (1 ligne par profil)
CREATE TABLE stats_counters (
  profile_id BIGINT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  likes INT DEFAULT 0 NOT NULL,
  passes INT DEFAULT 0 NOT NULL,
  details_views INT DEFAULT 0 NOT NULL,
  vcard_downloads INT DEFAULT 0 NOT NULL,
  pub_clicks INT DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- events : log brut horodaté (jamais effacé sauf reset complet)
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  profile_id BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('like', 'pass', 'details', 'vcard', 'pub_click')),
  session_id UUID
);

CREATE INDEX idx_events_profile ON events(profile_id);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_session ON events(session_id);

-- app_secrets : config sensible (mot de passe admin, etc.)
CREATE TABLE app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 3. TRIGGERS sur profiles
-- ============================================================================

-- Avant insert : auto-générer dashboard_token (pour profils), auto sort_order
CREATE OR REPLACE FUNCTION profiles_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.dashboard_token IS NULL AND NEW.type = 'profile' THEN
    NEW.dashboard_token := REPLACE(
      REPLACE(
        REPLACE(encode(gen_random_bytes(24), 'base64'), '+', '-'),
        '/', '_'
      ),
      '=', ''
    );
  END IF;

  IF NEW.sort_order IS NULL THEN
    NEW.sort_order := COALESCE((SELECT MAX(sort_order) FROM profiles), 0) + 10;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_before_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_before_insert();

-- Après insert : créer la ligne stats_counters correspondante
CREATE OR REPLACE FUNCTION profiles_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO stats_counters (profile_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_after_insert
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_after_insert();

-- Avant update : maintenir updated_at à jour
CREATE OR REPLACE FUNCTION profiles_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_before_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_before_update();

-- ============================================================================
-- 4. FONCTIONS PUBLIQUES (appelables par le frontend, role anon)
-- ============================================================================

-- Incrément atomique d'une stat + insertion dans events
-- Résout définitivement le problème de race conditions de stats.json
CREATE OR REPLACE FUNCTION increment_stat(
  p_profile_id BIGINT,
  p_action TEXT,
  p_session_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_action NOT IN ('like', 'pass', 'details', 'vcard', 'pub_click') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  INSERT INTO events (profile_id, action, session_id)
  VALUES (p_profile_id, p_action, p_session_id);

  UPDATE stats_counters SET
    likes = CASE WHEN p_action = 'like' THEN likes + 1 ELSE likes END,
    passes = CASE WHEN p_action = 'pass' THEN passes + 1 ELSE passes END,
    details_views = CASE WHEN p_action = 'details' THEN details_views + 1 ELSE details_views END,
    vcard_downloads = CASE WHEN p_action = 'vcard' THEN vcard_downloads + 1 ELSE vcard_downloads END,
    pub_clicks = CASE WHEN p_action = 'pub_click' THEN pub_clicks + 1 ELSE pub_clicks END,
    updated_at = NOW()
  WHERE profile_id = p_profile_id;
END;
$$;

-- Stats d'un profil + son rang (pour /me/:token)
CREATE OR REPLACE FUNCTION get_profile_stats_by_token(p_token TEXT)
RETURNS TABLE(
  profile_id BIGINT,
  name TEXT,
  image_url TEXT,
  likes INT,
  passes INT,
  details_views INT,
  vcard_downloads INT,
  rank_likes BIGINT,
  rank_vcards BIGINT,
  total_profiles BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id BIGINT;
BEGIN
  SELECT p.id INTO v_profile_id
  FROM profiles p
  WHERE p.dashboard_token = p_token
    AND p.type = 'profile'
    AND p.active = true;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive token';
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      p.id,
      p.name,
      p.image_url,
      sc.likes,
      sc.passes,
      sc.details_views,
      sc.vcard_downloads,
      RANK() OVER (ORDER BY sc.likes DESC) AS rank_likes,
      RANK() OVER (ORDER BY sc.vcard_downloads DESC) AS rank_vcards,
      COUNT(*) OVER () AS total
    FROM profiles p
    JOIN stats_counters sc ON sc.profile_id = p.id
    WHERE p.type = 'profile' AND p.active = true
  )
  SELECT r.id, r.name, r.image_url, r.likes, r.passes, r.details_views,
         r.vcard_downloads, r.rank_likes, r.rank_vcards, r.total
  FROM ranked r
  WHERE r.id = v_profile_id;
END;
$$;

-- Évolution horaire des actions pour un profil (pour /me/:token courbe)
CREATE OR REPLACE FUNCTION get_hourly_stats_by_token(p_token TEXT)
RETURNS TABLE(
  hour TIMESTAMPTZ,
  likes BIGINT,
  passes BIGINT,
  details BIGINT,
  vcards BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id BIGINT;
BEGIN
  SELECT p.id INTO v_profile_id
  FROM profiles p
  WHERE p.dashboard_token = p_token
    AND p.type = 'profile'
    AND p.active = true;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive token';
  END IF;

  RETURN QUERY
  SELECT
    DATE_TRUNC('hour', e.created_at) AS hour,
    COUNT(*) FILTER (WHERE e.action = 'like') AS likes,
    COUNT(*) FILTER (WHERE e.action = 'pass') AS passes,
    COUNT(*) FILTER (WHERE e.action = 'details') AS details,
    COUNT(*) FILTER (WHERE e.action = 'vcard') AS vcards
  FROM events e
  WHERE e.profile_id = v_profile_id
    AND e.created_at > NOW() - INTERVAL '7 days'
  GROUP BY DATE_TRUNC('hour', e.created_at)
  ORDER BY hour;
END;
$$;

-- ============================================================================
-- 5. FONCTIONS ADMIN (protégées par mot de passe)
-- ============================================================================

-- Vérifier le mot de passe admin
CREATE OR REPLACE FUNCTION verify_admin_password(p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored TEXT;
BEGIN
  IF p_password IS NULL OR p_password = '' THEN
    RETURN FALSE;
  END IF;

  SELECT value INTO v_stored FROM app_secrets WHERE key = 'admin_password';
  RETURN p_password = v_stored;
END;
$$;

-- Récupérer le dashboard complet (avec tokens) pour /admin
CREATE OR REPLACE FUNCTION admin_get_dashboard(p_password TEXT)
RETURNS TABLE(
  profile_id BIGINT,
  type TEXT,
  name TEXT,
  title TEXT,
  image_url TEXT,
  active BOOLEAN,
  sort_order INT,
  dashboard_token TEXT,
  likes INT,
  passes INT,
  details_views INT,
  vcard_downloads INT,
  pub_clicks INT
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
    p.id, p.type, p.name, p.title, p.image_url, p.active, p.sort_order,
    p.dashboard_token,
    COALESCE(sc.likes, 0), COALESCE(sc.passes, 0),
    COALESCE(sc.details_views, 0), COALESCE(sc.vcard_downloads, 0),
    COALESCE(sc.pub_clicks, 0)
  FROM profiles p
  LEFT JOIN stats_counters sc ON sc.profile_id = p.id
  ORDER BY p.sort_order;
END;
$$;

-- Reset des stats. p_include_events=true efface aussi l'historique
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

  IF p_include_events THEN
    DELETE FROM events;
  END IF;
END;
$$;

-- Export des events bruts (pour CSV)
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
  SELECT e.created_at, p.name, e.action, e.session_id
  FROM events e
  LEFT JOIN profiles p ON p.id = e.profile_id
  ORDER BY e.created_at DESC;
END;
$$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

-- Révoquer tout d'abord
REVOKE ALL ON profiles FROM anon, authenticated;
REVOKE ALL ON stats_counters FROM anon, authenticated;
REVOKE ALL ON events FROM anon, authenticated;
REVOKE ALL ON app_secrets FROM anon, authenticated;

-- profiles : anon peut lire UNIQUEMENT certaines colonnes (PAS dashboard_token)
GRANT SELECT (
  id, type, name, title, description, email, phone, tags, stats,
  image_url, logo_url, cta_url, cta_label, sort_order, active
) ON profiles TO anon, authenticated;

CREATE POLICY "Anon reads active profiles" ON profiles
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- stats_counters : anon peut lire tous les compteurs (publics)
GRANT SELECT ON stats_counters TO anon, authenticated;

CREATE POLICY "Anon reads all stats" ON stats_counters
  FOR SELECT TO anon, authenticated
  USING (true);

-- events et app_secrets : pas d'accès direct. Uniquement via RPC SECURITY DEFINER.

-- Autoriser l'exécution des RPC publics
GRANT EXECUTE ON FUNCTION increment_stat(BIGINT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_profile_stats_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_hourly_stats_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_password(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_dashboard(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_reset_stats(TEXT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_export_events(TEXT) TO anon, authenticated;

-- ============================================================================
-- 7. STORAGE — bucket "photos"
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos', 'photos', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existant
DROP POLICY IF EXISTS "Public read photos" ON storage.objects;

-- Lecture publique des photos
CREATE POLICY "Public read photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'photos');

-- ============================================================================
-- 8. REALTIME — pour live dashboard
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE stats_counters;

-- ============================================================================
-- 9. SEED — données initiales
-- ============================================================================

-- Mot de passe admin (placeholder, à changer dans Studio plus tard)
INSERT INTO app_secrets (key, value) VALUES ('admin_password', 'quadral2026');

-- 16 directeurs Quadral
INSERT INTO profiles (type, name, title, description, email, phone, tags, stats, image_url, sort_order) VALUES
('profile', 'Clément HENNEQUIN',
 'Directeur du pôle services aux Institutionnels - Quadral',
 'Spécialiste de l''accompagnement et de l''optimisation de la stratégie des bailleurs sociaux',
 'clement.hennequin@quadral.fr', '06.43.28.50.27',
 ARRAY['Vente en Bloc', 'Stratégie d''immobilier d''entreprise', 'Optimisation baux tertiaires'],
 '[{"number":"3,3 Mio €","subtitle":"de chiffre d''affaires bloc en 2024"},{"number":"+1.000","subtitle":"lots vendus en bloc par an"}]'::jsonb,
 'ClementHennequin.jpg', 10),

('profile', 'Kamel AOUDIA',
 'Président - Quadral',
 'Disponible pour répondre à toutes vos questions, quel que soit le sujet.',
 'kamel.aoudia@quadral.fr', '06.48.18.82.00',
 ARRAY[]::text[],
 '[{"number":"85 Mio €","subtitle":"de chiffre d''affaires en 2024"},{"number":"2.500","subtitle":"transactions par an en primo-accession"},{"number":"56.000","subtitle":"biens gérés"},{"number":"250","subtitle":"logements neufs livrés chaque année"}]'::jsonb,
 'KamelAoudia.jpg', 20),

('profile', 'Benoit ARWEILER',
 'Directeur Général - Quadral E-Services',
 'Spécialiste des projets numériques sur-mesure pour l''immobilier, il donne de la valeur à vos données pour guider vos décisions.',
 'benoit.arweiler@quadral.fr', '06.79.27.55.37',
 ARRAY['Enquêtes OPS-SLS', 'IA', 'Solutions numériques', 'Pilotage des diagnostics'],
 '[{"number":"79.099","subtitle":"sondés via les enquêtes OPS/SLS en 2025"},{"number":"+4.300","subtitle":"résidences cartographiées (Audit Diagnostic)"},{"number":"70","subtitle":"résidences neuves mises en ligne sur MLEAB"},{"number":"10.500","subtitle":"lots anciens mis en ligne sur MLEEV"}]'::jsonb,
 'BenoitArweiler.jpg', 30),

('profile', 'Yann BECHU',
 'Directeur Général - Quadral Property',
 'Spécialiste de la gestion et du syndic, il met en oeuvre votre stratégie patrimoniale.',
 'yann.bechu@quadral.fr', '06.85.81.44.50',
 ARRAY['Gestion LLI', 'Gestion Commerce', 'Syndic'],
 '[{"number":"81","subtitle":"collaborateurs"},{"number":"7.796","subtitle":"lots en gestion locative"},{"number":"16.944","subtitle":"lots de copropriété"}]'::jsonb,
 'YannBechu.jpg', 40),

('profile', 'Hélène-Claire DUPLAT',
 'Directrice Générale - Quadral Expertise',
 'Spécialiste de l''expertise immobilière, elle vous délivre les informations nécessaires pour prendre la bonne décision.',
 'helene-claire.duplat@quadral.fr', '06.85.47.69.30',
 ARRAY['Plan d''arbitrage', 'Evaluation', 'Etude de marché'],
 '[{"number":"9 Mrd €","subtitle":"évalués en 2024."},{"number":"1.000","subtitle":"missions confiées en 2024."},{"number":"près de 100","subtitle":"clients en 2024."}]'::jsonb,
 'HeleneClaireDuplat.jpg', 50),

('profile', 'Pierre BONHOMME',
 'Directeur - Quadral Conseil en financement & Directeur Général Adjoint - Quadral Transactions',
 'Spécialiste de l''accession sociale à la propriété, il vous aide à atteindre vos objectifs de vente en misant sur l''accompagnement du financement.',
 'pierre.bonhomme@quadral.fr', '06.85.31.70.78',
 ARRAY['Courtage en financement', 'Accession Sociale', 'Vente HLM', 'BRS', 'PSLA', 'VEFA'],
 '[{"number":"2.000","subtitle":"ventes effectuées à l''année"},{"number":"20%","subtitle":"de refus de prêts en moins"},{"number":"+2.000","subtitle":"acquéreurs accompagnés au financement en 2024"}]'::jsonb,
 'PierreBonhomme.jpg', 60),

('profile', 'Maud GRANDJEAN',
 'Directrice Générale Adjointe - Quadral Transactions',
 'Spécialiste de la vente HLM, elle vous aide à atteindre vos objectifs de vente en misant sur une administration des ventes performante.',
 'maud.grandjean@quadral.fr', '06.60.03.27.69',
 ARRAY['Vente HLM', 'BRS', 'Administration des ventes'],
 '[{"number":"2.000","subtitle":"ventes effectuées à l''année"},{"number":"14","subtitle":"ans d''expérience."}]'::jsonb,
 'MaudGrandjean.jpg', 70),

('profile', 'Alexis RIGNY',
 'Directeur des Activités - Quadral Immobilier d''Entreprise',
 'Spécialiste de l''immobilier tertiaire, il vous aide à mieux appréhender votre patrimoine pour en faire un atout stratégique et rentable.',
 'Alexis.rigny@quadral.fr', '06.71.28.54.09',
 ARRAY['Commerces', 'Bureaux', 'Négociation', 'Analyse', 'Optimisation'],
 '[{"number":"+7.500 m2","subtitle":"de bureaux et commerces loués au cours des 3 dernières années"},{"number":"25 missions","subtitle":"d''analyse de patrimoine tertiaire et commercial au cours des 3 dernières années"}]'::jsonb,
 'AlexiRigny.jpg', 80),

('profile', 'Christelle HOUPERT',
 'Directrice Générale Déléguée - Quadral Property',
 'Spécialiste de la gestion et du syndic, elle met en oeuvre votre stratégie patrimoniale.',
 'christelle.houpert@quadral.fr', '06.83.08.22.53',
 ARRAY['Gestion LLI', 'Gestion Commerce', 'Syndic'],
 '[{"number":"+20.000","subtitle":"lots gérés en Syndic HLM"}]'::jsonb,
 'ChristelleHoupert.jpg', 90),

('profile', 'Sonia LANDOULSI',
 'Directrice du pôle Patrimoine, Projets et Construction - Quadral',
 'Spécialiste de l''immobilier résidentiel et tertiaire : Transformation, réhabilitation ou construction. Elle vous offre un accompagnement sur-mesure pour réaliser vos projets.',
 'sonia.landoulsi@quadral.fr', '06.61.61.51.55',
 ARRAY['Promotion', 'AMO', 'Réhabilitation', 'Transformation d''usage'],
 '[{"number":"220","subtitle":"logements livrés en 2024"}]'::jsonb,
 'SoniaLandoulsi.jpg', 100),

('profile', 'Christelle DIQUERO',
 'Directrice - Quadral Ingénierie Immobilière',
 'Spécialiste de l''assistance à maîtrise d''ouvrage, elle vous accompagne de la consultation des entreprises à la livraison du projet.',
 'christelle.diquero@quadral.fr', '06.33.40.57.67',
 ARRAY['AMO', 'Gestion de projet', 'Résidentiel', 'Bureaux'],
 '[{"number":"1.500","subtitle":"logements livrés (2024/2025) : un accompagnement a la bonne exécution."},{"number":"8.000 m2","subtitle":"de bureaux transformés (2024/2025) : efficacité & confort au cœur du tertiaire."},{"number":"1.000","subtitle":"logements réhabilités(2024/2025)  : valoriser l''existant, construire l''avenir."},{"number":"7","subtitle":"projets en conception-réalisation : une maîtrise intégrale, de l''idée au concret."}]'::jsonb,
 'ChristelleDiquero.jpg', 110),

('profile', 'Ludovic MOREL',
 'Directeur - Quadral Promotion',
 'Spécialiste du résidentiel HLM et tertiaire, il vous accompagne dans vos projets de promotion innovants et complexes.',
 'ludovic.morel@quadral.fr', '07.87.09.89.24',
 ARRAY['Promotion', 'Transformation d''usage', 'Résidentiel', 'Tertiaire'],
 '[{"number":"220","subtitle":"logements livrés en 2024."},{"number":"50%","subtitle":"de transformation de bureaux en logements."},{"number":"5","subtitle":"le nombre de régions ou nous sommes implantés."},{"number":"100%","subtitle":"de nos programmes labellisés au delà des exigences réglementaires."}]'::jsonb,
 'LudovicMorel.jpg', 120),

('profile', 'Chadia BENSAID',
 'Directrice Commerciale IDF - Quadral Transactions',
 'Spécialiste de la vente HLM sur le territoire Ile-de-France, Elle met tout en oeuvre pour atteindre vos objectifs de vente.',
 'chadia.bensaid@quadral.fr', '06.31.83.56.17',
 ARRAY['Vente HLM', 'Ile-de-France'],
 '[{"number":"17 ans","subtitle":"d''expérience dans la vente HLM"},{"number":"450","subtitle":"lots vendus en 2024 sous sa direction."}]'::jsonb,
 'ChadiaBensaid.jpg', 130),

('profile', 'Alain CHARBONNIER',
 'Directeur Commercial Sud - Quadral Transactions',
 'Spécialiste de la vente HLM sur le territoire Sud, Elle met tout en oeuvre pour atteindre vos objectifs de vente.',
 'alain.charbonnier@quadral.fr', '06.12.16.35.81',
 ARRAY['Vente HLM', 'Occitanie', 'PACA', 'Auvergne-Rhône-Alpes'],
 '[{"number":"36 ans","subtitle":"d''expérience dans la vente HLM"},{"number":"620","subtitle":"lots vendus en 2024 sous sa direction."}]'::jsonb,
 'AlainCharbonnier.jpg', 140),

('profile', 'Kéo ENG LAURANT',
 'Responsable du pôle étude de marché - Quadral Expertise',
 'Spécialiste des études de marché en immobilier neuf : elle sait déterminer le bon produit, au bon prix, à destination d''acquéreurs ciblés.',
 'keo.eng@quadral.fr', '06.43.89.15.08',
 ARRAY['Étude de marché', 'BRS', 'PSLA', 'VEFA', 'Vente HLM', 'LLI'],
 '[{"number":"+400","subtitle":"études de marchés réalisées en 2025 (territoire observé à l''échelle nationale dont une majorité en Île-de-France, le Nord-Est et Grand Ouest."}]'::jsonb,
 'KeoHang.jpg', 150),

('profile', 'Audrey SARACCA',
 'Directrice Générale des Services Support - Quadral',
 'Spécialiste de l''accompagnement des OFS et des bailleurs dans leur stratégie de vente.',
 'Audrey.saracca@quadral.fr', '06.74.60.19.89',
 ARRAY['Commercialisation', 'OFS'],
 '[{"number":"20 ans","subtitle":"d''expérience auprès des bailleurs sociaux."},{"number":"2","subtitle":"le nombre d''OFS créés."},{"number":"10","subtitle":"webinaires organisés en 2025."}]'::jsonb,
 'AudreySaracca.jpg', 160);

-- 2 pubs
INSERT INTO profiles (type, name, image_url, logo_url, cta_url, cta_label, sort_order) VALUES
('pub', 'BRS', 'brs.jpg', 'brs_logo.svg',
 'https://www.toutsurlebrs.fr', 'Voir', 170),

('pub', 'Landing', 'landing.jpg', 'landing.svg',
 'https://congres-hlm.quadral.fr/?utm_source=AppQM&utm_medium=pub&utm_id=QMatch', 'Voir', 180);

-- ============================================================================
-- FIN
-- ============================================================================
-- Vérifier que tout est bon :
--   SELECT id, type, name, dashboard_token IS NOT NULL AS has_token FROM profiles ORDER BY sort_order;
--   SELECT COUNT(*) FROM stats_counters;  -- doit être 18
-- ============================================================================
