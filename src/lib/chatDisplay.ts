import type { Message, Role } from '@/types/domain';

/** Minutes of silence before we show a centered time divider (IG / Messenger style). */
const GAP_MINUTES = 8;

export function formatChatStamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  const date = d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' });
  return `${date} ${time}`;
}

export type ChatRow =
  | { kind: 'stamp'; key: string; label: string }
  | {
      kind: 'msg';
      key: string;
      text: string;
      side: 'in' | 'out';
      teacherTone: boolean;
      stacked: boolean;
    };

/** Build display rows: timestamp only when discontinuous; stack consecutive same-sender. */
export function buildChatRows(
  messages: Message[],
  /** Who is "me" in this view — their messages go to the right (out). */
  selfRole: Role,
): ChatRow[] {
  const rows: ChatRow[] = [];
  let prev: Message | undefined;

  for (const m of messages) {
    const gapMs = prev ? new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() : Infinity;
    const showStamp = !prev || gapMs > GAP_MINUTES * 60_000;
    if (showStamp) {
      rows.push({ kind: 'stamp', key: `t-${m.id}`, label: formatChatStamp(m.createdAt) });
    }
    const side: 'in' | 'out' = m.senderRole === selfRole ? 'out' : 'in';
    const stacked = Boolean(prev && !showStamp && prev.senderRole === m.senderRole);
    rows.push({
      kind: 'msg',
      key: m.id,
      text: m.text,
      side,
      teacherTone: m.senderRole === 'teacher' && side === 'out',
      stacked,
    });
    prev = m;
  }
  return rows;
}
