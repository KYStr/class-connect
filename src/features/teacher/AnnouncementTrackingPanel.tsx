import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, GhostButton, Pill } from '@/ui';
import { listAnnouncementTracking } from '@/services/announcements';

export function AnnouncementTrackingPanel({ classId }: { classId: string }) {
  const [hideComplete, setHideComplete] = useState(true);
  const { data, isLoading } = useQuery({
    queryKey: ['announcements', classId, 'tracking'] as const,
    queryFn: () => listAnnouncementTracking(classId),
  });

  if (isLoading) return <EmptyState>載入追蹤中…</EmptyState>;
  const rows = data ?? [];
  const visible = hideComplete
    ? rows.filter((r) => r.unread.length > 0 || r.unbound.length > 0)
    : rows;
  const unboundTotal = rows[0]?.unbound.length ?? 0;

  return (
    <Card label="👀 公告已讀追蹤">
      <div className="info a" style={{ marginBottom: 8 }}>
        分母是全班學生（與聯絡簿一致）。
        {unboundTotal > 0
          ? `目前有 ${unboundTotal} 位學生尚未綁定家長，他們還看不到公告，會標成「未綁定」。`
          : '已加入的家長未讀會列在下方。'}
      </div>
      <GhostButton onClick={() => setHideComplete((v) => !v)}>
        {hideComplete ? '顯示已全部讀完的公告' : '隱藏已全部讀完的公告'}
      </GhostButton>
      {visible.length === 0 ? (
        <EmptyState icon="✅">
          {rows.length === 0 ? '目前沒有公告' : '所有已綁定家長都讀完了，也沒有未綁定學生'}
        </EmptyState>
      ) : (
        visible.map((row) => (
          <div key={row.announcementId} className="track-block">
            <div className="track-head">
              <strong>
                {row.important && <Pill tone="a">重要</Pill>} {row.title}
              </strong>
              <span>
                {row.readCount}/{row.totalCount} 位學生
              </span>
            </div>
            {row.unread.length === 0 && row.unbound.length === 0 ? (
              <div className="track-ok">全部已讀</div>
            ) : (
              <>
                {row.unread.length > 0 && (
                  <div className="track-list">
                    {row.unread.map((u) => (
                      <div
                        key={`${row.announcementId}-${u.parentId}-${u.studentId}`}
                        className="track-chip"
                      >
                        {u.studentSeat} {u.studentName}
                        {u.relation ? `（${u.relation}）` : ''} · {u.parentName}未讀
                      </div>
                    ))}
                  </div>
                )}
                {row.unbound.length > 0 && (
                  <div className="track-list">
                    {row.unbound.map((s) => (
                      <div key={`${row.announcementId}-u-${s.studentId}`} className="track-chip muted">
                        {s.seat} {s.name} · 未綁定家長
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))
      )}
    </Card>
  );
}
