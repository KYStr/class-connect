import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, hasSupabaseEnv } from '@/lib/supabase';
import type { Profile, Role } from '@/types/domain';

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  /** P0 preview: pick a role locally when no backend is wired yet */
  previewAs: (role: Role) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PREVIEW_KEY = 'cc_preview_role';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [previewRole, setPreviewRole] = useState<Role | null>(
    () => (localStorage.getItem(PREVIEW_KEY) as Role | null) ?? null,
  );

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load the profile (role, display name) once we have a session.
  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    let active = true;
    // db.ts is a placeholder until `pnpm gen:types` (P1), so cast the row shape here.
    type ProfileRow = { id: string; role: Role; display_name: string; locale: string };
    supabase
      .from('profiles')
      .select('id, role, display_name, locale')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        const row = data as ProfileRow | null;
        if (!active || !row) return;
        setProfile({
          id: row.id,
          role: row.role,
          displayName: row.display_name,
          locale: row.locale,
        });
      });
    return () => {
      active = false;
    };
  }, [session]);

  const previewAs = (role: Role) => {
    localStorage.setItem(PREVIEW_KEY, role);
    setPreviewRole(role);
  };

  const signOut = async () => {
    localStorage.removeItem(PREVIEW_KEY);
    setPreviewRole(null);
    if (hasSupabaseEnv) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    // Cache wipe is handled by AuthQueryReset on uid → null.
  };

  const role: Role | null = profile?.role ?? previewRole;

  const value = useMemo<AuthContextValue>(
    () => ({ loading, session, profile, role, previewAs, signOut }),
    [loading, session, profile, role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
