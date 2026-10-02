// Public ICS feed for a parent's calendar subscription.
// Calendar apps fetch this URL with no JWT, so auth is the unguessable token.
//
// GET /functions/v1/calendar_feed?token=...

// @ts-expect-error Deno global
const env = Deno.env;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function taipeiStamp(date: string, hour: number, minute = 0): string {
  const iso = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`;
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

const TYPE_LABEL: Record<string, string> = {
  exam: '評量',
  activity: '活動',
  fee: '繳費',
  holiday: '放假',
};

// @ts-expect-error Deno global
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  const token = new URL(req.url).searchParams.get('token')?.trim() ?? '';
  if (!token || token.length < 16) return json({ error: 'missing_token' }, 400);

  const url = env.get('SUPABASE_URL')!;
  const serviceKey = env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  const subRes = await fetch(
    `${url}/rest/v1/calendar_subs?token=eq.${encodeURIComponent(token)}&select=class_id,remind_day,remind_time`,
    { headers },
  );
  if (!subRes.ok) return json({ error: 'lookup_failed' }, 500);
  const sub = ((await subRes.json()) as Array<{
    class_id: string;
    remind_day: string;
    remind_time: string;
  }>)[0];
  if (!sub) return json({ error: 'not_found' }, 404);

  const classRes = await fetch(
    `${url}/rest/v1/classes?id=eq.${sub.class_id}&select=name,remind_day,remind_time`,
    { headers },
  );
  const cls = ((await classRes.json()) as Array<{
    name: string;
    remind_day: string;
    remind_time: string;
  }>)[0];

  const evRes = await fetch(
    `${url}/rest/v1/events?class_id=eq.${sub.class_id}&select=id,title,event_date,type,note&order=event_date.asc`,
    { headers },
  );
  const events = (await evRes.json()) as Array<{
    id: string;
    title: string;
    event_date: string;
    type: string;
    note: string | null;
  }>;

  const day =
    sub.remind_day === 'class'
      ? cls?.remind_day === 'prev' || cls?.remind_day === 'none'
        ? cls.remind_day
        : 'same'
      : sub.remind_day === 'prev' || sub.remind_day === 'none'
        ? sub.remind_day
        : 'same';
  const time = (sub.remind_day === 'class' ? cls?.remind_time : sub.remind_time) || '07:00';
  const [hs, ms] = time.split(':');
  const hour = Number(hs);
  const minute = Number(ms);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClassConnect//班級連//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    `X-WR-CALNAME:${esc(cls?.name ? `${cls.name}行事曆` : '班級行事曆')}`,
    'X-WR-TIMEZONE:Asia/Taipei',
  ];

  for (const ev of events ?? []) {
    const date = String(ev.event_date).slice(0, 10);
    const note = ev.note?.trim() ?? '';
    const summary = `${TYPE_LABEL[ev.type] ?? '活動'}｜${ev.title}`;
    const remindLine =
      day === 'none' ? '' : `提醒：${day === 'prev' ? '前一天' : '當天'} ${time}`;
    const description = [note ? `要帶／備註：${note}` : '', remindLine].filter(Boolean).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@class-connect`,
      `DTSTAMP:${taipeiStamp(date, 8)}`,
      `DTSTART;VALUE=DATE:${date.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${shiftDate(date, 1).replace(/-/g, '')}`,
      `SUMMARY:${esc(summary)}`,
    );
    if (description) lines.push(`DESCRIPTION:${esc(description)}`);
    if (day !== 'none') {
      const alarmDate = day === 'prev' ? shiftDate(date, -1) : date;
      const alarm = taipeiStamp(
        alarmDate,
        Number.isFinite(hour) ? hour : 7,
        Number.isFinite(minute) ? minute : 0,
      );
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(note ? `${ev.title}：${note}` : ev.title)}`,
        `TRIGGER;VALUE=DATE-TIME:${alarm}`,
        'END:VALARM',
      );
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
