import { Card, EmptyState, Pill } from '@/ui';
import { useAnnouncements, useMarkAnnouncementRead } from '@/hooks/useAnnouncements';

// Parent announcements tab (SPEC 3.1 / L5).
export function ParentAnnouncements({
  classId,
  preview = false,
}: {
  classId: string | undefined;
  preview?: boolean;
}) {
  const { data: list, isLoading } = useAnnouncements(classId);
  const mark = useMarkAnnouncementRead(classId);

  if (!classId) return <EmptyState>尚未綁定孩子</EmptyState>;
  if (isLoading) return <EmptyState>載入中…</EmptyState>;
  if (!list || list.length === 0) return <EmptyState icon="📭">目前沒有公告</EmptyState>;

  return (
    <>
      {preview && <div className="info a">👁 預覽：僅顯示已發布公告（唯讀）</div>}
      {list.map((a) => (
        <Card key={a.id} label={a.important ? '⚠️ 重要公告' : '📣 公告'}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <strong style={{ flex: 1 }}>{a.title}</strong>
            {a.read ? <Pill tone="g">已讀</Pill> : <Pill tone="a">未讀</Pill>}
          </div>
          {a.body && (
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6, whiteSpace: 'pre-wrap' }}>
              {a.body}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {new Date(a.publishedAt).toLocaleString('zh-TW', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {!a.read && !preview && (
              <button className="read-btn" onClick={() => mark.mutate(a.id)}>
                標記已讀
              </button>
            )}
          </div>
        </Card>
      ))}
    </>
  );
}
