import { Card, EmptyState, GhostButton, useToast } from '@/ui';
import { useEvents } from '@/hooks/useCalendar';
import type { EventType } from '@/types/domain';

const TYPE_LABEL: Record<EventType, string> = {
  exam: '評量',
  activity: '活動',
  fee: '繳費',
  holiday: '放假',
};

function parts(iso: string) {
  const [y, m, d] = iso.split('-');
  return { y, m: String(Number(m)), d: String(Number(d)) };
}

export function ParentCalendar({
  classId,
  onBack,
}: {
  classId: string | undefined;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const { data, isLoading } = useEvents(classId);

  if (!classId) return <EmptyState>尚未綁定孩子</EmptyState>;

  return (
    <>
      <GhostButton onClick={onBack}>← 返回首頁</GhostButton>
      <div className="info p">📅 考試、活動、繳費、放假一次看清楚。</div>
      <Card label="班級行事曆">
        {isLoading ? (
          <EmptyState>載入中…</EmptyState>
        ) : !data || data.length === 0 ? (
          <EmptyState icon="📅">目前沒有活動</EmptyState>
        ) : (
          data.map((ev) => {
            const { m, d } = parts(ev.eventDate);
            return (
              <div key={ev.id} className="cal-item">
                <div className="cal-date">
                  <div className="dd">{d}</div>
                  <div className="mm">{m}月</div>
                </div>
                <div className="cal-body">
                  <div className="t">{ev.title}</div>
                  <div className="tl-date">{ev.eventDate}</div>
                </div>
                <span className={`cal-type ${ev.type}`}>{TYPE_LABEL[ev.type]}</span>
              </div>
            );
          })
        )}
      </Card>
      <GhostButton onClick={() => toast('已加入手機行事曆（示意）')}>
        ＋ 一鍵加入手機行事曆
      </GhostButton>
    </>
  );
}
