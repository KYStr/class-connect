import type { ReactNode } from 'react';
import type { Message, Role } from '@/types/domain';
import { buildChatRows } from '@/lib/chatDisplay';

/** Shared chat transcript: centered stamps only on gaps; no per-bubble times. */
export function ChatThread({
  messages,
  selfRole,
  empty,
}: {
  messages: Message[];
  selfRole: Role;
  empty?: ReactNode;
}) {
  if (messages.length === 0) return <>{empty}</>;

  const rows = buildChatRows(messages, selfRole);

  return (
    <>
      {rows.map((row) => {
        if (row.kind === 'stamp') {
          return (
            <div key={row.key} className="msg-stamp">
              {row.label}
            </div>
          );
        }
        const cls = [
          'msg-b',
          row.side,
          row.teacherTone ? 't' : '',
          row.stacked ? 'stacked' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div key={row.key} className={cls}>
            {row.text}
          </div>
        );
      })}
    </>
  );
}
