import { useState } from 'react';
import { AppBar, EmptyState, Feature, PhoneShell, StatusBar, TabBar, TrackSwipe, useToast } from '@/ui';
import type { TabItem } from '@/ui';
import { useAuth } from '@/app/AuthProvider';
import { useMyClasses, useRoster } from '@/hooks/useClasses';
import { useFeatures } from '@/hooks/useFeatures';
import { useAnnouncementsWithStats } from '@/hooks/useAnnouncements';
import { useBring, useHomeworkCompletion } from '@/hooks/useContact';
import { useClassRealtime } from '@/hooks/useClassRealtime';
import { usePendingLeaves } from '@/hooks/useLeaves';
import { useConsentForms, useConsentStatus } from '@/hooks/useConsent';
import { todayIso } from '@/services/contact';
import { ClassManager } from './ClassManager';
import { FeatureSettings } from './FeatureSettings';
import { AnnouncementsPanel } from './AnnouncementsPanel';
import { ContactPanel } from './ContactPanel';
import { GradesPanel } from './GradesPanel';
import { GrowthPanel } from './GrowthPanel';
import { AnnouncementTrackingPanel } from './AnnouncementTrackingPanel';
import { HomeworkTrackingPanel } from './HomeworkTrackingPanel';
import { CalendarPanel } from './CalendarPanel';
import { LeavesPanel } from './LeavesPanel';
import { ConsentPanel } from './ConsentPanel';
import { TeacherMessengerDock } from './TeacherMessengerDock';

type OverviewView = 'home' | 'calendar' | 'leave' | 'consent';

// Teacher shell (SPEC 2.2 / 3.2). Tabs follow class feature switches (SPEC L16).

export function TeacherApp() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('overview');
  const [overviewView, setOverviewView] = useState<OverviewView>('home');
  const [overviewTrackOpen, setOverviewTrackOpen] = useState(false);
  const [openTrackingFor, setOpenTrackingFor] = useState<'announcements' | 'contact' | null>(
    null,
  );
  const [msgOpenSignal, setMsgOpenSignal] = useState(0);
  const { data: classes } = useMyClasses();
  const cls = classes?.[0];
  const { data: roster } = useRoster(cls?.id);
  const { data: features } = useFeatures(cls?.id);
  const date = todayIso();
  const { data: completion } = useHomeworkCompletion(cls?.id, date);
  const { data: bring } = useBring(cls?.id, date);
  const { data: anns } = useAnnouncementsWithStats(cls?.id);
  const { data: pendingLeaves } = usePendingLeaves(features?.leave ? cls?.id : undefined);
  const { data: consentForms } = useConsentForms(features?.consent ? cls?.id : undefined);
  const latestConsentId = consentForms?.[0]?.id;
  const { data: consentStatus } = useConsentStatus(
    features?.consent ? latestConsentId : undefined,
  );
  useClassRealtime(cls?.id);

  const classSize = roster?.length ?? 0;
  const done = completion?.done ?? 0;
  const total = completion?.total ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const hwLeft = Math.max(0, total - done);
  const annCount = anns?.length ?? 0;
  const bringCount = bring?.length ?? 0;
  const annsNeedingRead =
    anns?.filter((a) => (a.readCount ?? 0) < (a.guardianCount ?? 0)).length ?? 0;
  const pendingLeaveCount = pendingLeaves?.length ?? 0;
  const unsignedCount = consentStatus?.unsigned.length ?? 0;
  const latestConsent = consentForms?.[0];
  const showLeaveTodo = Boolean(features?.leave && pendingLeaveCount > 0);
  const showConsentTodo = Boolean(features?.consent && unsignedCount > 0 && latestConsent);
  const showBusyTodos = hwLeft > 0 || annsNeedingRead > 0 || showLeaveTodo || showConsentTodo;

  const goTab = (next: string) => {
    setOpenTrackingFor(null);
    setOverviewView('home');
    setTab(next);
  };

  const goTracking = (which: 'announcements' | 'contact') => {
    setOverviewTrackOpen(false);
    setOverviewView('home');
    setOpenTrackingFor(which);
    setTab(which);
  };

  const goOverviewView = (view: OverviewView, enabled?: boolean) => {
    if (enabled === false) {
      toast('請先在設定開啟此功能');
      goTab('settings');
      return;
    }
    setTab('overview');
    setOverviewView(view);
  };

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

  const overviewTitles: Record<OverviewView, string> = {
    home: '後台總覽',
    calendar: '班級行事曆',
    leave: '請假審核',
    consent: '同意書追蹤',
  };

  const heads: Record<string, string> = {
    overview: overviewTitles[overviewView],
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
        tabbar={<TabBar variant="t" items={tabs} active={safeTab} onSelect={goTab} />}
        overlay={<TeacherMessengerDock classId={cls?.id} openSignal={msgOpenSignal} />}
      >
        {safeTab === 'overview' && overviewView === 'calendar' && (
          <div className="body">
            <CalendarPanel classId={cls?.id} onBack={() => setOverviewView('home')} />
          </div>
        )}
        {safeTab === 'overview' && overviewView === 'leave' && (
          <div className="body">
            <LeavesPanel classId={cls?.id} onBack={() => setOverviewView('home')} />
          </div>
        )}
        {safeTab === 'overview' && overviewView === 'consent' && (
          <div className="body">
            <ConsentPanel classId={cls?.id} onBack={() => setOverviewView('home')} />
          </div>
        )}

        {safeTab === 'overview' && overviewView === 'home' && (
          <div className="body">
            <Feature
              variant="t"
              kicker="今日班級動態"
              title={`家長完成 ${done}/${total} 項作業`}
              sub={`${annCount} 則公告 · ${bringCount} 項攜帶 · 點此查看未完成／未讀`}
              pct={pct}
              onClick={() => setOverviewTrackOpen((v) => !v)}
            />
            {overviewTrackOpen && cls?.id && (
              <TrackSwipe label="作業與公告追蹤，左右滑動或點側邊切換">
                <HomeworkTrackingPanel classId={cls.id} date={date} />
                <AnnouncementTrackingPanel classId={cls.id} />
              </TrackSwipe>
            )}
            <ClassManager />
            <div className="card">
              <div className="lab">🔔 今日待辦</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 6 }}>
                {!showBusyTodos && <EmptyState icon="✅">作業與公告都跟上了</EmptyState>}
                {showLeaveTodo && (
                  <button
                    type="button"
                    className="alert"
                    style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 0 }}
                    onClick={() => goOverviewView('leave', true)}
                  >
                    <div className="ai" style={{ background: 'var(--pink-soft)' }}>
                      🤒
                    </div>
                    <div className="at">
                      {pendingLeaveCount} 筆請假待審核
                      <small>家長線上請假，一鍵准駁</small>
                    </div>
                    <span className="go">前往</span>
                  </button>
                )}
                {showConsentTodo && latestConsent && (
                  <button
                    type="button"
                    className="alert"
                    style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 0 }}
                    onClick={() => goOverviewView('consent', true)}
                  >
                    <div className="ai" style={{ background: 'var(--accent-soft)' }}>
                      ✍️
                    </div>
                    <div className="at">
                      {unsignedCount} 位未簽同意書
                      <small>
                        {latestConsent.title}
                        {latestConsent.deadline ? ` · ${latestConsent.deadline} 截止` : ''}
                      </small>
                    </div>
                    <span className="go">追蹤</span>
                  </button>
                )}
                {hwLeft > 0 && (
                  <button
                    type="button"
                    className="alert"
                    style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 0 }}
                    onClick={() => goTracking('contact')}
                  >
                    <div className="ai" style={{ background: 'var(--primary-soft)' }}>
                      📒
                    </div>
                    <div className="at">
                      還有 {hwLeft} 項作業未完成
                      <small>查看哪些學生還沒勾完成</small>
                    </div>
                    <span className="go">查看</span>
                  </button>
                )}
                {annsNeedingRead > 0 && (
                  <button
                    type="button"
                    className="alert"
                    style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 0 }}
                    onClick={() => goTracking('announcements')}
                  >
                    <div className="ai" style={{ background: 'var(--accent-soft)' }}>
                      📣
                    </div>
                    <div className="at">
                      {annsNeedingRead} 則公告尚有未讀
                      <small>查看哪些家長還沒讀</small>
                    </div>
                    <span className="go">查看</span>
                  </button>
                )}
                <button
                  type="button"
                  className="alert"
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 0 }}
                  onClick={() => setMsgOpenSignal((n) => n + 1)}
                >
                  <div className="ai" style={{ background: 'var(--blue-soft)' }}>
                    💬
                  </div>
                  <div className="at">
                    家長私訊
                    <small>右下角小窗回覆 · 平常藏起來不佔版面</small>
                  </div>
                  <span className="go">開啟</span>
                </button>
              </div>
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
              <div className="q" onClick={() => goTab('announcements')}>
                <div className="qi" style={{ background: 'var(--accent-soft)' }}>
                  📣
                </div>
                <div className="qt">發公告</div>
                <div className="qs">全班通知</div>
              </div>
              <div className="q" onClick={() => goTab('contact')}>
                <div className="qi" style={{ background: 'var(--primary-soft)' }}>
                  📒
                </div>
                <div className="qt">寫聯絡簿</div>
                <div className="qs">作業/攜帶</div>
              </div>
              <div
                className="q"
                style={{ opacity: features?.calendar ? 1 : 0.55 }}
                onClick={() => goOverviewView('calendar', features?.calendar)}
              >
                <div className="qi" style={{ background: 'var(--blue-soft)' }}>
                  📅
                </div>
                <div className="qt">行事曆</div>
                <div className="qs">{features?.calendar ? '考試/活動' : '前往開啟'}</div>
              </div>
              <div
                className="q"
                onClick={() => goTab(features?.grades ? 'grades' : 'settings')}
              >
                <div className="qi" style={{ background: 'var(--pink-soft)' }}>
                  📊
                </div>
                <div className="qt">登成績</div>
                <div className="qs">{features?.grades ? '分數/級距' : '前往開啟'}</div>
              </div>
            </div>
            <div className="info a">
              💡 到「設定」可開啟請假、同意書、成長等更多功能；家長端會同步長出入口。
            </div>
          </div>
        )}

        {safeTab === 'announcements' && (
          <div className="body">
            <AnnouncementsPanel
              classId={cls?.id}
              openTracking={openTrackingFor === 'announcements'}
            />
          </div>
        )}
        {safeTab === 'contact' && (
          <div className="body">
            <ContactPanel classId={cls?.id} openTracking={openTrackingFor === 'contact'} />
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
