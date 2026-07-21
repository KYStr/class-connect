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
}

// Bottom tabs (DEVELOPMENT.md §10.2). Tabs appear dynamically per SPEC L2 (caller decides `items`).
export function TabBar({ variant, items, active, onSelect }: TabBarProps) {
  return (
    <div className="tabbar">
      {items.map((t) => {
        const isActive = t.key === active;
        const cls = ['tab', variant === 't' ? 't' : '', isActive ? 'act' : ''].filter(Boolean).join(' ');
        return (
          <button key={t.key} className={cls} onClick={() => onSelect(t.key)}>
            <span className="ic">{t.icon}</span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
