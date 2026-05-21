import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useSession } from './useSession';

export function useTracking() {
  const sessionId = useSession();

  return useCallback(
    async (profileId, action) => {
      if (!profileId || !action) return;
      try {
        const { error } = await supabase.rpc('increment_stat', {
          p_profile_id: profileId,
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
