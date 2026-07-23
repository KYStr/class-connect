import { useState } from 'react';
import { AppBar, EmptyState, Feature, PhoneShell, StatusBar, TabBar } from '@/ui';
import type { TabItem } from '@/ui';
import { useAuth } from '@/app/AuthProvider';
import { useMyChildren } from '@/hooks/useMyChildren';
import { useFeatures } from '@/hooks/useFeatures';

// Parent shell (SPEC 2.1 / 3.1). Tabs follow the teacher's feature switches (SPEC L16),
// layered with "show only if published" (SPEC L2) as each feature slice lands.

export function ParentApp() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState('home');
  const { data: children } = useMyChildren();
  const child = children?.[0];
  const { data: features } = useFeatures(child?.classId);

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
              title={heads[tab] ?? '首頁'}
              onLogout={signOut}
            />
          </>
        }
        tabbar={<TabBar variant="p" items={tabs} active={tab} onSelect={setTab} />}
      >
        {tab === 'home' && (
          <div className="body">
            <Feature
              variant="p"
              kicker="今日作業"
              title="今天沒有作業 🎉"
              sub="好好休息一下"
              pct={100}
            />
            <div className="qa-grid">
              <div className="qa">
                <div className="qa-i">📅</div>
                <div className="qa-t">行事曆</div>
              </div>
              <div className="qa amber">
                <div className="qa-i">🤒</div>
                <div className="qa-t">請假</div>
              </div>
              <div className="qa blue">
                <div className="qa-i">💬</div>
                <div className="qa-t">聯絡老師</div>
              </div>
            </div>
            <div className="info p">☝️ P0 骨架：畫面與樣式已就緒，資料串接於 P2 完成。</div>
          </div>
        )}

        {tab === 'contact' && (
          <div className="body">
            <div className="info p">✅ 完成的項目可以自己打勾，老師端會同步看到完成人數</div>
            <div className="card">
              <div className="lab">✍️ 今日作業</div>
              <EmptyState>今天沒有作業 🎉</EmptyState>
            </div>
            <div className="card">
              <div className="lab">🎒 明日攜帶</div>
              <EmptyState>明天不用帶特別的東西</EmptyState>
            </div>
          </div>
        )}

        {tab === 'announcements' && (
          <div className="body">
            <EmptyState icon="📭">目前沒有公告</EmptyState>
          </div>
        )}

        {tab === 'growth' && (
          <div className="body">
            <EmptyState icon="🌱">老師開始記錄後，這裡會長出孩子的成長時間軸</EmptyState>
          </div>
        )}

        {tab === 'grades' && (
          <div className="body">
            <EmptyState icon="📊">老師發布成績後，這裡會顯示孩子的分數</EmptyState>
          </div>
        )}
      </PhoneShell>
    </div>
  );
}
