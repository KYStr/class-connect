import { Card, EmptyState, GhostButton, useToast } from '@/ui';
import { useEvents } from '@/hooks/useCalendar';
import { eventsToIcs, shareCalendarFile } from '@/lib/calendarIcs';
import type { CalendarEvent, EventType } from '@/types/domain';

const TYPE_LABEL: Record<EventType, string> = {
  exam: '評量',
  activity: '活動',
  fee: '繳費',
  holiday: '放假',
};

function parts(iso: string) {
  const [, m, d] = iso.split('-');
  return { m: String(Number(m)), d: String(Number(d)) };
}

async function addToPhone(events: CalendarEvent[], filename: string, toast: (m: string) => void) {
  if (events.length === 0) {
    toast('目前沒有可加入的活動');
    return;
  }
  const ics = eventsToIcs(events, '班級行事曆');
  const how = await shareCalendarFile(ics, filename);
  toast(
    how === 'shared'
      ? '請在分享選單選擇「行事曆」加入，提醒會一併帶過去'
      : '已下載行事曆檔，點開即可加入手機並保留提醒',
  );
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
      <div className="info p">
        考試、活動、繳費、放假一次看清楚。加入手機後，可用行事曆自己的提醒在出門前看到要帶的東西。
      </div>
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
                  <div className="tl-date">
                    {ev.eventDate}
                    {ev.remind === 'morning' ? ' · 早 7:00' : ev.remind === 'eve' ? ' · 前一晚' : ''}
                  </div>
                  {ev.note ? <div className="tl-date">{ev.note}</div> : null}
                </div>
                <button
                  type="button"
                  className="read-btn"
                  onClick={() => {
                    void addToPhone([ev], `event-${ev.eventDate}.ics`, toast).catch(() =>
                      toast('無法加入行事曆'),
                    );
                  }}
                >
                  加入
                </button>
                <span className={`cal-type ${ev.type}`}>{TYPE_LABEL[ev.type]}</span>
              </div>
            );
          })
        )}
      </Card>
      <GhostButton
        onClick={() => {
          void addToPhone(data ?? [], 'class-calendar.ics', toast).catch(() => toast('無法加入行事曆'));
        }}
      >
        ＋ 全部加入手機行事曆
      </GhostButton>
    </>
  );
}
