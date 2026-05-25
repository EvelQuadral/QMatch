import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useSession } from './useSession';

export function useTracking() {
  const sessionId = useSession();

  return useCallback(
    async (profileId, action) => {
      if (!profileId || !action) return;

      // Les pubs ont des IDs string (ex: "pub-0-BRS") et ne sont pas en base.
      // On skip le tracking Supabase (BIGINT required) — les stats pub
      // peuvent être suivies via LinkedIn / Netlify Analytics en externe.
      if (typeof profileId !== 'number' && !/^\d+$/.test(String(profileId))) {
        return;
      }

      try {
        const { error } = await supabase.rpc('increment_stat', {
          p_profile_id: Number(profileId),
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
