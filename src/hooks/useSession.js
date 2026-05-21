import { useState, useEffect } from 'react';

const STORAGE_KEY = 'qmatch_session_id';

export function useSession() {
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    setSessionId(id);
  }, []);

  return sessionId;
}
