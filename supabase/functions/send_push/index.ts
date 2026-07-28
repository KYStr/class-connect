// Edge Function: send_push (DEVELOPMENT.md §11).
// POST /functions/v1/send_push
// body: { profileIds: string[], title: string, body: string, url: string }
//
// Uses npm:web-push + VAPID keys. Auth: service role OR authenticated user JWT.

// @ts-expect-error Deno npm specifier — resolved in Edge runtime.
import webpush from 'npm:web-push@3.6.7';

// @ts-expect-error Deno global
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
  const vapidPublic = env.get('VAPID_PUBLIC_KEY') ?? env.get('VITE_VAPID_PUBLIC_KEY');
  const vapidPrivate = env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = env.get('VAPID_SUBJECT') ?? 'mailto:classconnect@local';

  if (!vapidPublic || !vapidPrivate) {
    return json({ error: 'vapid_not_configured' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  // Allow service role or any signed-in user (frontend invoke after mutations).
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (token !== serviceKey) {
    const userRes = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authHeader },
    });
    if (!userRes.ok) return json({ error: 'unauthorized' }, 401);
  }

  let body: { profileIds?: string[]; title?: string; body?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const profileIds = (body.profileIds ?? []).filter(Boolean);
  const title = (body.title ?? '').trim() || '班級連';
  const text = (body.body ?? '').trim();
  const link = (body.url ?? '/').trim() || '/';
  if (profileIds.length === 0) return json({ sent: 0 });

  const rest = (path: string, init: RequestInit = {}) =>
    fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(init.headers ?? {}),
      },
    });

  const inList = `(${profileIds.map((id) => `"${id}"`).join(',')})`;
  const subRes = await rest(
    `push_subscriptions?profile_id=in.${inList}&select=id,endpoint,p256dh,auth`,
  );
  if (!subRes.ok) return json({ error: 'lookup_failed' }, 500);
  const subs = (await subRes.json()) as Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>;

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const payload = JSON.stringify({ title, body: text, url: link });

  let sent = 0;
  const stale: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
        );
        sent += 1;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) stale.push(s.id);
      }
    }),
  );

  if (stale.length > 0) {
    const staleIn = `(${stale.map((id) => `"${id}"`).join(',')})`;
    await rest(`push_subscriptions?id=in.${staleIn}`, { method: 'DELETE' });
  }

  return json({ sent, total: subs.length });
});
