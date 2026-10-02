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

function alarmStamp(eventDate: string, remind: EventRemind): string | null {
  if (remind === 'eve') return taipeiStamp(shiftDate(eventDate, -1), 19);
  if (remind === 'morning') return taipeiStamp(eventDate, 7);
  return null;
}

function dateStamp(iso: string): string {
  return iso.replace(/-/g, '');
}

export function eventsToIcs(events: CalendarEvent[], calendarName: string): string {
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
    const description = [
      note ? `要帶／備註：${note}` : '',
      ev.remind === 'morning' ? '提醒：當天早上 7:00' : '',
      ev.remind === 'eve' ? '提醒：前一晚 7:00' : '',
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
    const alarm = alarmStamp(ev.eventDate, ev.remind);
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
