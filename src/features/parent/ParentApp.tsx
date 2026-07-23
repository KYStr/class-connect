import { useState } from 'react';
import { AppBar, EmptyState, Feature, PhoneShell, StatusBar, TabBar } from '@/ui';
import type { TabItem } from '@/ui';
import { useAuth } from '@/app/AuthProvider';
import { useMyChildren } from '@/hooks/useMyChildren';
import { useFeatures } from '@/hooks/useFeatures';
import { useHomework } from '@/hooks/useContact';
import { useClassRealtime } from '@/hooks/useClassRealtime';
import { todayIso } from '@/services/contact';
import { ParentAnnouncements } from './ParentAnnouncements';
import { ParentContact } from './ParentContact';
import { ParentGrades } from './ParentGrades';
import { ParentGrowth } from './ParentGrowth';

// Parent shell (SPEC 2.1 / 3.1). Tabs follow teacher feature switches (L16) + L2 content rules.

export function ParentApp() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState('home');
  const { data: children } = useMyChildren();
  const child = children?.[0];
  const { data: features } = useFeatures(child?.classId);
  const { data: hw } = useHomework(child?.classId, todayIso(), child?.id);
  useClassRealtime(child?.classId);

  const doneCount = (hw ?? []).filter((h) => h.done).length;
  const total = hw?.length ?? 0;
  const pct = total === 0 ? 100 : Math.round((doneCount / total) * 100);

  const safeTab =
    (tab === 'growth' && !features?.growth) || (tab === 'grades' && !features?.grades)
      ? 'home'
      : tab;

  const tabs: TabItem[] = [
    { key: 'home', label: '首頁', icon: '🏠' },
    { key: 'contact', label: '聯絡簿', icon: '📒' },
    { key: 'announcements', label: '公告', icon: '📣' },
    ...(features?.growth ? [{ key: 'growth', label: '成長', icon: '🌱' } as TabItem] : []),
    ...(features?.grades ? [{ key: 'grades', label: '成績', icon: '📊' } as TabItem] : []),
  ];

  const heads: Record<string, string> = {
    home: '今天',
    contact: '聯絡簿',
    announcements: '班級公告',
    growth: '成長',
    grades: '成績',
  };

  return (
    <div className="stage">
      <PhoneShell
        chrome={
          <>
            <StatusBar />
            <AppBar
              variant="p"
              classLabel={`🏫 ${child ? `${child.name}的清單` : '我的清單'}`}
              title={heads[safeTab] ?? '首頁'}
              onLogout={signOut}
            />
          </>
        }
        tabbar={<TabBar variant="p" items={tabs} active={safeTab} onSelect={setTab} />}
      >
        {safeTab === 'home' && (
          <div className="body">
            <Feature
              variant="p"
              kicker="今日作業"
              title={total === 0 ? '今天沒有作業 🎉' : `已完成 ${doneCount}/${total} 項`}
              sub={total === 0 ? '好好休息一下' : '到聯絡簿打勾回報'}
              pct={pct}
            />
            <div className="qa-grid">
              <div
                className="qa"
                style={{ opacity: features?.calendar ? 1 : 0.45 }}
                onClick={() => features?.calendar && undefined}
              >
                <div className="qa-i">📅</div>
                <div className="qa-t">行事曆</div>
              </div>
              <div
                className="qa amber"
                style={{ opacity: features?.leave ? 1 : 0.45 }}
              >
                <div className="qa-i">🤒</div>
                <div className="qa-t">請假</div>
              </div>
              <div className="qa blue">
                <div className="qa-i">💬</div>
                <div className="qa-t">聯絡老師</div>
              </div>
            </div>
            {!features?.grades && !features?.growth && (
              <div className="info p">
                🌱 老師之後開啟更多功能時，這裡會慢慢長出新分頁。
              </div>
            )}
          </div>
        )}

        {safeTab === 'contact' && (
          <div className="body">
            <ParentContact classId={child?.classId} studentId={child?.id} />
          </div>
        )}

        {safeTab === 'announcements' && (
          <div className="body">
            <ParentAnnouncements classId={child?.classId} />
          </div>
        )}

        {safeTab === 'growth' && (
          <div className="body">
            <ParentGrowth studentId={child?.id} />
          </div>
        )}

        {safeTab === 'grades' && (
          <div className="body">
            <ParentGrades classId={child?.classId} studentId={child?.id} />
          </div>
        )}

        {!['home', 'contact', 'announcements', 'growth', 'grades'].includes(safeTab) && (
          <div className="body">
            <EmptyState>未知分頁</EmptyState>
          </div>
        )}
      </PhoneShell>
    </div>
  );
}
