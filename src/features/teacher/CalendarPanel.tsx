import { useState } from 'react';
import { Button, Card, EmptyState, GhostButton, useToast } from '@/ui';
import { useAddEvent, useDeleteEvent, useEvents } from '@/hooks/useCalendar';
import type { EventType } from '@/types/domain';

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

export function CalendarPanel({
  classId,
  onBack,
}: {
  classId: string | undefined;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const { data, isLoading } = useEvents(classId);
  const add = useAddEvent(classId);
  const del = useDeleteEvent(classId);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<EventType>('activity');

  if (!classId) return <EmptyState>請先建立班級</EmptyState>;

  const onAdd = () => {
    if (!title.trim()) {
      toast('請輸入標題');
      return;
    }
    add.mutate(
      { title: title.trim(), eventDate, type },
      {
        onSuccess: () => {
          setTitle('');
          toast('已新增活動');
        },
        onError: (e) => toast(e instanceof Error ? e.message : '新增失敗'),
      },
    );
  };

  return (
    <>
      <GhostButton onClick={onBack}>← 返回總覽</GhostButton>
      <Card label="➕ 新增活動">
        <input
          className="in"
          placeholder="標題，例如：校外教學"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            className="in"
            type="date"
            style={{ flex: 1 }}
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
          <select
            className="in"
            style={{ flex: 1 }}
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
          >
            <option value="exam">評量</option>
            <option value="activity">活動</option>
            <option value="fee">繳費</option>
            <option value="holiday">放假</option>
          </select>
        </div>
        <Button tone="amber" onClick={onAdd} disabled={add.isPending} style={{ marginTop: 10 }}>
          {add.isPending ? '新增中…' : '加入行事曆'}
        </Button>
      </Card>
      <Card label={`📅 已排程（${data?.length ?? 0}）`}>
        {isLoading ? (
          <EmptyState>載入中…</EmptyState>
        ) : !data || data.length === 0 ? (
          <EmptyState icon="📅">尚無活動</EmptyState>
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
                <button
                  type="button"
                  className="del"
                  onClick={() =>
                    del.mutate(ev.id, {
                      onSuccess: () => toast('已刪除'),
                    })
                  }
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </Card>
    </>
  );
}
