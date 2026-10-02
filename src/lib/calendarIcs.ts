import type { CalendarEvent, EventRemind } from '@/types/domain';

const TYPE_LABEL: Record<CalendarEvent['type'], string> = {
  exam: '評量',
  activity: '活動',
  fee: '繳費',
  holiday: '放假',
};

function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Taipei wall time → UTC stamp YYYYMMDDTHHMMSSZ */
function taipeiStamp(date: string, hour: number, minute = 0): string {
  const iso = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`;
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function dateStamp(iso: string): string {
  return iso.replace(/-/g, '');
}

function alarmFromPlan(eventDate: string, day: 'same' | 'prev' | 'none', time: string): string | null {
  if (day === 'none') return null;
  const [hs, ms] = time.split(':');
  const hour = Number(hs);
  const minute = Number(ms);
  const date = day === 'prev' ? shiftDate(eventDate, -1) : eventDate;
  return taipeiStamp(
    date,
    Number.isFinite(hour) ? hour : 7,
    Number.isFinite(minute) ? minute : 0,
  );
}

function legacyPlan(remind: EventRemind): { day: 'same' | 'prev' | 'none'; time: string } {
  if (remind === 'eve') return { day: 'prev', time: '19:00' };
  if (remind === 'none') return { day: 'none', time: '07:00' };
  return { day: 'same', time: '07:00' };
}

export function eventsToIcs(
  events: CalendarEvent[],
  calendarName: string,
  plan?: { day: 'same' | 'prev' | 'none'; time: string },
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClassConnect//班級連//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calendarName)}`,
    'X-WR-TIMEZONE:Asia/Taipei',
  ];

  for (const ev of events) {
    const note = ev.note?.trim();
    const summary = `${TYPE_LABEL[ev.type]}｜${ev.title}`;
    const chosen = plan ?? legacyPlan(ev.remind);
    const description = [
      note ? `要帶／備註：${note}` : '',
      chosen.day === 'none'
        ? ''
        : `提醒：${chosen.day === 'prev' ? '前一天' : '當天'} ${chosen.time}`,
    ]
      .filter(Boolean)
      .join('\n');
    const start = dateStamp(ev.eventDate);
    const end = dateStamp(shiftDate(ev.eventDate, 1));
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@class-connect`,
      `DTSTAMP:${taipeiStamp(ev.eventDate, 8)}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${esc(summary)}`,
    );
    if (description) lines.push(`DESCRIPTION:${esc(description)}`);
    const alarm = alarmFromPlan(ev.eventDate, chosen.day, chosen.time);
    if (alarm) {
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
  return lines.join('\r\n');
}

/** Share or download an .ics file so the phone calendar can import alarms. */
export async function shareCalendarFile(ics: string, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([ics], filename, { type: 'text/calendar' });
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return 'shared';
  }
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
