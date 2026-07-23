import { useState } from 'react';

// Short, dismissible helper tip (SPEC L17). Remembers "don't show again" in localStorage.
export function DismissibleTip({
  storageKey,
  children,
}: {
  storageKey: string;
  children: string;
}) {
  const key = `cc_tip_${storageKey}`;
  const [hidden, setHidden] = useState(() => localStorage.getItem(key) === '1');
  const [open, setOpen] = useState(!hidden);

  if (hidden && !open) {
    return (
      <button
        type="button"
        className="tip-help"
        title="查看說明"
        aria-label="查看說明"
        onClick={() => setOpen(true)}
      >
        ?
      </button>
    );
  }

  return (
    <div className="info a tip-box">
      <div className="tip-text">{children}</div>
      <div className="tip-actions">
        <button
          type="button"
          className="tip-btn"
          onClick={() => {
            localStorage.setItem(key, '1');
            setHidden(true);
            setOpen(false);
          }}
        >
          不再顯示
        </button>
        {hidden && (
          <button type="button" className="tip-btn ghost" onClick={() => setOpen(false)}>
            收起
          </button>
        )}
      </div>
    </div>
  );
}
