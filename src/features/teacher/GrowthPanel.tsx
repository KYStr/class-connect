import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, useToast } from '@/ui';
import { useRoster } from '@/hooks/useClasses';
import { useAddMilestone, useAddNote, useCreatePhoto, useDeletePhoto, useGrowthTimeline, usePhotos } from '@/hooks/useGrowth';
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
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [tagged, setTagged] = useState<string[]>([]);
  const [uploadLabel, setUploadLabel] = useState('');
  const { data: photos } = usePhotos(selected);
  const createPhoto = useCreatePhoto(classId, selected);
  const removePhoto = useDeletePhoto(selected);

  useEffect(() => {
    if (selected) setTagged([selected]);
  }, [selected]);

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

  const uploadPhotos = async () => {
    if (!selected || files.length === 0) {
      toast(files.length === 0 ? '請先選擇照片' : '請先選擇學生');
      return;
    }
    if (tagged.length === 0) {
      toast('請至少標記一位學生');
      return;
    }
    let done = 0;
    try {
      for (const file of files) {
        done += 1;
        setUploadLabel(`上傳中 ${done}/${files.length}`);
        await createPhoto.mutateAsync({ studentIds: tagged, caption, file });
      }
      setFiles([]);
      setCaption('');
      toast(`已上傳 ${files.length} 張照片`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '上傳失敗');
    } finally {
      setUploadLabel('');
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

      <Card label="📸 照片">
        <div className="roster-hint">標記照片裡的孩子。只有被標記的家長看得到，不會整班公開。</div>
        <label className="roster-file-btn">
          {files.length > 0 ? `已選 ${files.length} 張` : '選擇照片'}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              setFiles([...(e.target.files ?? [])]);
              e.target.value = '';
            }}
          />
        </label>
        <input
          className="in"
          style={{ marginTop: 8 }}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="說明（可選），例如：戶外課完成作品"
        />
        <div className="roster-hint" style={{ marginTop: 8 }}>
          標記的孩子
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {roster.map((s) => {
            const on = tagged.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                className="read-btn"
                style={{ background: on ? 'var(--primary-soft)' : undefined }}
                onClick={() =>
                  setTagged((prev) =>
                    prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                  )
                }
              >
                {on ? '✓ ' : ''}
                {s.seat} {s.name}
              </button>
            );
          })}
        </div>
        <Button
          tone="amber"
          style={{ marginTop: 10 }}
          disabled={Boolean(uploadLabel) || files.length === 0}
          onClick={() => void uploadPhotos()}
        >
          {uploadLabel || '上傳'}
        </Button>
        {photos && photos.length > 0 ? (
          <div className="photo-grid" style={{ marginTop: 12 }}>
            {photos.map((photo) => (
              <figure key={photo.id} className="photo-cell">
                {photo.url ? <img src={photo.url} alt={photo.caption ?? ''} /> : <div className="photo-ph" />}
                {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
                <button
                  type="button"
                  className="read-btn"
                  disabled={removePhoto.isPending}
                  onClick={() => {
                    if (window.confirm('刪除這張照片？被標記的家長也會看不到。')) {
                      removePhoto.mutate(photo, {
                        onSuccess: () => toast('已刪除照片'),
                        onError: (e) => toast(e instanceof Error ? e.message : '刪除失敗'),
                      });
                    }
                  }}
                >
                  刪除
                </button>
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState>還沒有照片，選幾張上傳吧</EmptyState>
        )}
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
