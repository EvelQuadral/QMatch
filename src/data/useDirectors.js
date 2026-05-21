import { useState, useEffect } from 'react';
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
  const [directors, setDirectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfiles() {
      const { data, error: err } = await supabase
        .from('profiles')
        .select(
          'id, type, name, title, description, email, phone, tags, stats, image_url, logo_url, cta_url, cta_label, sort_order'
        )
        .eq('active', true)
        .order('sort_order');

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      const withFullUrls = (data || []).map((p) => ({
        ...p,
        image_full_url: photoUrl(p.image_url),
        logo_full_url: photoUrl(p.logo_url),
      }));

      setDirectors(shuffle(withFullUrls));
      setLoading(false);
    }

    fetchProfiles();
    return () => {
      cancelled = true;
    };
  }, []);

  const reshuffle = () => setDirectors((d) => shuffle(d));

  return { directors, loading, error, reshuffle };
}
