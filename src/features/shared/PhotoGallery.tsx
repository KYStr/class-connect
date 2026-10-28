import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Photo } from '@/types/domain';

export function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: Photo[];
  onOpen: (photo: Photo) => void;
}) {
  return (
    <div className="photo-grid">
      {photos.map((photo) => (
        <button key={photo.id} type="button" className="photo-cell" onClick={() => onOpen(photo)}>
          {photo.url ? <img src={photo.url} alt={photo.caption ?? '照片'} /> : <div className="photo-ph" />}
          {photo.caption ? <span>{photo.caption}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function PhotoViewer({ photo, onClose }: { photo: Photo | null; onClose: () => void }) {
  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photo, onClose]);

  if (!photo) return null;
  return createPortal(
    <div className="photo-viewer" role="dialog" aria-modal="true" aria-label="照片">
      <button type="button" className="photo-viewer-mask" aria-label="關閉" onClick={onClose} />
      <div className="photo-viewer-frame">
        {photo.url ? <img src={photo.url} alt={photo.caption ?? '照片'} /> : null}
        {photo.caption ? <p>{photo.caption}</p> : null}
        <button type="button" className="read-btn" onClick={onClose}>
          關閉
        </button>
      </div>
    </div>,
    document.body,
  );
}
