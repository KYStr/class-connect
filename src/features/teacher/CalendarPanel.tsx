import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, EmptyState, GhostButton, useToast } from '@/ui';
import { useAddEvent, useDeleteEvent, useEvents } from '@/hooks/useCalendar';
import { queryKeys } from '@/lib/queryKeys';
import { getClass, updateClassReminder } from '@/services/classes';
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
  const qc = useQueryClient();
  const { data, isLoading } = useEvents(classId);
  const { data: cls } = useQuery({
    queryKey: queryKeys.classes.one(classId ?? ''),
    queryFn: () => getClass(classId as string),
    enabled: Boolean(classId),
  });
  const add = useAddEvent(classId);
  const del = useDeleteEvent(classId);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<EventType>('activity');
  const [remindDay, setRemindDay] = useState<'same' | 'prev' | 'none'>('same');
  const [remindTime, setRemindTime] = useState('07:00');

  useEffect(() => {
    if (!cls) return;
    setRemindDay(cls.remindDay);
    setRemindTime(cls.remindTime);
  }, [cls]);

  const saveRemind = useMutation({
    mutationFn: () =>
      updateClassReminder(classId as string, { remindDay, remindTime }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.classes.one(classId ?? '') });
      void qc.invalidateQueries({ queryKey: queryKeys.classes.mine() });
      toast('已儲存全班預設提醒');
    },
    onError: (e) => toast(e instanceof Error ? e.message : '儲存失敗'),
  });

  if (!classId) return <EmptyState>請先建立班級</EmptyState>;

  const onAdd = () => {
    if (!title.trim()) {
      toast('請輸入標題');
      return;
    }
    add.mutate(
      { title: title.trim(), eventDate, type, note: note.trim(), remind: 'morning' },
      {
        onSuccess: () => {
          setTitle('');
          setNote('');
          toast('已新增活動');
        },
        onError: (e) => toast(e instanceof Error ? e.message : '新增失敗'),
      },
    );
  };

  return (
    <>
      <GhostButton onClick={onBack}>← 返回總覽</GhostButton>
      <Card label="⏰ 全班預設提醒">
        <div className="roster-hint">
          只需設定一次。家長訂閱後會用這個時間提醒；個別家長仍可改成自己出門的時間。
        </div>
        <div className="roster-one-row">
          <select
            className="in"
            style={{ flex: 1, marginTop: 0 }}
            value={remindDay}
            onChange={(e) => setRemindDay(e.target.value as 'same' | 'prev' | 'none')}
          >
            <option value="same">活動當天</option>
            <option value="prev">前一天</option>
            <option value="none">不提醒</option>
          </select>
          <input
            className="in"
            type="time"
            style={{ flex: '0 0 120px', marginTop: 0 }}
            value={remindTime}
            disabled={remindDay === 'none'}
            onChange={(e) => setRemindTime(e.target.value)}
          />
        </div>
        <GhostButton style={{ marginTop: 8 }} disabled={saveRemind.isPending} onClick={() => saveRemind.mutate()}>
          {saveRemind.isPending ? '儲存中…' : '儲存預設'}
        </GhostButton>
      </Card>
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
        <textarea
          className="ta"
          style={{ minHeight: 72, marginTop: 8 }}
          placeholder="要帶的東西或備註，例如：水彩、圍兜、水壺"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
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
                  {ev.note ? <div className="tl-date">{ev.note}</div> : null}
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
