import { Card, EmptyState, Feature } from '@/ui';
import {
  useDistribution,
  useExams,
  useMyChildScore,
  usePercentile,
} from '@/hooks/useGrades';

// Parent grades (SPEC 3.1 / L4). Only published exams; own score + optional anonymous dist.
export function ParentGrades({
  classId,
  studentId,
}: {
  classId: string | undefined;
  studentId: string | undefined;
}) {
  const { data: exams } = useExams(classId);
  const published = (exams ?? []).filter((e) => e.published);

  if (!classId || !studentId) return <EmptyState>尚未綁定孩子</EmptyState>;
  if (published.length === 0) {
    return <EmptyState icon="📊">老師發布成績後，這裡會顯示孩子的分數</EmptyState>;
  }

  return (
    <>
      {published.map((exam) => (
        <ExamCard key={exam.id} examId={exam.id} name={exam.name} studentId={studentId} showDist={exam.showDist} />
      ))}
    </>
  );
}

function ExamCard({
  examId,
  name,
  studentId,
  showDist,
}: {
  examId: string;
  name: string;
  studentId: string;
  showDist: boolean;
}) {
  const { data: score } = useMyChildScore(examId, studentId);
  const { data: pct } = usePercentile(examId, studentId);
  const { data: dist } = useDistribution(showDist ? examId : undefined);
  const max = dist ? Math.max(1, ...dist.map((d) => d.count)) : 1;

  return (
    <Card label={`📊 ${name}`}>
      {score == null ? (
        <EmptyState>尚未登錄分數</EmptyState>
      ) : (
        <Feature
          variant="p"
          kicker="我的分數"
          title={`${score} 分`}
          sub={pct != null ? `勝過全班約 ${pct}% 的同學` : undefined}
          pct={score}
        />
      )}
      {showDist && dist && dist.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="lab" style={{ marginBottom: 6 }}>
            級距分布（匿名）
          </div>
          {dist.map((b) => (
            <div key={b.range} className="dist-row" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ width: 56, fontSize: 12, color: 'var(--muted)' }}>{b.range}</span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  background: 'var(--line)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(b.count / max) * 100}%`,
                    height: '100%',
                    background: 'var(--primary)',
                  }}
                />
              </div>
              <span style={{ width: 24, fontSize: 12, textAlign: 'right' }}>{b.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
