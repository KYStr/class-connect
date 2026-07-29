import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
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
  useUpdateBring,
  useUpdateHomework,
} from '@/hooks/useContact';
import { todayIso } from '@/services/contact';
import { HomeworkTrackingPanel } from './HomeworkTrackingPanel';

const LONG_PRESS_MS = 480;

function useFinePointer() {
  const [fine, setFine] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(pointer: fine)').matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return fine;
}

/**
 * Desktop: click to edit (plain-looking input).
 * Phone: long-press to edit — light tap never opens the keyboard.
 */
function InlineEditText({
  value,
  ariaLabel,
  onSave,
}: {
  value: string;
  ariaLabel: string;
  onSave: (next: string) => void;
}) {
  const finePointer = useFinePointer();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [armed, setArmed] = useState(false);
  const committed = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setDraft(value);
    committed.current = value;
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const commit = () => {
    const next = draft.trim();
    if (!next) {
      setDraft(committed.current);
      setEditing(false);
      return;
    }
    if (next !== committed.current) {
      committed.current = next;
      onSave(next);
    }
    setEditing(false);
  };

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setArmed(false);
  };

  const startPress = (e: ReactPointerEvent) => {
    movedRef.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    setArmed(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setArmed(false);
      if (!movedRef.current) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(12);
          } catch {
            /* ignore */
          }
        }
        setEditing(true);
      }
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (dx * dx + dy * dy > 36) {
      movedRef.current = true;
      clearTimer();
    }
  };

  if (!finePointer && !editing) {
    return (
      <div
        className={`rl-text${armed ? ' is-armed' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${ariaLabel}（長按修改）`}
        title="長按可修改"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          startPress(e);
        }}
        onPointerUp={clearTimer}
        onPointerCancel={clearTimer}
        onPointerLeave={clearTimer}
        onPointerMove={onPointerMove}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setEditing(true);
          }
        }}
      >
        {value}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      className="rl-edit"
      value={draft}
      aria-label={ariaLabel}
      title={finePointer ? '點一下即可修改' : '修改後點旁邊即可儲存'}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === 'Escape') {
          setDraft(committed.current);
          setEditing(false);
        }
      }}
    />
  );
}

// Teacher contact-book tab (SPEC 3.2 / L3 / L11).
export function ContactPanel({
  classId,
  openTracking = false,
}: {
  classId: string | undefined;
  openTracking?: boolean;
}) {
  const { toast } = useToast();
  const date = todayIso();
  const { data: hw } = useHomework(classId, date);
  const { data: bring } = useBring(classId, date);
  const { data: completion } = useHomeworkCompletion(classId, date);
  const addHw = useAddHomework(classId, date);
  const addBr = useAddBring(classId, date);
  const delHw = useDeleteHomework(classId, date);
  const delBr = useDeleteBring(classId, date);
  const updHw = useUpdateHomework(classId, date);
  const updBr = useUpdateBring(classId, date);
  const copy = useCopyYesterday(classId, date);
  const [hwText, setHwText] = useState('');
  const [brText, setBrText] = useState('');
  const [showTracking, setShowTracking] = useState(openTracking);

  useEffect(() => {
    if (openTracking) setShowTracking(true);
  }, [openTracking]);

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
              <div style={{ flex: 1, minWidth: 0 }}>
                <InlineEditText
                  value={h.text}
                  ariaLabel={`編輯作業 ${h.text}`}
                  onSave={(text) =>
                    updHw.mutate(
                      { id: h.id, text },
                      {
                        onSuccess: () => toast('已更新作業'),
                        onError: (e) => toast(e instanceof Error ? e.message : '更新失敗'),
                      },
                    )
                  }
                />
                {h.note && (
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', paddingLeft: 6 }}>{h.note}</div>
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
              <InlineEditText
                value={b.text}
                ariaLabel={`編輯攜帶 ${b.text}`}
                onSave={(text) =>
                  updBr.mutate(
                    { id: b.id, text },
                    {
                      onSuccess: () => toast('已更新攜帶'),
                      onError: (e) => toast(e instanceof Error ? e.message : '更新失敗'),
                    },
                  )
                }
              />
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
