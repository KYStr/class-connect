import { supabase } from '@/lib/supabase';

type InviteRow = {
  id: string;
  code: string;
  student_id: string | null;
  used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

export interface Invite {
  id: string;
  code: string;
  studentId: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

function toInvite(r: InviteRow): Invite {
  return {
    id: r.id,
    code: r.code,
    studentId: r.student_id,
    usedAt: r.used_at,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at,
  };
}

// Short, unambiguous code (no 0/O/1/I). DEVELOPMENT.md §7.1.
function genCode(len = 8): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

/** Create a family invite; revokes any previous active invite for the same student. */
export async function createInvite(input: {
  classId: string;
  studentId: string;
  expiresAt?: string;
}): Promise<Invite> {
  const { data: userData } = await supabase.auth.getUser();
  const createdBy = userData.user?.id;
  if (!createdBy) throw new Error('Not authenticated');

  const now = new Date().toISOString();
  const { error: revokeErr } = await supabase
    .from('invites')
    .update({ revoked_at: now })
    .eq('student_id', input.studentId)
    .is('revoked_at', null);
  if (revokeErr) throw revokeErr;

  const { data, error } = await supabase
    .from('invites')
    .insert({
      class_id: input.classId,
      student_id: input.studentId,
      code: genCode(),
      created_by: createdBy,
      ...(input.expiresAt ? { expires_at: input.expiresAt } : {}),
    })
    .select('id, code, student_id, used_at, expires_at, revoked_at')
    .single();
  if (error) throw error;
  return toInvite(data as InviteRow);
}

export async function listInvites(classId: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('id, code, student_id, used_at, expires_at, revoked_at')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as InviteRow[]).map(toInvite);
}

/** Active (not revoked) invite per student — latest wins. */
export function activeInviteByStudent(invites: Invite[]): Map<string, Invite> {
  const map = new Map<string, Invite>();
  for (const inv of invites) {
    if (!inv.studentId || inv.revokedAt) continue;
    if (!map.has(inv.studentId)) map.set(inv.studentId, inv);
  }
  return map;
}

/** Parent binding via the atomic security-definer Edge Function (DEVELOPMENT.md §7.2). */
export async function redeemInvite(input: {
  code: string;
  displayName: string;
  relation?: string;
}): Promise<{ studentId: string; classId: string }> {
  const { data, error } = await supabase.functions.invoke('redeem_invite', {
    body: input,
  });
  if (error) throw error;
  return data as { studentId: string; classId: string };
}
