// Edge Function: redeem_invite (DEVELOPMENT.md §7.2). Atomic, security-definer style.
// Validates the invite, binds the parent to the student, marks the invite used, and ensures
// the conversation exists. Authenticates the caller via their JWT so parent_id is trustworthy.
//
// Implemented with plain fetch against Auth + PostgREST (no remote imports) so the isolate
// boots instantly — importing supabase-js from a CDN cold-starts too slowly and gets killed.
//
// POST /functions/v1/redeem_invite  body: { code, displayName, relation? }
// returns: { studentId, classId }

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

  // Service-role REST helper.
  const rest = (path: string, init: RequestInit = {}) =>
    fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

  // 0) Identify the caller from their JWT.
  const userRes = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authHeader },
  });
  if (!userRes.ok) return json({ error: 'unauthorized' }, 401);
  const user = (await userRes.json()) as { id: string; email?: string };
  if (!user?.id) return json({ error: 'unauthorized' }, 401);

  let body: { code?: string; displayName?: string; relation?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const code = (body.code ?? '').trim();
  const displayName = (body.displayName ?? '').trim();
  if (!code) return json({ error: 'missing_code' }, 400);

  // 1) Validate invite.
  const invRes = await rest(
    `invites?code=eq.${encodeURIComponent(code)}&select=id,class_id,student_id,used_at,expires_at`,
  );
  if (!invRes.ok) return json({ error: 'lookup_failed' }, 500);
  const invite = ((await invRes.json()) as Array<{
    id: string;
    class_id: string;
    student_id: string | null;
    used_at: string | null;
    expires_at: string | null;
  }>)[0];
  if (!invite) return json({ error: 'invalid_code' }, 404);
  if (invite.used_at) return json({ error: 'code_used' }, 409);
  if (invite.expires_at && new Date(invite.expires_at) < new Date())
    return json({ error: 'code_expired' }, 410);
  if (!invite.student_id) return json({ error: 'invite_has_no_student' }, 422);

  // 2) Ensure a profile row exists WITHOUT clobbering an existing role.
  await rest('profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({
      id: user.id,
      role: 'parent',
      display_name: displayName || user.email || 'Parent',
    }),
  });
  if (displayName) {
    await rest(`profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ display_name: displayName }),
    });
  }

  // 3) Create the guardianship (idempotent on unique (student_id, parent_id)).
  const gRes = await rest('guardianships?on_conflict=student_id,parent_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      student_id: invite.student_id,
      parent_id: user.id,
      relation: body.relation ?? null,
    }),
  });
  if (!gRes.ok) return json({ error: 'bind_failed', detail: await gRes.text() }, 500);

  // 4) Mark the invite used (guard against a race: only if still unused).
  await rest(`invites?id=eq.${invite.id}&used_at=is.null`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ used_at: new Date().toISOString(), used_by: user.id }),
  });

  // 5) Ensure a conversation row for this class+student.
  await rest('conversations?on_conflict=class_id,student_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ class_id: invite.class_id, student_id: invite.student_id }),
  });

  return json({ studentId: invite.student_id, classId: invite.class_id });
});
