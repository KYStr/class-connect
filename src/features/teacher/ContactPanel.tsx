import { useState } from 'react';
import { Button, Card, EmptyState, GhostButton, useToast } from '@/ui';
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

  if (!classId) return <EmptyState>請先建立班級</EmptyState>;

  const done = completion?.done ?? 0;
  const total = completion?.total ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <>
      <div className="info a">
        今日完成 {done}/{total}（{pct}%）· 家長打勾後會同步上來
      </div>

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
              <button className="read-btn" onClick={() => delHw.mutate(h.id)}>
                刪
              </button>
            </div>
          ))
        ) : (
          <EmptyState>今天還沒有作業</EmptyState>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            className="in"
            style={{ marginTop: 0, flex: 1 }}
            value={hwText}
            onChange={(e) => setHwText(e.target.value)}
            placeholder="例如：國語第 3 課練習"
          />
          <Button
            tone="amber"
            onClick={() => {
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
            }}
            disabled={addHw.isPending}
          >
            ＋
          </Button>
        </div>
      </Card>

      <Card label="🎒 明日攜帶">
        {bring && bring.length > 0 ? (
          bring.map((b) => (
            <div key={b.id} className="rl">
              <div className="nm" style={{ flex: 1 }}>
                {b.text}
              </div>
              <button className="read-btn" onClick={() => delBr.mutate(b.id)}>
                刪
              </button>
            </div>
          ))
        ) : (
          <EmptyState>明天不用帶特別的東西</EmptyState>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            className="in"
            style={{ marginTop: 0, flex: 1 }}
            value={brText}
            onChange={(e) => setBrText(e.target.value)}
            placeholder="例如：水彩用具"
          />
          <Button
            tone="amber"
            onClick={() => {
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
            }}
            disabled={addBr.isPending}
          >
            ＋
          </Button>
        </div>
      </Card>
    </>
  );
}
