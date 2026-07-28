import { Button, Card, EmptyState, GhostButton, Pill, useToast } from '@/ui';
import { useClassLeaves, useReviewLeave } from '@/hooks/useLeaves';
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL } from '@/services/leaves';
import type { LeaveStatus } from '@/types/domain';

function statusTone(s: LeaveStatus): 'p' | 'a' | 'g' {
  if (s === 'approved') return 'p';
  if (s === 'rejected') return 'a';
  return 'g';
}

export function LeavesPanel({
  classId,
  onBack,
}: {
  classId: string | undefined;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const { data: list, isLoading } = useClassLeaves(classId);
  const review = useReviewLeave(classId);

  if (!classId) return <EmptyState>請先建立班級</EmptyState>;
  if (isLoading) return <EmptyState>載入中…</EmptyState>;

  const pending = (list ?? []).filter((l) => l.status === 'pending');
  const done = (list ?? []).filter((l) => l.status !== 'pending');

  const act = (id: string, status: 'approved' | 'rejected') => {
    review.mutate(
      { id, status },
      {
        onSuccess: () => toast(status === 'approved' ? '已核准' : '已標為未核准'),
        onError: (e) => toast(e instanceof Error ? e.message : '操作失敗'),
      },
    );
  };

  return (
    <>
      <GhostButton onClick={onBack}>← 返回總覽</GhostButton>
      <div className="info a">🤒 家長線上請假會出現在這裡，一鍵准駁。</div>
      {pending.length === 0 && done.length === 0 ? (
        <EmptyState icon="✅">目前沒有請假紀錄</EmptyState>
      ) : (
        <>
          {pending.length === 0 ? (
            <EmptyState icon="✅">目前沒有待審核的請假</EmptyState>
          ) : (
            pending.map((l) => (
              <Card key={l.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div className="ava a" style={{ width: 36, height: 36 }}>
                    🤒
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {l.studentName ?? '學生'}
                      {l.seat ? `（${l.seat}）` : ''} · {LEAVE_TYPE_LABEL[l.type]}
                    </div>
                    <div className="tl-date">{l.leaveDate}</div>
                  </div>
                  <Pill tone={statusTone(l.status)}>{LEAVE_STATUS_LABEL[l.status]}</Pill>
                </div>
                {l.reason && (
                  <div
                    className="msg"
                    style={{ boxShadow: 'none', background: '#f4f6f7', maxWidth: '100%', marginTop: 8 }}
                  >
                    {l.reason}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Button style={{ height: 42 }} onClick={() => act(l.id, 'approved')}>
                    核准
                  </Button>
                  <GhostButton style={{ width: 'auto', flex: 1 }} onClick={() => act(l.id, 'rejected')}>
                    未核准
                  </GhostButton>
                </div>
              </Card>
            ))
          )}
          {done.length > 0 && (
            <Card label="已處理">
              {done.map((l) => (
                <div key={l.id} className="row">
                  <div className="t">
                    {l.studentName} · {LEAVE_TYPE_LABEL[l.type]} · {l.leaveDate}
                  </div>
                  <Pill tone={statusTone(l.status)}>{LEAVE_STATUS_LABEL[l.status]}</Pill>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </>
  );
}
