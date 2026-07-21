import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Local Supabase defaults (deterministic dev keys). Override via env for CI/staging.
export const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
export const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const uniq = () => Math.random().toString(36).slice(2, 10);

/** Create a confirmed auth user with role metadata; the trigger creates the profile. */
export async function createUser(
  admin: SupabaseClient,
  role: 'teacher' | 'parent',
  displayName: string,
): Promise<{ id: string; email: string; password: string }> {
  const email = `${role}_${uniq()}@test.local`;
  const password = 'password123';
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, display_name: displayName },
  });
  if (error) throw error;
  return { id: data.user!.id, email, password };
}

/** Sign in as a user and return an RLS-scoped client bound to their session. */
export async function clientFor(email: string, password: string): Promise<SupabaseClient> {
  const c = anonClient();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}
