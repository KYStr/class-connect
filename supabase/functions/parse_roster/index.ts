// Edge Function: parse_roster
// Teacher-only: turn messy pasted roster text into structured { seat, name } rows via OpenAI.
// API key stays in Edge secrets — never exposed to the browser.
//
// POST /functions/v1/parse_roster  body: { text: string }
// returns: { students: [{ seat, name }] }

// @ts-expect-error Deno global — available in the Edge runtime.
const env = Deno.env;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_CHARS = 20_000;
const MODEL = 'gpt-4o-mini';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function normalizeSeat(seat: string): string {
  const t = seat.trim();
  if (/^\d+$/.test(t)) return t.padStart(2, '0');
  return t;
}

// @ts-expect-error Deno global
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = env.get('SUPABASE_URL')!;
  const serviceKey = env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = env.get('SUPABASE_ANON_KEY')!;
  const openaiKey = env.get('OPENAI_API_KEY');
  if (!openaiKey) return json({ error: 'openai_not_configured' }, 503);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  // 0) Identify caller
  const userRes = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authHeader },
  });
  if (!userRes.ok) return json({ error: 'unauthorized' }, 401);
  const user = (await userRes.json()) as { id: string };
  if (!user?.id) return json({ error: 'unauthorized' }, 401);

  // 1) Teacher only
  const profileRes = await fetch(
    `${url}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  if (!profileRes.ok) return json({ error: 'profile_lookup_failed' }, 500);
  const profiles = (await profileRes.json()) as Array<{ role: string }>;
  if (profiles[0]?.role !== 'teacher') return json({ error: 'forbidden' }, 403);

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const text = (body.text ?? '').trim();
  if (!text) return json({ error: 'missing_text' }, 400);
  if (text.length > MAX_CHARS) return json({ error: 'text_too_long' }, 413);

  const system = [
    'You extract Taiwan elementary-school class roster rows from messy pasted text or CSV/TSV.',
    'Return JSON only: {"students":[{"seat":"01","name":"小明"}]}',
    'Rules:',
    '- seat: prefer 座號 / No. / #; normalize numeric seats to 2 digits (7 → 07).',
    '- name: student display name only (Chinese or Latin); strip titles like 同學.',
    '- Skip empty lines, headers (姓名/座號/班級), and rows without both seat and name.',
    '- One student per row; keep input order; do not invent students.',
    '- If a line has only a name and a clear sequential number is implied, still require an explicit seat — skip ambiguous lines.',
  ].join('\n');

  const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text.slice(0, MAX_CHARS) },
      ],
    }),
  });

  if (!oaRes.ok) {
    const detail = await oaRes.text();
    return json({ error: 'openai_failed', detail: detail.slice(0, 500) }, 502);
  }

  const oaJson = (await oaRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = oaJson.choices?.[0]?.message?.content ?? '';
  let parsed: { students?: Array<{ seat?: string; name?: string }> };
  try {
    parsed = JSON.parse(content) as typeof parsed;
  } catch {
    return json({ error: 'bad_model_json' }, 502);
  }

  const seen = new Set<string>();
  const students: Array<{ seat: string; name: string }> = [];
  for (const row of parsed.students ?? []) {
    const seat = normalizeSeat(String(row.seat ?? ''));
    const name = String(row.name ?? '').trim();
    if (!seat || !name) continue;
    if (seen.has(seat)) continue;
    seen.add(seat);
    students.push({ seat, name });
  }

  return json({ students });
});
