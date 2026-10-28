import { useState } from 'react';
import { Card, EmptyState } from '@/ui';
import { useGrowthTimeline, useMemoryBook, usePhotos } from '@/hooks/useGrowth';
import type { Photo } from '@/types/domain';
import { PhotoGrid, PhotoViewer } from '@/features/shared/PhotoGallery';

// Parent growth timeline (SPEC 3.1 / L9).
export function ParentGrowth({ studentId }: { studentId: string | undefined }) {
  const { data: timeline, isLoading } = useGrowthTimeline(studentId);
  const { data: stats } = useMemoryBook(studentId);
  const { data: photos } = usePhotos(studentId);
  const [open, setOpen] = useState<Photo | null>(null);

  if (!studentId) return <EmptyState>尚未綁定孩子</EmptyState>;
  if (isLoading) return <EmptyState>載入中…</EmptyState>;
  if ((!timeline || timeline.length === 0) && (!photos || photos.length === 0)) {
    return <EmptyState icon="🌱">老師開始記錄後，這裡會長出孩子的成長時間軸</EmptyState>;
  }

  return (
    <>
      {stats && (
        <div className="stat-grid">
          <div className="stat">
            <div className="num">
              {stats.notes}
              <small> 則</small>
            </div>
            <div className="k">老師亮點</div>
          </div>
          <div className="stat">
            <div className="num">
              {stats.milestones}
              <small> 則</small>
            </div>
            <div className="k">里程碑</div>
          </div>
          <div className="stat">
            <div className="num">
              {stats.photos}
              <small> 張</small>
            </div>
            <div className="k">照片</div>
          </div>
          <div className="stat">
            <div className="num">
              {stats.latestScore ?? '—'}
              <small>{stats.latestScore != null ? ' 分' : ''}</small>
            </div>
            <div className="k">最近成績</div>
          </div>
        </div>
      )}

      <Card label="📸 最近照片">
        {photos && photos.length > 0 ? (
          <PhotoGrid photos={photos} onOpen={setOpen} />
        ) : (
          <EmptyState>還沒有照片</EmptyState>
        )}
      </Card>
      <PhotoViewer photo={open} onClose={() => setOpen(null)} />

      <Card label="🌱 成長時間軸">
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
          <EmptyState>還沒有文字紀錄</EmptyState>
        )}
      </Card>
    </>
  );
}
