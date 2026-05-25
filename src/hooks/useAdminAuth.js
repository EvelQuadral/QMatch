import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'qmatch_admin_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.password || !parsed?.expires) return null;
    if (parsed.expires < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useAdminAuth() {
  const [session, setSession] = useState(() => loadSession());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Re-check session expiration au mount
  useEffect(() => {
    const t = setInterval(() => {
      const s = loadSession();
      if (!s && session) setSession(null);
    }, 60 * 1000);
    return () => clearInterval(t);
  }, [session]);

  const login = useCallback(async (password) => {
    setBusy(true);
    setError('');
    try {
      const { data, error: err } = await supabase.rpc('verify_admin_password', {
        p_password: password,
      });
      if (err) throw err;
      if (data === true) {
        const next = { password, expires: Date.now() + SESSION_TTL_MS };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSession(next);
        return true;
      }
      setError('Mot de passe incorrect');
      return false;
    } catch (err) {
      setError(err.message || 'Erreur réseau');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setError('');
  }, []);

  return {
    password: session?.password || null,
    isAuthed: !!session,
    error,
    busy,
    login,
    logout,
  };
}
