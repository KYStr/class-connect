import { useState } from 'react';
import { AppBar, EmptyState, Feature, PhoneShell, StatusBar, TabBar } from '@/ui';
import type { TabItem } from '@/ui';
import { useAuth } from '@/app/AuthProvider';
import { useMyClasses, useRoster } from '@/hooks/useClasses';
import { useFeatures } from '@/hooks/useFeatures';
import { useAnnouncementsWithStats } from '@/hooks/useAnnouncements';
import { useBring, useHomeworkCompletion } from '@/hooks/useContact';
import { useClassRealtime } from '@/hooks/useClassRealtime';
import { todayIso } from '@/services/contact';
import { ClassManager } from './ClassManager';
import { FeatureSettings } from './FeatureSettings';
import { AnnouncementsPanel } from './AnnouncementsPanel';
import { ContactPanel } from './ContactPanel';
import { GradesPanel } from './GradesPanel';
import { GrowthPanel } from './GrowthPanel';

// Teacher shell (SPEC 2.2 / 3.2). Tabs follow class feature switches (SPEC L16).

export function TeacherApp() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState('overview');
  const { data: classes } = useMyClasses();
  const cls = classes?.[0];
  const { data: roster } = useRoster(cls?.id);
  const { data: features } = useFeatures(cls?.id);
  const date = todayIso();
  const { data: completion } = useHomeworkCompletion(cls?.id, date);
  const { data: bring } = useBring(cls?.id, date);
  const { data: anns } = useAnnouncementsWithStats(cls?.id);
  useClassRealtime(cls?.id);

  const classSize = roster?.length ?? 0;
  const done = completion?.done ?? 0;
  const total = completion?.total ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const annCount = anns?.length ?? 0;
  const bringCount = bring?.length ?? 0;

  // If the active tab was gated off, fall back to overview.
  const safeTab =
    (tab === 'growth' && !features?.growth) || (tab === 'grades' && !features?.grades)
      ? 'overview'
      : tab;

  const tabs: TabItem[] = [
    { key: 'overview', label: '總覽', icon: '📋' },
    { key: 'announcements', label: '公告', icon: '📣' },
    { key: 'contact', label: '聯絡簿', icon: '📒' },
    ...(features?.growth ? [{ key: 'growth', label: '成長', icon: '🌱' } as TabItem] : []),
    ...(features?.grades ? [{ key: 'grades', label: '成績', icon: '📊' } as TabItem] : []),
    { key: 'settings', label: '設定', icon: '⚙️' },
  ];

  const heads: Record<string, string> = {
    overview: '後台總覽',
    announcements: '發布公告',
    contact: '今日聯絡簿',
    growth: '記錄孩子的成長',
    grades: '登錄成績',
    settings: '設定 / 更多功能',
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
              title={heads[safeTab] ?? '總覽'}
              onLogout={signOut}
            />
          </>
        }
        tabbar={<TabBar variant="t" items={tabs} active={safeTab} onSelect={setTab} />}
      >
        {safeTab === 'overview' && (
          <div className="body">
            <Feature
              variant="t"
              kicker="今日班級動態"
              title={`家長完成 ${done}/${total} 項作業`}
              sub={`${annCount} 則公告 · ${bringCount} 項攜帶 · 即時更新`}
              pct={pct}
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
                  {done}
                  <small>/{total} 項</small>
                </div>
                <div className="k">作業家長已勾完成</div>
              </div>
              <div className="stat">
                <div className="num">
                  {annCount}
                  <small> 則</small>
                </div>
                <div className="k">目前公告</div>
              </div>
              <div className="stat">
                <div className="num">
                  {bringCount}
                  <small> 項</small>
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
              <div
                className="q"
                onClick={() => setTab(features?.growth ? 'growth' : 'settings')}
              >
                <div className="qi" style={{ background: 'var(--blue-soft)' }}>
                  📸
                </div>
                <div className="qt">記成長</div>
                <div className="qs">{features?.growth ? '文字/照片' : '前往開啟'}</div>
              </div>
              <div
                className="q"
                onClick={() => setTab(features?.grades ? 'grades' : 'settings')}
              >
                <div className="qi" style={{ background: 'var(--pink-soft)' }}>
                  📊
                </div>
                <div className="qt">登成績</div>
                <div className="qs">{features?.grades ? '分數/級距' : '前往開啟'}</div>
              </div>
            </div>
            <div className="info a">
              💡 目前只開了最核心的功能。到「設定」可逐一開啟成績、成長、行事曆等更多功能。
            </div>
          </div>
        )}

        {safeTab === 'announcements' && (
          <div className="body">
            <AnnouncementsPanel classId={cls?.id} />
          </div>
        )}
        {safeTab === 'contact' && (
          <div className="body">
            <ContactPanel classId={cls?.id} />
          </div>
        )}
        {safeTab === 'growth' && (
          <div className="body">
            <GrowthPanel classId={cls?.id} />
          </div>
        )}
        {safeTab === 'grades' && (
          <div className="body">
            <GradesPanel classId={cls?.id} />
          </div>
        )}
        {safeTab === 'settings' && (
          <div className="body">
            <FeatureSettings classId={cls?.id} />
          </div>
        )}
      </PhoneShell>
    </div>
  );
}
