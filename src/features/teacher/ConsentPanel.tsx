import { useState } from 'react';
import { Button, Card, EmptyState, Feature, GhostButton, useToast } from '@/ui';
import {
  useConsentForms,
  useConsentStatus,
  useCreateConsentForm,
  useRemindUnsigned,
} from '@/hooks/useConsent';

export function ConsentPanel({
  classId,
  onBack,
}: {
  classId: string | undefined;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const { data: forms, isLoading } = useConsentForms(classId);
  const create = useCreateConsentForm(classId);
  const remind = useRemindUnsigned();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deadline, setDeadline] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>(undefined);

  const selectedId = activeId ?? forms?.[0]?.id;
  const selected = forms?.find((f) => f.id === selectedId);
  const { data: status } = useConsentStatus(selectedId);

  if (!classId) return <EmptyState>請先建立班級</EmptyState>;
  if (isLoading) return <EmptyState>載入中…</EmptyState>;

  const onCreate = () => {
    if (!title.trim()) {
      toast('請輸入標題');
      return;
    }
    create.mutate(
      {
        title: title.trim(),
        body: body.trim() || undefined,
        deadline: deadline || undefined,
      },
      {
        onSuccess: (f) => {
          setTitle('');
          setBody('');
          setDeadline('');
          setActiveId(f.id);
          toast('同意書已建立');
        },
        onError: (e) => toast(e instanceof Error ? e.message : '建立失敗'),
      },
    );
  };

  return (
    <>
      <GhostButton onClick={onBack}>← 返回總覽</GhostButton>
      <Card label="➕ 新增同意書">
        <input
          className="in"
          placeholder="標題，例如：校外教學同意書"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="ta"
          placeholder="內容說明（可選）"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ marginTop: 8, minHeight: 70 }}
        />
        <input
          className="in"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={{ marginTop: 8 }}
        />
        <Button tone="amber" onClick={onCreate} disabled={create.isPending} style={{ marginTop: 10 }}>
          {create.isPending ? '建立中…' : '建立並追蹤'}
        </Button>
      </Card>

      {(forms?.length ?? 0) > 1 && (
        <Card label="同意書列表">
          {forms!.map((f) => (
            <button
              key={f.id}
              type="button"
              className="row"
              style={{
                width: '100%',
                border: 0,
                background: f.id === selectedId ? 'var(--accent-soft)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onClick={() => setActiveId(f.id)}
            >
              <div className="t">
                {f.title}
                {f.deadline ? <small>截止 {f.deadline}</small> : null}
              </div>
            </button>
          ))}
        </Card>
      )}

      {selected && status && (
        <>
          <Feature
            variant="t"
            kicker={selected.title}
            title={`已簽 ${status.signed.length}/${status.signed.length + status.unsigned.length}`}
            sub={`${selected.deadline ?? '無截止'} · 不用一張張追紙本`}
            pct={status.rate}
          />
          {status.unsigned.length > 0 && (
            <Button
              tone="amber"
              onClick={() =>
                remind.mutate(selected.id, {
                  onSuccess: (r) =>
                    toast(
                      r.notified > 0
                        ? `已推播提醒 ${r.notified} 位家長`
                        : '沒有可推播的訂閱（請家長先開啟通知）',
                    ),
                  onError: (e) => toast(e instanceof Error ? e.message : '提醒失敗'),
                })
              }
            >
              📣 一鍵提醒 {status.unsigned.length} 位未簽家長
            </Button>
          )}
          <Card label={`❌ 未簽（${status.unsigned.length}）`}>
            {status.unsigned.length === 0 ? (
              <EmptyState>全班都簽好了 🎉</EmptyState>
            ) : (
              status.unsigned.map((s) => (
                <div key={s.id} className="rl">
                  <div className="seat">{s.seat}</div>
                  <div className="nm">{s.name}</div>
                  <span className="st no">未簽</span>
                </div>
              ))
            )}
          </Card>
          <Card label={`✅ 已簽（${status.signed.length}）`}>
            {status.signed.length === 0 ? (
              <EmptyState>還沒有人簽署</EmptyState>
            ) : (
              status.signed.map((s) => (
                <div key={s.id} className="rl">
                  <div className="seat">{s.seat}</div>
                  <div className="nm">{s.name}</div>
                  <span className="st ok">已簽</span>
                </div>
              ))
            )}
          </Card>
        </>
      )}

      {!selected && <EmptyState icon="✍️">先建立一份同意書開始追蹤</EmptyState>}
    </>
  );
}
