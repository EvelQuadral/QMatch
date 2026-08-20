import { useState, useEffect, useCallback } from 'react';
import { supabase, photoUrl } from '../lib/supabase';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function useDirectors() {
  const [deck, setDeck] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildDeck = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Profils depuis Supabase (uniquement type='profile')
      const { data: profiles, error: err } = await supabase
        .from('profiles')
        .select(
          'id, type, name, title, description, email, phone, tags, stats, image_url, sort_order'
        )
        .eq('type', 'profile')
        .eq('active', true)
        .order('sort_order');

      if (err) throw err;

      const profilesWithUrls = (profiles || []).map((p) => ({
        ...p,
        type: 'profile',
        image_full_url: photoUrl(p.image_url),
      }));

      // 2. Pubs depuis /pubs/pubs.json (statique)
      let pubs = [];
      try {
        const res = await fetch('/pubs/pubs.json');
        if (res.ok) {
          const json = await res.json();
          pubs = (json.pubs || []).map((p) => ({
            // ID synthétique préfixé "pub:" pour ne pas collisionner avec les
            // IDs Supabase (des BIGINT). Le préfixe sert aussi d'aiguillage
            // dans useTracking() vers la RPC increment_pub_stat.
            // La clé vient de pubs.json (`key`, sinon `name`) et NON de l'index :
            // réordonner les pubs dans le fichier ne casse pas l'historique de stats.
            id: `pub:${p.key || p.name}`,
            pub_key: p.key || p.name,
            type: 'pub',
            name: p.name,
            image_url: p.image || null,
            logo_url: p.logo || null,
            cta_url: p.url,
            cta_label: p.label || 'Voir',
            display_title: p.display_title || p.name,
            subtitle: p.subtitle || null,
            description: p.description || null,
            image_full_url: p.image ? `/pubs/${p.image}` : null,
            logo_full_url: p.logo ? `/pubs/${p.logo}` : null,
          }));
        }
      } catch (e) {
        console.warn('Impossible de charger pubs.json:', e);
      }

      const combined = shuffle([...profilesWithUrls, ...pubs]);
      setDeck(combined);
      setError(null);
    } catch (err) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buildDeck();
  }, [buildDeck]);

  return { deck, loading, error, reshuffle: buildDeck };
}
