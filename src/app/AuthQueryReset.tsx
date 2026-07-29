import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { del } from 'idb-keyval';
import { useAuth } from '@/app/AuthProvider';

const PERSIST_KEY = 'cc-query-cache';
const LAST_UID_KEY = 'cc-last-uid';

/**
 * Clears TanStack Query + IDB persist when the signed-in user changes.
 * Without this, PersistQueryClientProvider can show the previous account's data
 * until a hard refresh (privacy / correctness bug).
 */
export function AuthQueryReset() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user?.id ?? null;
  const prev = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const next = uid ?? '';
    const stored = localStorage.getItem(LAST_UID_KEY);
    const switchedStored = stored !== null && stored !== next;
    const switchedLive = prev.current !== undefined && prev.current !== uid;

    if (switchedStored || switchedLive) {
      qc.clear();
      void del(PERSIST_KEY);
    }

    localStorage.setItem(LAST_UID_KEY, next);
    prev.current = uid;
  }, [uid, qc]);

  return null;
}
