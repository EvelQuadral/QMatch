-- ============================================================================
-- QMatch v2 — Migration cleanup + WebP
-- ============================================================================
-- À EXÉCUTER après setup.sql et 02_feedback.sql.
-- Cette migration :
--   1. Supprime 3 profils (Sonia LANDOULSI, Ludovic MOREL, Christelle DIQUERO)
--   2. Migre les image_url des 13 profils restants vers /Filename.webp
--      (les photos sont servies depuis /public/ statique, plus de Supabase Storage)
--   3. Supprime les 2 entrées pub résiduelles dans profiles (pubs gérées en static désormais)
--
-- Re-exécution : SAFE. Les UPDATE sont idempotents, les DELETE échouent
-- silencieusement si les profils sont déjà supprimés.
-- ============================================================================

-- 1. Suppression des profils (cascade : stats_counters + events.profile_id → NULL)

DELETE FROM profiles WHERE name IN (
  'Sonia LANDOULSI',
  'Ludovic MOREL',
  'Christelle DIQUERO'
);

-- 2. Migration image_url → /Filename.webp pour les profils restants

UPDATE profiles SET image_url = '/AlainCharbonnier.webp' WHERE name = 'Alain CHARBONNIER';
UPDATE profiles SET image_url = '/AlexiRigny.webp'       WHERE name = 'Alexis RIGNY';
UPDATE profiles SET image_url = '/AudreySaracca.webp'    WHERE name = 'Audrey SARACCA';
UPDATE profiles SET image_url = '/BenoitArweiler.webp'   WHERE name = 'Benoit ARWEILER';
UPDATE profiles SET image_url = '/ChadiaBensaid.webp'    WHERE name = 'Chadia BENSAID';
UPDATE profiles SET image_url = '/ChristelleHoupert.webp' WHERE name = 'Christelle HOUPERT';
UPDATE profiles SET image_url = '/ClementHennequin.webp' WHERE name = 'Clément HENNEQUIN';
UPDATE profiles SET image_url = '/HeleneClaireDuplat.webp' WHERE name = 'Hélène-Claire DUPLAT';
UPDATE profiles SET image_url = '/KamelAoudia.webp'      WHERE name = 'Kamel AOUDIA';
UPDATE profiles SET image_url = '/KeoHang.webp'          WHERE name = 'Kéo ENG LAURANT';
UPDATE profiles SET image_url = '/MaudGrandjean.webp'    WHERE name = 'Maud GRANDJEAN';
UPDATE profiles SET image_url = '/PierreBonhomme.webp'   WHERE name = 'Pierre BONHOMME';
UPDATE profiles SET image_url = '/YannBechu.webp'        WHERE name = 'Yann BECHU';

-- 3. Suppression des entrées pub résiduelles (pubs gérées en static dans /public/pubs/)

DELETE FROM profiles WHERE type = 'pub';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
-- Doit retourner 13 lignes, toutes avec image_url commençant par '/' et finissant par '.webp'
-- SELECT name, image_url FROM profiles ORDER BY name;
--
-- Doit retourner 0
-- SELECT COUNT(*) FROM profiles WHERE type = 'pub';
-- ============================================================================
