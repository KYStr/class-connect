import type { SlideDir } from './PhoneShell';

interface AppBarProps {
  variant: 'p' | 't';
  classLabel: string;
  title: string;
  /** show a back button instead of the trailing action */
  onBack?: () => void;
  /** trailing action (e.g. logout); ignored when onBack is set */
  onLogout?: () => void;
  /** Title slides in with tab change (no slide-out). */
  titleSlideDir?: SlideDir;
}

// Colored title bar (DEVELOPMENT.md §10.2). The floating panel overlaps it via negative margin.
export function AppBar({
  variant,
  classLabel,
  title,
  onBack,
  onLogout,
  titleSlideDir = null,
}: AppBarProps) {
  const titleClass =
    titleSlideDir === 'right'
      ? 'h title-slide-in-right'
      : titleSlideDir === 'left'
        ? 'h title-slide-in-left'
        : 'h';

  return (
    <div className={`appbar ${variant}`}>
      {onBack ? (
        <button type="button" className="logout" onClick={onBack}>
          ‹ 返回
        </button>
      ) : onLogout ? (
        <button type="button" className="logout" onClick={onLogout}>
          登出
        </button>
      ) : null}
      <div className="cls">{classLabel}</div>
      <div key={title} className={titleClass}>
        {title}
      </div>
    </div>
  );
}
