import { Card, EmptyState } from '@/ui';
import { useBring, useHomework, useToggleHomeworkDone } from '@/hooks/useContact';
import { todayIso } from '@/services/contact';

// Parent contact book (SPEC 3.1 / L3) — check off homework; bring is read-only.
export function ParentContact({
  classId,
  studentId,
  preview = false,
}: {
  classId: string | undefined;
  studentId: string | undefined;
  preview?: boolean;
}) {
  const date = todayIso();
  const { data: hw } = useHomework(classId, date, studentId);
  const { data: bring } = useBring(classId, date);
  const toggle = useToggleHomeworkDone(classId, date);

  if (!classId || !studentId) return <EmptyState>尚未綁定孩子</EmptyState>;

  const doneCount = (hw ?? []).filter((h) => h.done).length;
  const total = hw?.length ?? 0;

  return (
    <>
      <div className="info p">
        {preview
          ? '👁 預覽：家長可在此打勾回報（預覽不可操作）'
          : '✅ 完成的項目可以自己打勾，老師端會同步看到完成人數'}
        {total > 0 ? ` · 已完成 ${doneCount}/${total}` : ''}
      </div>

      <Card label="✍️ 今日作業">
        {hw && hw.length > 0 ? (
          hw.map((h) => (
            <label
              key={h.id}
              className="rl"
              style={{ cursor: preview ? 'default' : 'pointer', opacity: preview ? 0.92 : 1 }}
            >
              <input
                type="checkbox"
                checked={Boolean(h.done)}
                disabled={preview}
                onChange={(e) =>
                  toggle.mutate({
                    homeworkId: h.id,
                    studentId,
                    done: e.target.checked,
                  })
                }
              />
              <div className="nm" style={{ flex: 1, textDecoration: h.done ? 'line-through' : undefined }}>
                {h.text}
                {h.note && (
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{h.note}</div>
                )}
              </div>
            </label>
          ))
        ) : (
          <EmptyState>今天沒有作業 🎉</EmptyState>
        )}
      </Card>

      <Card label="🎒 明日攜帶">
        {bring && bring.length > 0 ? (
          bring.map((b) => (
            <div key={b.id} className="rl">
              <div className="nm">{b.text}</div>
            </div>
          ))
        ) : (
          <EmptyState>明天不用帶特別的東西</EmptyState>
        )}
      </Card>
    </>
  );
}
