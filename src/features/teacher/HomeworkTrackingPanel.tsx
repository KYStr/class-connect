import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, GhostButton, DismissibleTip } from '@/ui';
import { listHomeworkTracking } from '@/services/contact';

export function HomeworkTrackingPanel({
  classId,
  date,
}: {
  classId: string;
  date: string;
}) {
  const [hideComplete, setHideComplete] = useState(true);
  const { data, isLoading } = useQuery({
    queryKey: ['contact', 'tracking', classId, date] as const,
    queryFn: () => listHomeworkTracking(classId, date),
  });

  if (isLoading) return <EmptyState>載入追蹤中…</EmptyState>;
  const rows = data ?? [];
  const visible = hideComplete ? rows.filter((r) => r.incomplete.length > 0) : rows;

  return (
    <Card label="👀 作業完成追蹤">
      <DismissibleTip storageKey="homework_tracking">
        分母是全班學生。粉紅標籤＝還沒打勾完成的學生。
      </DismissibleTip>
      <GhostButton onClick={() => setHideComplete((v) => !v)}>
        {hideComplete ? '顯示已全部完成的項目' : '隱藏已全部完成的項目'}
      </GhostButton>
      {visible.length === 0 ? (
        <EmptyState icon="✅">
          {rows.length === 0 ? '今天還沒有作業' : '全部作業都完成了'}
        </EmptyState>
      ) : (
        visible.map((row) => (
          <div key={row.homeworkId} className="track-block">
            <div className="track-head">
              <strong>{row.text}</strong>
              <span>
                {row.doneCount}/{row.totalCount} 位學生
              </span>
            </div>
            {row.incomplete.length === 0 ? (
              <div className="track-ok">全部完成</div>
            ) : (
              <div className="track-list">
                {row.incomplete.map((s) => (
                  <div key={s.studentId} className="track-chip">
                    {s.seat} {s.name}
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
