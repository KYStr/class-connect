import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Pill, useToast } from '@/ui';
import {
  useAnnouncementsWithStats,
  useCreateAnnouncement,
  useDeleteAnnouncement,
} from '@/hooks/useAnnouncements';
import { AnnouncementTrackingPanel } from './AnnouncementTrackingPanel';

// Teacher announcements tab (SPEC 3.2 / L5).
export function AnnouncementsPanel({
  classId,
  openTracking = false,
}: {
  classId: string | undefined;
  openTracking?: boolean;
}) {
  const { toast } = useToast();
  const { data: list, isLoading } = useAnnouncementsWithStats(classId);
  const create = useCreateAnnouncement(classId);
  const del = useDeleteAnnouncement(classId);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [important, setImportant] = useState(false);
  const [schedule, setSchedule] = useState('');
  const [showTracking, setShowTracking] = useState(openTracking);

  useEffect(() => {
    if (openTracking) setShowTracking(true);
  }, [openTracking]);

  if (!classId) return <EmptyState>請先建立班級</EmptyState>;

  const publish = () => {
    if (!title.trim()) {
      toast('請輸入標題');
      return;
    }
    const scheduledAt = schedule ? new Date(schedule).toISOString() : undefined;
    const isFuture = Boolean(scheduledAt && new Date(scheduledAt).getTime() > Date.now() + 15_000);
    create.mutate(
      { title: title.trim(), body: body.trim(), important, scheduledAt },
      {
        onSuccess: () => {
          setTitle('');
          setBody('');
          setImportant(false);
          setSchedule('');
          toast(isFuture ? '已排程，時間到才會出現在家長端' : '公告已發布');
        },
        onError: (e) => toast(e instanceof Error ? e.message : '發布失敗'),
      },
    );
  };

  return (
    <>
      <button
        type="button"
        className="info a"
        style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 0 }}
        onClick={() => setShowTracking((v) => !v)}
      >
        點此查看哪些家長還沒讀公告
      </button>

      {showTracking && <AnnouncementTrackingPanel classId={classId} />}

      <Card label="✏️ 新增公告">
        <input
          className="in"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="標題，例如：週五校外教學"
        />
        <textarea
          className="ta"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="內容（可選）"
          style={{ minHeight: 80, marginTop: 8 }}
        />
        <label className="toggle-row" style={{ marginTop: 8, padding: 0 }}>
          <div className="tx">
            標為重要
            <small>家長端會優先顯示</small>
          </div>
          <label className="sw2">
            <input
              type="checkbox"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
            />
            <span className="sw2-tr" />
          </label>
        </label>
        <label className="roster-count-row" style={{ marginTop: 8 }}>
          排程發布
          <input
            className="in"
            type="datetime-local"
            style={{ flex: 1, marginTop: 0 }}
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
          />
        </label>
        <div className="roster-hint">留空就立刻發布。填了未來時間，家長在那之前看不到，也不會先收到通知。</div>
        <Button tone="amber" style={{ marginTop: 10 }} onClick={publish} disabled={create.isPending}>
          {create.isPending ? '處理中…' : schedule ? '排程公告' : '發布公告'}
        </Button>
      </Card>

      <Card label={`📣 已發布（${list?.length ?? 0}）`}>
        {isLoading ? (
          <EmptyState>載入中…</EmptyState>
        ) : list && list.length > 0 ? (
          list.map((a) => (
            <div key={a.id} className="ann" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {a.important && <Pill tone="a">重要</Pill>}
                <strong style={{ flex: 1 }}>{a.title}</strong>
                <button
                  type="button"
                  className="del-btn"
                  onClick={() => del.mutate(a.id, { onSuccess: () => toast('已刪除') })}
                >
                  刪除
                </button>
              </div>
              {a.body && (
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--ink-2)',
                    marginTop: 4,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {a.body}
                </div>
              )}
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
                {new Date(a.publishedAt).getTime() > Date.now()
                  ? `排程中，${new Date(a.publishedAt).toLocaleString('zh-TW', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })} 才對家長公開`
                  : `家長已讀 ${a.readCount ?? 0}/${a.guardianCount ?? 0}${
                      a.guardianCount === 0 ? '（尚無家長加入）' : ''
                    } · ${new Date(a.publishedAt).toLocaleString('zh-TW', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
              </div>
            </div>
          ))
        ) : (
          <EmptyState icon="📭">還沒有公告，上面寫一則吧</EmptyState>
        )}
      </Card>
    </>
  );
}
