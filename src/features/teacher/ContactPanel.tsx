import { useState } from 'react';
import { Card, EmptyState, GhostButton, useToast } from '@/ui';
import {
  useAddBring,
  useAddHomework,
  useBring,
  useCopyYesterday,
  useDeleteBring,
  useDeleteHomework,
  useHomework,
  useHomeworkCompletion,
} from '@/hooks/useContact';
import { todayIso } from '@/services/contact';
import { HomeworkTrackingPanel } from './HomeworkTrackingPanel';

// Teacher contact-book tab (SPEC 3.2 / L3 / L11).
export function ContactPanel({ classId }: { classId: string | undefined }) {
  const { toast } = useToast();
  const date = todayIso();
  const { data: hw } = useHomework(classId, date);
  const { data: bring } = useBring(classId, date);
  const { data: completion } = useHomeworkCompletion(classId, date);
  const addHw = useAddHomework(classId, date);
  const addBr = useAddBring(classId, date);
  const delHw = useDeleteHomework(classId, date);
  const delBr = useDeleteBring(classId, date);
  const copy = useCopyYesterday(classId, date);
  const [hwText, setHwText] = useState('');
  const [brText, setBrText] = useState('');
  const [showTracking, setShowTracking] = useState(false);

  if (!classId) return <EmptyState>請先建立班級</EmptyState>;

  const done = completion?.done ?? 0;
  const total = completion?.total ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const submitHw = () => {
    if (!hwText.trim()) return;
    addHw.mutate(
      { text: hwText.trim() },
      {
        onSuccess: () => {
          setHwText('');
          toast('已加入作業');
        },
      },
    );
  };

  const submitBr = () => {
    if (!brText.trim()) return;
    addBr.mutate(
      { text: brText.trim() },
      {
        onSuccess: () => {
          setBrText('');
          toast('已加入攜帶');
        },
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
        今日完成 {done}/{total}（{pct}%）· 點此查看誰還沒完成
      </button>

      {showTracking && <HomeworkTrackingPanel classId={classId} date={date} />}

      <GhostButton
        onClick={() =>
          copy.mutate(undefined, {
            onSuccess: () => toast('已複製昨天的聯絡簿'),
            onError: (e) => toast(e instanceof Error ? e.message : '複製失敗'),
          })
        }
        disabled={copy.isPending}
      >
        {copy.isPending ? '複製中…' : '📋 複製昨天'}
      </GhostButton>

      <Card label="✍️ 今日作業">
        {hw && hw.length > 0 ? (
          hw.map((h) => (
            <div key={h.id} className="rl">
              <div className="nm" style={{ flex: 1 }}>
                {h.text}
                {h.note && (
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{h.note}</div>
                )}
              </div>
              <button
                type="button"
                className="del-btn"
                onClick={() => delHw.mutate(h.id)}
                aria-label={`刪除作業 ${h.text}`}
              >
                刪除
              </button>
            </div>
          ))
        ) : (
          <EmptyState>今天還沒有作業</EmptyState>
        )}
        <div className="addrow">
          <input
            className="in"
            value={hwText}
            onChange={(e) => setHwText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitHw();
            }}
            placeholder="新增一項作業…"
          />
          <button
            type="button"
            className="addbtn"
            onClick={submitHw}
            disabled={addHw.isPending}
            aria-label="新增作業"
          >
            ＋
          </button>
        </div>
      </Card>

      <Card label="🎒 明日攜帶">
        {bring && bring.length > 0 ? (
          bring.map((b) => (
            <div key={b.id} className="rl">
              <div className="nm" style={{ flex: 1 }}>
                {b.text}
              </div>
              <button
                type="button"
                className="del-btn"
                onClick={() => delBr.mutate(b.id)}
                aria-label={`刪除攜帶 ${b.text}`}
              >
                刪除
              </button>
            </div>
          ))
        ) : (
          <EmptyState>明天不用帶特別的東西</EmptyState>
        )}
        <div className="addrow">
          <input
            className="in"
            value={brText}
            onChange={(e) => setBrText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitBr();
            }}
            placeholder="新增攜帶物品…"
          />
          <button
            type="button"
            className="addbtn"
            onClick={submitBr}
            disabled={addBr.isPending}
            aria-label="新增攜帶"
          >
            ＋
          </button>
        </div>
      </Card>
    </>
  );
}
