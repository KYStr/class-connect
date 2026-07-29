import { useState } from 'react';
import { Card, EmptyState, GhostButton, useToast } from '@/ui';
import { useMyConsentPending, useSignConsent } from '@/hooks/useConsent';
import type { ConsentForm } from '@/types/domain';

export function ParentConsent({
  studentId,
  onBack,
  initialForm,
  preview = false,
}: {
  studentId: string | undefined;
  onBack: () => void;
  initialForm?: ConsentForm | null;
  preview?: boolean;
}) {
  const { toast } = useToast();
  const { data: pending, isLoading } = useMyConsentPending(studentId);
  const sign = useSignConsent(studentId);
  const [active, setActive] = useState<ConsentForm | null>(initialForm ?? null);

  if (!studentId) return <EmptyState>尚未綁定孩子</EmptyState>;
  if (isLoading) return <EmptyState>載入中…</EmptyState>;

  const form = active ?? pending?.[0] ?? null;

  if (!form) {
    return (
      <>
        <GhostButton onClick={onBack}>← 返回首頁</GhostButton>
        <EmptyState icon="✅">目前沒有待簽同意書</EmptyState>
      </>
    );
  }

  return (
    <>
      <GhostButton onClick={onBack}>← 返回首頁</GhostButton>
      {preview && <div className="info a">👁 預覽：同意書內容（不可簽署）</div>}
      <Card label="✍️ 線上簽署">
        <div style={{ fontSize: 16, fontWeight: 800 }}>{form.title}</div>
        {form.deadline && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            截止：{form.deadline}
          </div>
        )}
        {form.body && (
          <div
            style={{
              marginTop: 10,
              fontSize: 13.5,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              color: 'var(--ink-2)',
            }}
          >
            {form.body}
          </div>
        )}
        <button
          type="button"
          className="read-btn"
          style={{ marginTop: 14, width: '100%' }}
          disabled={preview || sign.isPending}
          onClick={() => {
            if (preview) {
              toast('預覽模式不可簽署');
              return;
            }
            sign.mutate(form.id, {
              onSuccess: () => {
                toast('已完成簽署');
                setActive(null);
                onBack();
              },
              onError: (e) => toast(e instanceof Error ? e.message : '簽署失敗'),
            });
          }}
        >
          {preview ? '預覽不可簽署' : sign.isPending ? '簽署中…' : '✍️ 立即線上簽署'}
        </button>
      </Card>
      {(pending?.length ?? 0) > 1 && (
        <Card label="其他待簽">
          {pending!
            .filter((f) => f.id !== form.id)
            .map((f) => (
              <button
                key={f.id}
                type="button"
                className="row"
                style={{
                  width: '100%',
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onClick={() => setActive(f)}
              >
                <div className="t">
                  {f.title}
                  {f.deadline ? <small>截止 {f.deadline}</small> : null}
                </div>
              </button>
            ))}
        </Card>
      )}
    </>
  );
}
