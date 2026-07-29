import { useEffect, useRef, useState } from 'react';
import { ChatThread, EmptyState, GhostButton, useToast } from '@/ui';
import { useConversation, useMessages, useSendMessage } from '@/hooks/useMessages';

export function ParentMessages({
  classId,
  studentId,
  onBack,
  preview = false,
}: {
  classId: string | undefined;
  studentId: string | undefined;
  onBack: () => void;
  preview?: boolean;
}) {
  const { toast } = useToast();
  const { data: conv, isLoading: loadingConv } = useConversation(classId, studentId);
  const { data: messages, isLoading: loadingMsg } = useMessages(conv?.id);
  const send = useSendMessage(conv?.id, 'parent');
  const [text, setText] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (!classId || !studentId) return <EmptyState>尚未綁定孩子</EmptyState>;
  if (loadingConv) return <EmptyState>載入中…</EmptyState>;
  if (!conv) return <EmptyState>無法開啟對話</EmptyState>;

  const onSend = () => {
    if (preview) {
      toast('預覽模式不可傳訊');
      return;
    }
    if (!text.trim()) return;
    send.mutate(text, {
      onSuccess: () => setText(''),
      onError: (e) => toast(e instanceof Error ? e.message : '傳送失敗'),
    });
  };

  return (
    <div className="body chat-body">
      <div className="chat-page-top">
        <GhostButton onClick={onBack}>← 返回首頁</GhostButton>
        <div className="chat-note">
          {preview
            ? '👁 預覽私訊畫面（不可傳送）'
            : `🔕 回覆時間 ${conv.officeHours} · 私訊僅雙方可見`}
        </div>
      </div>
      <div className="chat-shell chat-shell-fill">
        <div className="chat-wrap" ref={wrapRef}>
          {loadingMsg ? (
            <EmptyState>載入訊息…</EmptyState>
          ) : (
            <ChatThread
              messages={messages ?? []}
              selfRole="parent"
              empty={<EmptyState icon="💬">跟老師打個招呼吧</EmptyState>}
            />
          )}
        </div>
        <div className="send chat-composer">
          <input
            className="in"
            placeholder={preview ? '預覽不可輸入…' : '輸入訊息…'}
            value={text}
            disabled={preview}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSend();
            }}
          />
          <button
            type="button"
            className="sendbtn"
            onClick={onSend}
            disabled={preview || send.isPending}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
