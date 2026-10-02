import { supabase } from '@/lib/supabase';
import type { Role } from '@/types/domain';

// Auth wrappers (DEVELOPMENT.md §7, §17 maps login/logout → supabase.auth).
// Local dev uses email + password (confirmations disabled). Prod may switch to Magic Link.

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Sign up passing role + display_name so the handle_new_user trigger creates the profile. */
export async function signUp(input: {
  email: string;
  password: string;
  role: Role;
  displayName: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { role: input.role, display_name: input.displayName },
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Email a password-reset link. Redirect must be allow-listed in Supabase Auth. */
export async function requestPasswordReset(email: string) {
  // Land on the site root (already the Auth Site URL) so the reset link is allow-listed.
  // The recovery hash is detected on load and the app routes to /reset-password.
  const redirectTo = window.location.origin;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
