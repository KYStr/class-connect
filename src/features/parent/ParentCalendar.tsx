import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, EmptyState, GhostButton, useToast } from '@/ui';
import { useEvents } from '@/hooks/useCalendar';
import { queryKeys } from '@/lib/queryKeys';
import { getClass } from '@/services/classes';
import {
  calendarFeedUrls,
  getMyCalendarSub,
  saveMyCalendarSub,
  type ParentRemindDay,
} from '@/services/calendarSub';
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

export function ParentCalendar({
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
  const { data: sub } = useQuery({
    queryKey: ['calendar-sub', classId],
    queryFn: () => getMyCalendarSub(classId as string),
    enabled: Boolean(classId),
  });
  const [remindDay, setRemindDay] = useState<ParentRemindDay>('class');
  const [remindTime, setRemindTime] = useState('06:00');

  useEffect(() => {
    if (!sub) return;
    setRemindDay(sub.remindDay);
    setRemindTime(sub.remindTime);
  }, [sub]);

  const save = useMutation({
    mutationFn: () =>
      saveMyCalendarSub(classId as string, { remindDay, remindTime }),
    onSuccess: (saved) => {
      qc.setQueryData(['calendar-sub', classId], saved);
      toast('已儲存你的提醒時間');
    },
    onError: (e) => toast(e instanceof Error ? e.message : '儲存失敗'),
  });

  if (!classId) return <EmptyState>尚未綁定孩子</EmptyState>;

  const classHint =
    cls?.remindDay === 'none'
      ? '老師預設：不提醒'
      : `老師預設：${cls?.remindDay === 'prev' ? '前一天' : '當天'} ${cls?.remindTime ?? '07:00'}`;

  const subscribe = async () => {
    const saved = await save.mutateAsync();
    const { webcal, https } = calendarFeedUrls(saved.token);
    window.location.href = webcal;
    try {
      await navigator.clipboard.writeText(https);
    } catch {
      /* share sheet / calendar app is the main path */
    }
    toast('若沒有跳出行事曆，連結已複製，可貼到 Google 日曆「從網址新增」');
  };

  return (
    <>
      <GhostButton onClick={onBack}>← 返回首頁</GhostButton>
      <Card label="📲 同步到手機行事曆">
        <div className="roster-hint">
          訂閱一次即可。之後老師新增或修改活動，手機會自動更新，不用每次再按。更新通常要幾小時，不是立刻。
        </div>
        <div className="roster-hint">{classHint}</div>
        <div className="roster-one-row">
          <select
            className="in"
            style={{ flex: 1, marginTop: 0 }}
            value={remindDay}
            onChange={(e) => setRemindDay(e.target.value as ParentRemindDay)}
          >
            <option value="class">跟老師的時間</option>
            <option value="same">活動當天</option>
            <option value="prev">前一天</option>
            <option value="none">不提醒</option>
          </select>
          <input
            className="in"
            type="time"
            style={{ flex: '0 0 120px', marginTop: 0 }}
            value={remindTime}
            disabled={remindDay === 'class' || remindDay === 'none'}
            onChange={(e) => setRemindTime(e.target.value)}
          />
        </div>
        <GhostButton style={{ marginTop: 8 }} disabled={save.isPending} onClick={() => save.mutate()}>
          只儲存提醒時間
        </GhostButton>
        <GhostButton style={{ marginTop: 8 }} disabled={save.isPending} onClick={() => void subscribe()}>
          {sub ? '再次開啟訂閱' : '訂閱到手機行事曆'}
        </GhostButton>
      </Card>
      <div className="info p">考試、活動、繳費、放假。要帶的東西會寫進行事曆內容。</div>
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
                  {ev.note ? <div className="tl-date">{ev.note}</div> : null}
                </div>
                <span className={`cal-type ${ev.type}`}>{TYPE_LABEL[ev.type]}</span>
              </div>
            );
          })
        )}
      </Card>
    </>
  );
}
