import { useEffect, useRef, useState } from 'react';
import { ChatThread, useToast } from '@/ui';
import {
  useConversation,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
  useTeacherInbox,
} from '@/hooks/useMessages';

type Mode = 'closed' | 'list' | 'chat';

/** FB-style floating messenger for teachers (SPEC L8 — keep DMs secondary). */
export function TeacherMessengerDock({
  classId,
  openSignal = 0,
}: {
  classId: string | undefined;
  /** Increment to force-open the dock (e.g. from overview todo). */
  openSignal?: number;
}) {
  const { toast } = useToast();
  const { data: inbox = [] } = useTeacherInbox(classId);
  const [mode, setMode] = useState<Mode>('closed');
  const [studentId, setStudentId] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const [text, setText] = useState('');
  const prevUnread = useRef(0);
  const unreadPrimed = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const totalUnread = inbox.reduce((n, t) => n + t.unread, 0);
  const active = inbox.find((t) => t.studentId === studentId);
  const { data: conv } = useConversation(classId, studentId);
  const { data: messages, isLoading } = useMessages(mode === 'chat' ? conv?.id : undefined);
  const send = useSendMessage(conv?.id, 'teacher');
  const { mutate: markReadMutate } = useMarkConversationRead(classId);

  useEffect(() => {
    if (openSignal > 0) setMode((m) => (m === 'closed' ? 'list' : m));
  }, [openSignal]);

  // Pop open only when unread *increases* after the first fetch (new parent message).
  useEffect(() => {
    if (!unreadPrimed.current) {
      unreadPrimed.current = true;
      prevUnread.current = totalUnread;
      return;
    }
    if (totalUnread > prevUnread.current && mode === 'closed') {
      setMode('list');
    }
    prevUnread.current = totalUnread;
  }, [totalUnread, mode]);

  useEffect(() => {
    if (mode !== 'chat' || !conv?.id) return;
    markReadMutate(conv.id);
  }, [mode, conv?.id, markReadMutate]);

  useEffect(() => {
    const el = wrapRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, mode]);

  if (!classId) return null;

  // Only float when there are unreplied parent messages, or the dock is already open.
  if (mode === 'closed' && totalUnread === 0) return null;

  const filtered = inbox.filter((t) => {
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return t.studentName.toLowerCase().includes(s) || t.seat.includes(s);
  });

  const openThread = (sid: string) => {
    setStudentId(sid);
    setMode('chat');
    setText('');
  };

  const onSend = () => {
    if (!text.trim()) return;
    send.mutate(text, {
      onSuccess: () => setText(''),
      onError: (e) => toast(e instanceof Error ? e.message : '傳送失敗'),
    });
  };

  if (mode === 'closed') {
    return (
      <button
        type="button"
        className="msg-dock-fab"
        aria-label="家長訊息"
        onClick={() => setMode('list')}
      >
        💬
        {totalUnread > 0 && <span className="msg-dock-badge">{totalUnread > 9 ? '9+' : totalUnread}</span>}
      </button>
    );
  }

  return (
    <div className="msg-dock">
      <div className="msg-dock-head">
        {mode === 'chat' ? (
          <>
            <button type="button" className="msg-dock-nav" onClick={() => setMode('list')}>
              ←
            </button>
            <div className="msg-dock-title">
              {active ? `${active.seat} ${active.studentName}` : '對話'}
              <small>回覆時間 {conv?.officeHours ?? '—'}</small>
            </div>
          </>
        ) : (
          <div className="msg-dock-title">
            家長訊息
            <small>有事再私訊 · 平常用公告／聯絡簿</small>
          </div>
        )}
        <button type="button" className="msg-dock-nav" onClick={() => setMode('closed')} aria-label="收起">
          ✕
        </button>
      </div>

      {mode === 'list' && (
        <>
          <input
            className="msg-dock-search"
            placeholder="搜尋座號或姓名…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="msg-dock-list">
            {filtered.length === 0 ? (
              <div className="msg-dock-empty">找不到學生</div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.studentId}
                  type="button"
                  className="msg-dock-row"
                  onClick={() => openThread(t.studentId)}
                >
                  <div className="msg-dock-ava">{t.seat}</div>
                  <div className="msg-dock-meta">
                    <div className="msg-dock-name">
                      {t.studentName}
                      {t.unread > 0 && <span className="msg-dock-dot">{t.unread}</span>}
                    </div>
                    <div className="msg-dock-preview">
                      {t.lastText ?? '尚無訊息 · 點此開始'}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {mode === 'chat' && (
        <div className="msg-dock-chat">
          <div className="chat-wrap msg-dock-scroll" ref={wrapRef}>
            {isLoading || !conv ? (
              <div className="msg-dock-empty">載入中…</div>
            ) : (
              <ChatThread
                messages={messages ?? []}
                selfRole="teacher"
                empty={<div className="msg-dock-empty">跟家長打個招呼吧</div>}
              />
            )}
          </div>
          <div className="send msg-dock-send">
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
      )}
    </div>
  );
}
