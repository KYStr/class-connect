import { useState } from 'react';
import { Button, Card, EmptyState, useToast } from '@/ui';
import { useRoster } from '@/hooks/useClasses';
import { useAddMilestone, useAddNote, useGrowthTimeline } from '@/hooks/useGrowth';
import { todayIso } from '@/services/contact';

// Teacher growth tab (SPEC 3.2 / L9). Text notes + milestones; photos land in a later polish.
export function GrowthPanel({ classId }: { classId: string | undefined }) {
  const { toast } = useToast();
  const { data: roster } = useRoster(classId);
  const [studentId, setStudentId] = useState<string | undefined>();
  const selected = studentId ?? roster?.[0]?.id;
  const { data: timeline } = useGrowthTimeline(selected);
  const addNote = useAddNote(classId, selected);
  const addMs = useAddMilestone(classId, selected);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<'note' | 'milestone'>('note');

  if (!classId) return <EmptyState>請先建立班級</EmptyState>;
  if (!roster || roster.length === 0) {
    return <EmptyState>請先加入學生，才能記錄成長</EmptyState>;
  }

  const submit = () => {
    if (!title.trim() || !selected) return;
    if (kind === 'note') {
      addNote.mutate(
        { emoji: '✨', title: title.trim(), body: body.trim() },
        {
          onSuccess: () => {
            setTitle('');
            setBody('');
            toast('已記錄亮點');
          },
        },
      );
    } else {
      addMs.mutate(
        {
          emoji: '🌱',
          title: title.trim(),
          body: body.trim(),
          occurredOn: todayIso(),
        },
        {
          onSuccess: () => {
            setTitle('');
            setBody('');
            toast('已加入里程碑');
          },
        },
      );
    }
  };

  return (
    <>
      <Card label="選擇學生">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {roster.map((s) => (
            <button
              key={s.id}
              className="read-btn"
              style={{
                background: s.id === selected ? 'var(--blue-soft)' : undefined,
              }}
              onClick={() => setStudentId(s.id)}
            >
              {s.seat} {s.name}
            </button>
          ))}
        </div>
      </Card>

      <Card label="✏️ 新增紀錄">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            className="read-btn"
            style={{ background: kind === 'note' ? 'var(--primary-soft)' : undefined }}
            onClick={() => setKind('note')}
          >
            ✨ 亮點
          </button>
          <button
            className="read-btn"
            style={{ background: kind === 'milestone' ? 'var(--pink-soft)' : undefined }}
            onClick={() => setKind('milestone')}
          >
            🌱 里程碑
          </button>
        </div>
        <input
          className="in"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === 'note' ? '例如：課堂主動發言' : '例如：學會騎腳踏車'}
        />
        <textarea
          className="ta"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="補充說明（可選）"
          style={{ minHeight: 60, marginTop: 8 }}
        />
        <Button tone="amber" style={{ marginTop: 10 }} onClick={submit}>
          儲存
        </Button>
      </Card>

      <Card label="🌱 時間軸預覽">
        {timeline && timeline.length > 0 ? (
          <div className="timeline">
            {timeline.map((item, i) => (
              <div key={`${item.kind}-${item.date}-${i}`} className="tl-item">
                <div className="tl-dot">{item.emoji}</div>
                <div>
                  <div className="tl-t">{item.title}</div>
                  {item.desc && <div className="tl-d">{item.desc}</div>}
                  <div className="tl-date">{item.date}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>還沒有紀錄，上面寫一則吧</EmptyState>
        )}
      </Card>
    </>
  );
}
