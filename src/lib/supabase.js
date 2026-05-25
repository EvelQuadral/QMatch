import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Variables Supabase manquantes. Vérifie .env.local en dev, ou les variables d'environnement sur Netlify en prod."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

/**
 * Résout une URL de photo selon le format de la valeur :
 * - "" / null → ''
 * - URL absolue (http*) → renvoyée telle quelle
 * - Chemin "/xxx" → asset statique servi depuis /public/
 * - Sinon → traité comme un filename dans le bucket Storage Supabase
 */
export const photoUrl = (filename) => {
  if (!filename) return '';
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  if (filename.startsWith('/')) return filename;
  return supabase.storage.from('photos').getPublicUrl(filename).data.publicUrl;
};
