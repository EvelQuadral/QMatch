import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useSession } from './useSession';

const PUB_PREFIX = 'pub:';

/**
 * Enregistre une action visiteur dans Supabase.
 *
 * Deux familles d'entrées coexistent dans le deck, avec deux compteurs distincts :
 *
 *  • Les PROFILS viennent de la table `profiles` et ont un id numérique.
 *    → RPC increment_stat(profile_id BIGINT, action, session)
 *    → actions : like | pass | details | vcard
 *
 *  • Les PUBS viennent de /public/pubs/pubs.json (statique, aucune ligne en base)
 *    et ont un id texte "pub:<clé>".
 *    → RPC increment_pub_stat(pub_key TEXT, action, session)
 *    → actions : like | pass | pub_click
 *
 * Le tracking est volontairement "fire and forget" : une erreur réseau ne doit
 * jamais bloquer ni ralentir le swipe. On loggue en console, on n'affiche rien.
 */
export function useTracking() {
  const sessionId = useSession();

  return useCallback(
    async (entryId, action) => {
      if (!entryId || !action) return;

      const id = String(entryId);

      try {
        if (id.startsWith(PUB_PREFIX)) {
          const pubKey = id.slice(PUB_PREFIX.length);
          if (!pubKey) return;
          const { error } = await supabase.rpc('increment_pub_stat', {
            p_pub_key: pubKey,
            p_action: action,
            p_session_id: sessionId,
          });
          if (error) console.warn('Tracking pub failed:', error.message);
          return;
        }

        // Garde-fou : la RPC profil exige un BIGINT
        if (!/^\d+$/.test(id)) {
          console.warn('Tracking ignoré, id non reconnu:', id);
          return;
        }

        const { error } = await supabase.rpc('increment_stat', {
          p_profile_id: Number(id),
          p_action: action,
          p_session_id: sessionId,
        });
        if (error) console.warn('Tracking failed:', error.message);
      } catch (err) {
        console.warn('Tracking error:', err);
      }
    },
    [sessionId]
  );
}
