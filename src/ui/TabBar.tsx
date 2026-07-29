import { useEffect, useRef, useState } from 'react';

export interface TabItem {
  key: string;
  label: string;
  icon: string;
}

interface TabBarProps {
  variant: 'p' | 't';
  items: TabItem[];
  active: string;
  onSelect: (key: string) => void;
  /** Slide the active pill between tabs (paired with content slide). */
  animate?: boolean;
}

// Bottom tabs (DEVELOPMENT.md §10.2). Tabs appear dynamically per SPEC L2 (caller decides `items`).
export function TabBar({ variant, items, active, onSelect, animate = true }: TabBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const btn = bar.querySelector(`[data-tour="tab-${active}"]`) as HTMLElement | null;
    if (!btn) {
      setPill({ left: 0, width: 0 });
      return;
    }
    setPill({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [active, items]);

  return (
    <div className="tabbar" ref={barRef}>
      {animate && pill.width > 0 && (
        <div
          className={`tab-pill${variant === 't' ? ' t' : ''}`}
          style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
          aria-hidden="true"
        />
      )}
      {items.map((t) => {
        const isActive = t.key === active;
        const cls = ['tab', variant === 't' ? 't' : '', isActive ? 'act' : '']
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={t.key}
            type="button"
            className={cls}
            data-tour={`tab-${t.key}`}
            onClick={() => onSelect(t.key)}
          >
            <span className="ic" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
