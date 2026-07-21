import { useState } from 'react';
import { AppBar, EmptyState, Feature, PhoneShell, StatusBar, TabBar } from '@/ui';
import type { TabItem } from '@/ui';
import { useAuth } from '@/app/AuthProvider';
import { useMyClasses, useRoster } from '@/hooks/useClasses';
import { ClassManager } from './ClassManager';

// Teacher shell (SPEC 2.2 / 3.2). P0 skeleton: fixed 5 tabs + overview with to-do/stats scaffold.
const TABS: TabItem[] = [
  { key: 'overview', label: '總覽', icon: '📋' },
  { key: 'announcements', label: '公告', icon: '📣' },
  { key: 'contact', label: '聯絡簿', icon: '📒' },
  { key: 'growth', label: '成長', icon: '🌱' },
  { key: 'grades', label: '成績', icon: '📊' },
];

export function TeacherApp() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState('overview');
  const { data: classes } = useMyClasses();
  const cls = classes?.[0];
  const { data: roster } = useRoster(cls?.id);
  const classSize = roster?.length ?? 0;

  const heads: Record<string, string> = {
    overview: '後台總覽',
    announcements: '發布公告',
    contact: '今日聯絡簿',
    growth: '記錄孩子的成長',
    grades: '登錄成績',
  };

  return (
    <div className="stage">
      <PhoneShell
        chrome={
          <>
            <StatusBar />
            <AppBar
              variant="t"
              classLabel={`👩‍🏫 導師後台 · ${cls?.name ?? '尚未建立班級'}`}
              title={heads[tab] ?? '總覽'}
              onLogout={signOut}
            />
          </>
        }
        tabbar={<TabBar variant="t" items={TABS} active={tab} onSelect={setTab} />}
      >
        {tab === 'overview' && (
          <div className="body">
            <Feature
              variant="t"
              kicker="今日班級動態"
              title="家長完成 0/0 項作業"
              sub="0 則公告 · 0 項攜帶 · 即時更新"
              pct={0}
            />
            <ClassManager />
            <div className="card">
              <div className="lab">🔔 今日待辦</div>
              <EmptyState icon="✅">目前沒有待辦事項</EmptyState>
            </div>
            <div className="stat-grid">
              <div className="stat">
                <div className="num">
                  {classSize}
                  <small> 位</small>
                </div>
                <div className="k">班級人數</div>
              </div>
              <div className="stat">
                <div className="num" style={{ color: 'var(--primary)' }}>
                  0<small>/0 項</small>
                </div>
                <div className="k">作業家長已勾完成</div>
              </div>
              <div className="stat">
                <div className="num">
                  0<small> 則</small>
                </div>
                <div className="k">目前公告</div>
              </div>
              <div className="stat">
                <div className="num">
                  0<small> 項</small>
                </div>
                <div className="k">明日攜帶</div>
              </div>
            </div>
            <div className="quick">
              <div className="q" onClick={() => setTab('announcements')}>
                <div className="qi" style={{ background: 'var(--accent-soft)' }}>
                  📣
                </div>
                <div className="qt">發公告</div>
                <div className="qs">全班通知</div>
              </div>
              <div className="q" onClick={() => setTab('contact')}>
                <div className="qi" style={{ background: 'var(--primary-soft)' }}>
                  📒
                </div>
                <div className="qt">寫聯絡簿</div>
                <div className="qs">作業/攜帶</div>
              </div>
              <div className="q" onClick={() => setTab('growth')}>
                <div className="qi" style={{ background: 'var(--blue-soft)' }}>
                  📸
                </div>
                <div className="qt">記成長</div>
                <div className="qs">文字/照片</div>
              </div>
              <div className="q" onClick={() => setTab('grades')}>
                <div className="qi" style={{ background: 'var(--pink-soft)' }}>
                  📊
                </div>
                <div className="qt">登成績</div>
                <div className="qs">分數/級距</div>
              </div>
            </div>
            <div className="info a">☝️ P0 骨架：後台樣式已就緒，資料與發布流程於 P2/P3 完成。</div>
          </div>
        )}

        {tab !== 'overview' && (
          <div className="body">
            <EmptyState icon="🛠️">此分頁的功能將於 P2/P3 依 SPEC 逐一實作</EmptyState>
          </div>
        )}
      </PhoneShell>
    </div>
  );
}
