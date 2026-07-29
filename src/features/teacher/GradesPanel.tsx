import { useState } from 'react';
import { Button, Card, EmptyState, GhostButton, Pill, TaxonomySelect, useToast } from '@/ui';
import {
  useAddExamType,
  useAddSubject,
  useArchiveExam,
  useDeleteExam,
  useDeleteExamType,
  useDeleteSubject,
  useExamRoster,
  useExamTypes,
  useExams,
  useSetScore,
  useSubjects,
  useUnarchiveExam,
  useUpsertExam,
} from '@/hooks/useGrades';

// Teacher grades tab (SPEC 3.2 / L4) — subjects/types picked at create time.
export function GradesPanel({ classId }: { classId: string | undefined }) {
  const { toast } = useToast();
  const [showArchived, setShowArchived] = useState(false);
  const { data: exams } = useExams(classId, showArchived);
  const { data: subjects } = useSubjects(classId);
  const { data: types } = useExamTypes(classId);
  const upsert = useUpsertExam(classId);
  const del = useDeleteExam(classId);
  const archive = useArchiveExam(classId);
  const unarchive = useUnarchiveExam(classId);
  const addSubject = useAddSubject(classId);
  const addType = useAddExamType(classId);
  const delSubject = useDeleteSubject(classId);
  const delType = useDeleteExamType(classId);

  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examTypeId, setExamTypeId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  if (!classId) return <EmptyState>請先建立班級</EmptyState>;

  const active = exams?.find((e) => e.id === activeId) ?? exams?.[0];
  const examId = active?.id;

  return (
    <>
      {!showArchived && (
        <div className="card fold-card fold-card-plus">
          <details>
            <summary>
              <span>➕ 新增考試</span>
            </summary>
            <div className="fold-body">
              <div className="grade-create">
                <TaxonomySelect
                  label="科目"
                  value={subjectId}
                  options={subjects ?? []}
                  placeholder="請選擇科目"
                  addLabel="新增科目"
                  addPlaceholder="例如：數學"
                  adding={addSubject.isPending}
                  onChange={setSubjectId}
                  onAdd={async (n) => {
                    const s = await addSubject.mutateAsync(n);
                    toast('已新增科目');
                    return s;
                  }}
                  onDelete={(id) =>
                    delSubject.mutate(id, {
                      onSuccess: () => toast('已刪除科目（相關考試仍保留）'),
                      onError: (e) => toast(e instanceof Error ? e.message : '刪除失敗'),
                    })
                  }
                />
                <TaxonomySelect
                  label="考試類型"
                  value={examTypeId}
                  options={types ?? []}
                  placeholder="請選擇類型"
                  addLabel="新增類型"
                  addPlaceholder="例如：複習考"
                  adding={addType.isPending}
                  onChange={setExamTypeId}
                  onAdd={async (n) => {
                    const t = await addType.mutateAsync(n);
                    toast('已新增類型');
                    return t;
                  }}
                  onDelete={(id) =>
                    delType.mutate(id, {
                      onSuccess: () => toast('已刪除類型（相關考試仍保留）'),
                      onError: (e) => toast(e instanceof Error ? e.message : '刪除失敗'),
                    })
                  }
                />
                <div className="field">
                  <label>考試名稱</label>
                  <input
                    className="in"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：第一次數學小考"
                  />
                </div>
                <Button
                  tone="amber"
                  onClick={() => {
                    if (!name.trim()) {
                      toast('請填考試名稱');
                      return;
                    }
                    if (!subjectId || !examTypeId) {
                      toast('請先選擇科目與考試類型');
                      return;
                    }
                    upsert.mutate(
                      {
                        name: name.trim(),
                        published: false,
                        showDist: true,
                        subjectId,
                        examTypeId,
                      },
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
            </div>
          </details>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {showArchived ? '封存庫（舊考試仍保留）' : '進行中（最新在前）'}
        </div>
        <button
          type="button"
          className="ghost-btn"
          style={{ width: 'auto', padding: '6px 12px' }}
          onClick={() => {
            setShowArchived((v) => !v);
            setActiveId(undefined);
          }}
        >
          {showArchived ? '返回進行中' : '查看封存'}
        </button>
      </div>

      {exams && exams.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {exams.map((e) => (
            <button
              key={e.id}
              type="button"
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
          archived={showArchived}
          onDeleted={() => {
            setActiveId(undefined);
            del.mutate(examId, { onSuccess: () => toast('已刪除考試') });
          }}
          onArchive={() => {
            setActiveId(undefined);
            archive.mutate(examId, {
              onSuccess: () => toast('已封存 · 可在「查看封存」找回'),
            });
          }}
          onUnarchive={() => {
            setActiveId(undefined);
            unarchive.mutate(examId, { onSuccess: () => toast('已還原到進行中') });
          }}
          onTogglePublish={(published) =>
            upsert.mutate(
              {
                id: examId,
                name: active.name,
                published,
                showDist: active.showDist,
                subjectId: active.subjectId,
                examTypeId: active.examTypeId,
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
              subjectId: active.subjectId,
              examTypeId: active.examTypeId,
            })
          }
        />
      ) : (
        <EmptyState icon="📊">
          {showArchived ? '封存庫是空的' : '建立一場考試後，即可為每位學生登錄分數'}
        </EmptyState>
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
  archived,
  onDeleted,
  onArchive,
  onUnarchive,
  onTogglePublish,
  onToggleDist,
}: {
  classId: string;
  examId: string;
  published: boolean;
  showDist: boolean;
  name: string;
  archived: boolean;
  onDeleted: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onTogglePublish: (v: boolean) => void;
  onToggleDist: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const { data: roster } = useExamRoster(examId);
  const setScoreMut = useSetScore(examId, classId);
  void name;

  return (
    <Card label={`登錄分數 · ${published ? '已公開' : '草稿'}`}>
      {!archived && (
        <>
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
        </>
      )}

      {roster?.map(({ student, score }) => (
        <div key={`${examId}-${student.id}`} className="rl">
          <div className="seat">{student.seat}</div>
          <div className="nm">{student.name}</div>
          <input
            key={`${examId}-${student.id}-score`}
            className="in grade-score-in"
            type="number"
            min={0}
            max={100}
            placeholder="—"
            defaultValue={score ?? ''}
            readOnly={archived}
            onBlur={(e) => {
              if (archived) return;
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

      <div className="exam-actions">
        {archived ? (
          <GhostButton onClick={onUnarchive}>還原</GhostButton>
        ) : (
          <GhostButton onClick={onArchive}>封存</GhostButton>
        )}
        <GhostButton onClick={onDeleted}>刪除</GhostButton>
      </div>
      {published && !archived && (
        <div style={{ marginTop: 6 }}>
          <Pill tone="g">家長端已可見</Pill>
        </div>
      )}
    </Card>
  );
}
