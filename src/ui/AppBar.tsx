interface AppBarProps {
  variant: 'p' | 't';
  classLabel: string;
  title: string;
  /** show a back button instead of the trailing action */
  onBack?: () => void;
  /** trailing action (e.g. logout); ignored when onBack is set */
  onLogout?: () => void;
}

// Colored title bar (DEVELOPMENT.md §10.2). The floating panel overlaps it via negative margin.
export function AppBar({ variant, classLabel, title, onBack, onLogout }: AppBarProps) {
  return (
    <div className={`appbar ${variant}`}>
      {onBack ? (
        <button className="logout" onClick={onBack}>
          ‹ 返回
        </button>
      ) : onLogout ? (
        <button className="logout" onClick={onLogout}>
          登出
        </button>
      ) : null}
      <div className="cls">{classLabel}</div>
      <div className="h">{title}</div>
    </div>
  );
}
