import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Variables Supabase manquantes. Vérifie .env.local en dev, ou les variables d\'environnement sur Netlify en prod.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

export const photoUrl = (filename) => {
  if (!filename) return '';
  return supabase.storage.from('photos').getPublicUrl(filename).data.publicUrl;
};
