// Edge Function: redeem_invite (DEVELOPMENT.md §7.2). Atomic, security-definer style.
// Validates the invite, binds the parent to the student, marks the invite used, and ensures
// the conversation exists. Runs with the service-role key but authenticates the caller via
// their JWT so parent_id is trustworthy.
//
// POST /functions/v1/redeem_invite  body: { code, displayName, relation? }
// returns: { studentId, classId }

// @ts-expect-error Deno remote import — resolved by the Supabase Edge runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// @ts-expect-error Deno global — available in the Edge runtime.
const env = Deno.env;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// @ts-expect-error Deno global
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = env.get('SUPABASE_URL')!;
  const serviceKey = env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = env.get('SUPABASE_ANON_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  // Identify the caller from their JWT.
  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await asUser.auth.getUser();
  if (userErr || !user) return json({ error: 'unauthorized' }, 401);

  let body: { code?: string; displayName?: string; relation?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const code = (body.code ?? '').trim();
  const displayName = (body.displayName ?? '').trim();
  if (!code) return json({ error: 'missing_code' }, 400);

  const admin = createClient(url, serviceKey);

  // 1) Validate invite: exists, not used, not expired, has a student.
  const { data: invite, error: invErr } = await admin
    .from('invites')
    .select('id, class_id, student_id, used_at, expires_at')
    .eq('code', code)
    .maybeSingle();
  if (invErr) return json({ error: 'lookup_failed' }, 500);
  if (!invite) return json({ error: 'invalid_code' }, 404);
  if (invite.used_at) return json({ error: 'code_used' }, 409);
  if (invite.expires_at && new Date(invite.expires_at) < new Date())
    return json({ error: 'code_expired' }, 410);
  if (!invite.student_id) return json({ error: 'invite_has_no_student' }, 422);

  // 2) Ensure a profile row exists WITHOUT clobbering an existing role (the signup trigger
  //    already sets role=parent for new accounts; never downgrade an existing teacher).
  await admin.from('profiles').upsert(
    {
      id: user.id,
      role: 'parent',
      display_name: displayName || (user.email ?? 'Parent'),
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (displayName) {
    await admin.from('profiles').update({ display_name: displayName }).eq('id', user.id);
  }

  // 3) Create the guardianship (idempotent on unique (student_id, parent_id)).
  const { error: gErr } = await admin.from('guardianships').upsert(
    {
      student_id: invite.student_id,
      parent_id: user.id,
      relation: body.relation ?? null,
    },
    { onConflict: 'student_id,parent_id' },
  );
  if (gErr) return json({ error: 'bind_failed', detail: gErr.message }, 500);

  // 4) Mark the invite used (guard against a race: only if still unused).
  const { error: uErr } = await admin
    .from('invites')
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq('id', invite.id)
    .is('used_at', null);
  if (uErr) return json({ error: 'mark_used_failed' }, 500);

  // 5) Ensure a conversation row for this class+student.
  await admin
    .from('conversations')
    .upsert(
      { class_id: invite.class_id, student_id: invite.student_id },
      { onConflict: 'class_id,student_id' },
    );

  return json({ studentId: invite.student_id, classId: invite.class_id });
});
