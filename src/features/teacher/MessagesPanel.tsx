import { useState } from 'react';
import { ChatThread, EmptyState, GhostButton, useToast } from '@/ui';
import { useRoster } from '@/hooks/useClasses';
import { useConversation, useMessages, useSendMessage } from '@/hooks/useMessages';

/** Legacy full-page chat; prefer TeacherMessengerDock. Kept for parity. */
export function MessagesPanel({
  classId,
  onBack,
}: {
  classId: string | undefined;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const { data: roster } = useRoster(classId);
  const [studentId, setStudentId] = useState<string | undefined>(undefined);
  const student = roster?.find((s) => s.id === studentId) ?? roster?.[0];
  const activeId = studentId ?? student?.id;
  const { data: conv } = useConversation(classId, activeId);
  const { data: messages, isLoading } = useMessages(conv?.id);
  const send = useSendMessage(conv?.id, 'teacher');
  const [text, setText] = useState('');

  if (!classId) return <EmptyState>請先建立班級</EmptyState>;
  if (!roster || roster.length === 0) return <EmptyState>請先加入學生</EmptyState>;

  const onSend = () => {
    if (!text.trim()) return;
    send.mutate(text, {
      onSuccess: () => setText(''),
      onError: (e) => toast(e instanceof Error ? e.message : '傳送失敗'),
    });
  };

  return (
    <>
      <GhostButton onClick={onBack}>← 返回總覽</GhostButton>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {roster.map((s) => (
          <button
            key={s.id}
            type="button"
            className="tmpl"
            style={{
              flex: '0 0 auto',
              background: s.id === activeId ? 'var(--accent-soft)' : undefined,
            }}
            onClick={() => setStudentId(s.id)}
          >
            {s.seat} {s.name}
          </button>
        ))}
      </div>
      <div className="chat-shell">
        <div className="chat-note">
          與 {student?.name ?? '學生'} 家長 · 回覆時間 {conv?.officeHours ?? '—'}
        </div>
        <div className="chat-wrap">
          {isLoading || !conv ? (
            <EmptyState>載入訊息…</EmptyState>
          ) : (
            <ChatThread
              messages={messages ?? []}
              selfRole="teacher"
              empty={<EmptyState icon="💬">還沒有訊息</EmptyState>}
            />
          )}
        </div>
        <div className="send">
          <input
            className="in"
            placeholder="回覆家長…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSend();
            }}
          />
          <button type="button" className="sendbtn t" onClick={onSend} disabled={send.isPending}>
            ➤
          </button>
        </div>
      </div>
    </>
  );
}
