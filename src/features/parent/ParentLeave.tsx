import { useState } from 'react';
import { Button, Card, EmptyState, GhostButton, Pill, useToast } from '@/ui';
import { useParentLeaves, useSubmitLeave } from '@/hooks/useLeaves';
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL } from '@/services/leaves';
import type { LeaveStatus, LeaveType } from '@/types/domain';

function statusTone(s: LeaveStatus): 'p' | 'a' | 'g' {
  if (s === 'approved') return 'p';
  if (s === 'rejected') return 'a';
  return 'g';
}

export function ParentLeave({
  studentId,
  studentName,
  onBack,
  preview = false,
}: {
  studentId: string | undefined;
  studentName?: string;
  onBack: () => void;
  preview?: boolean;
}) {
  const { toast } = useToast();
  const { data: list } = useParentLeaves(studentId);
  const submit = useSubmitLeave(studentId);
  const [type, setType] = useState<LeaveType>('sick');
  const [leaveDate, setLeaveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');

  if (!studentId) return <EmptyState>尚未綁定孩子</EmptyState>;

  const onSubmit = () => {
    if (preview) {
      toast('預覽模式不可送出');
      return;
    }
    if (!reason.trim()) {
      toast('請填寫原因');
      return;
    }
    submit.mutate(
      { leaveDate, type, reason: reason.trim() },
      {
        onSuccess: () => {
          setReason('');
          toast('已送出請假');
        },
        onError: (e) => toast(e instanceof Error ? e.message : '送出失敗'),
      },
    );
  };

  return (
    <>
      <GhostButton onClick={onBack}>← 返回首頁</GhostButton>
      <div className="info p">
        {preview
          ? '👁 預覽：家長請假表單（不可送出）'
          : '🤒 線上請假通知老師，不用打電話或在群組公開留言。'}
      </div>
      <Card label={`📝 幫 ${studentName ?? '孩子'} 請假`}>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <select
            className="in"
            style={{ flex: 1 }}
            value={type}
            disabled={preview}
            onChange={(e) => setType(e.target.value as LeaveType)}
          >
            <option value="sick">病假</option>
            <option value="personal">事假</option>
            <option value="late">遲到</option>
          </select>
          <input
            className="in"
            type="date"
            style={{ flex: 1 }}
            value={leaveDate}
            disabled={preview}
            onChange={(e) => setLeaveDate(e.target.value)}
          />
        </div>
        <textarea
          className="ta"
          placeholder="原因（例：發燒需就醫）"
          value={reason}
          disabled={preview}
          onChange={(e) => setReason(e.target.value)}
          style={{ marginTop: 8 }}
        />
        <Button onClick={onSubmit} disabled={preview || submit.isPending} style={{ marginTop: 10 }}>
          {preview ? '預覽不可送出' : submit.isPending ? '送出中…' : '送出給老師'}
        </Button>
      </Card>
      {(list?.length ?? 0) > 0 && (
        <Card label="📮 我送出的請假">
          {list!.map((l) => (
            <div key={l.id} className="row">
              <div className="t">
                {LEAVE_TYPE_LABEL[l.type]} · {l.leaveDate}
                {l.reason ? <small>{l.reason}</small> : null}
              </div>
              <Pill tone={statusTone(l.status)}>{LEAVE_STATUS_LABEL[l.status]}</Pill>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
