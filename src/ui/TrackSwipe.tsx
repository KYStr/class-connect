import type { ReactNode, MouseEvent } from 'react';
import { Children } from 'react';

/** Horizontal snap strip; clicking a peeked slide scrolls it into view (desktop-friendly). */
export function TrackSwipe({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  const onItemClick = (e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.scrollIntoView({
      behavior: 'smooth',
      inline: 'start',
      block: 'nearest',
    });
  };

  return (
    <div className="track-swipe" aria-label={label}>
      {Children.map(children, (child) => (
        <div className="track-swipe-item" onClick={onItemClick}>
          {child}
        </div>
      ))}
    </div>
  );
}
