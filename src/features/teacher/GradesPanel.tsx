import { useState } from 'react';
import { Button, Card, EmptyState, GhostButton, Pill, useToast } from '@/ui';
import {
  useDeleteExam,
  useExamRoster,
  useExams,
  useSetScore,
  useUpsertExam,
} from '@/hooks/useGrades';

// Teacher grades tab (SPEC 3.2 / L4). Only shown when feature switch is on.
export function GradesPanel({ classId }: { classId: string | undefined }) {
  const { toast } = useToast();
  const { data: exams } = useExams(classId);
  const upsert = useUpsertExam(classId);
  const del = useDeleteExam(classId);
  const [name, setName] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  if (!classId) return <EmptyState>請先建立班級</EmptyState>;

  const active = exams?.find((e) => e.id === activeId) ?? exams?.[0];
  const examId = active?.id;

  return (
    <>
      <Card label="➕ 新增考試">
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="in"
            style={{ marginTop: 0, flex: 1 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：第一次數學小考"
          />
          <Button
            tone="amber"
            onClick={() => {
              if (!name.trim()) return;
              upsert.mutate(
                { name: name.trim(), published: false, showDist: true },
                {
                  onSuccess: (e) => {
                    setName('');
                    setActiveId(e.id);
                    toast('已建立考試（尚未公開）');
                  },
                },
              );
            }}
            disabled={upsert.isPending}
          >
            建立
          </Button>
        </div>
      </Card>

      {exams && exams.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {exams.map((e) => (
            <button
              key={e.id}
              className="read-btn"
              style={{
                background: e.id === examId ? 'var(--accent-soft)' : undefined,
                borderColor: e.id === examId ? 'var(--accent)' : undefined,
              }}
              onClick={() => setActiveId(e.id)}
            >
              {e.name}
              {e.published ? ' · 已公開' : ' · 草稿'}
            </button>
          ))}
        </div>
      )}

      {examId && active ? (
        <ExamEditor
          classId={classId}
          examId={examId}
          published={active.published}
          showDist={active.showDist}
          name={active.name}
          onDeleted={() => {
            setActiveId(undefined);
            del.mutate(examId, { onSuccess: () => toast('已刪除考試') });
          }}
          onTogglePublish={(published) =>
            upsert.mutate(
              {
                id: examId,
                name: active.name,
                published,
                showDist: active.showDist,
              },
              { onSuccess: () => toast(published ? '已對家長公開' : '已改為草稿') },
            )
          }
          onToggleDist={(showDist) =>
            upsert.mutate({
              id: examId,
              name: active.name,
              published: active.published,
              showDist,
            })
          }
        />
      ) : (
        <EmptyState icon="📊">建立一場考試後，即可為每位學生登錄分數</EmptyState>
      )}
    </>
  );
}

function ExamEditor({
  classId,
  examId,
  published,
  showDist,
  name,
  onDeleted,
  onTogglePublish,
  onToggleDist,
}: {
  classId: string;
  examId: string;
  published: boolean;
  showDist: boolean;
  name: string;
  onDeleted: () => void;
  onTogglePublish: (v: boolean) => void;
  onToggleDist: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const { data: roster } = useExamRoster(examId);
  const setScoreMut = useSetScore(examId, classId);
  void name;

  return (
    <Card label={`登錄分數 · ${published ? '已公開' : '草稿'}`}>
      <div className="toggle-row" style={{ padding: '4px 0' }}>
        <div className="tx">
          對家長公開
          <small>公開後家長才能看到自己孩子的分數</small>
        </div>
        <label className="sw2">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => onTogglePublish(e.target.checked)}
          />
          <span className="sw2-tr" />
        </label>
      </div>
      <div className="toggle-row" style={{ padding: '4px 0' }}>
        <div className="tx">
          顯示級距分布
          <small>家長端只看匿名級距，看不到別人分數</small>
        </div>
        <label className="sw2">
          <input
            type="checkbox"
            checked={showDist}
            onChange={(e) => onToggleDist(e.target.checked)}
          />
          <span className="sw2-tr" />
        </label>
      </div>

      {roster?.map(({ student, score }) => (
        <div key={student.id} className="rl">
          <div className="seat">{student.seat}</div>
          <div className="nm">{student.name}</div>
          <input
            className="in"
            style={{ marginTop: 0, width: 64, textAlign: 'center' }}
            type="number"
            min={0}
            max={100}
            placeholder="—"
            defaultValue={score ?? ''}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              const next = raw === '' ? null : Number(raw);
              if (next !== null && (Number.isNaN(next) || next < 0 || next > 100)) {
                toast('分數需介於 0–100');
                return;
              }
              if (next === score) return;
              setScoreMut.mutate({ studentId: student.id, score: next });
            }}
          />
        </div>
      ))}

      <GhostButton style={{ marginTop: 8 }} onClick={onDeleted}>
        刪除此考試
      </GhostButton>
      {published && (
        <div style={{ marginTop: 6 }}>
          <Pill tone="g">家長端已可見</Pill>
        </div>
      )}
    </Card>
  );
}
