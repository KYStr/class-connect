import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/db';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Don't crash the P0 shell if env isn't set yet — warn loudly instead.
  // Auth/data calls will fail until .env is filled (see .env.example / DEVELOPMENT.md §4).
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill them in.',
  );
}

export const supabase = createClient<Database>(url ?? 'http://localhost:54321', anonKey ?? 'anon', {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const hasSupabaseEnv = Boolean(url && anonKey);
