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
  const visible = hideComplete ? rows.filter((r) => r.unread.length > 0) : rows;

  return (
    <Card label="👀 公告已讀追蹤">
      <GhostButton onClick={() => setHideComplete((v) => !v)}>
        {hideComplete ? '顯示已全部讀完的公告' : '隱藏已全部讀完的公告'}
      </GhostButton>
      {visible.length === 0 ? (
        <EmptyState icon="✅">
          {rows.length === 0 ? '目前沒有公告' : '所有公告都已讀完'}
        </EmptyState>
      ) : (
        visible.map((row) => (
          <div key={row.announcementId} className="track-block">
            <div className="track-head">
              <strong>
                {row.important && <Pill tone="a">重要</Pill>} {row.title}
              </strong>
              <span>
                {row.readCount}/{row.totalCount}
              </span>
            </div>
            {row.unread.length === 0 ? (
              <div className="track-ok">全部已讀</div>
            ) : (
              <div className="track-list">
                {row.unread.map((u) => (
                  <div key={`${row.announcementId}-${u.parentId}-${u.studentId}`} className="track-chip">
                    {u.studentSeat} {u.studentName}
                    {u.relation ? `（${u.relation}）` : ''} · {u.parentName}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </Card>
  );
}
