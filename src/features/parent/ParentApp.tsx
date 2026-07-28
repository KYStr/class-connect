import { useState } from 'react';
import { AppBar, EmptyState, Feature, PhoneShell, StatusBar, TabBar, useToast } from '@/ui';
import type { TabItem } from '@/ui';
import { useAuth } from '@/app/AuthProvider';
import { useMyChildren } from '@/hooks/useMyChildren';
import { useFeatures } from '@/hooks/useFeatures';
import { useHomework } from '@/hooks/useContact';
import { useClassRealtime } from '@/hooks/useClassRealtime';
import { useMyConsentPending } from '@/hooks/useConsent';
import { todayIso } from '@/services/contact';
import { ParentAnnouncements } from './ParentAnnouncements';
import { ParentContact } from './ParentContact';
import { ParentGrades } from './ParentGrades';
import { ParentGrowth } from './ParentGrowth';
import { ParentCalendar } from './ParentCalendar';
import { ParentLeave } from './ParentLeave';
import { ParentMessages } from './ParentMessages';
import { ParentConsent } from './ParentConsent';
import type { ConsentForm } from '@/types/domain';

type SubView = 'home' | 'calendar' | 'leave' | 'messages' | 'consent';

// Parent shell (SPEC 2.1 / 3.1). High-freq: contact + announcements; low-freq tucked away.

export function ParentApp() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('home');
  const [view, setView] = useState<SubView>('home');
  const [consentFocus, setConsentFocus] = useState<ConsentForm | null>(null);
  const { data: children } = useMyChildren();
  const child = children?.[0];
  const { data: features } = useFeatures(child?.classId);
  const { data: hw } = useHomework(child?.classId, todayIso(), child?.id);
  const { data: pendingConsent } = useMyConsentPending(
    features?.consent ? child?.id : undefined,
  );
  useClassRealtime(child?.classId);

  const doneCount = (hw ?? []).filter((h) => h.done).length;
  const total = hw?.length ?? 0;
  const pct = total === 0 ? 100 : Math.round((doneCount / total) * 100);

  const safeTab =
    (tab === 'growth' && !features?.growth) || (tab === 'grades' && !features?.grades)
      ? 'home'
      : tab;

  const goHome = () => {
    setView('home');
    setConsentFocus(null);
  };

  const openQa = (next: SubView, enabled: boolean | undefined) => {
    if (!enabled) {
      toast('老師尚未開啟此功能');
      return;
    }
    setTab('home');
    setView(next);
  };

  const tabs: TabItem[] = [
    { key: 'home', label: '首頁', icon: '🏠' },
    { key: 'contact', label: '聯絡簿', icon: '📒' },
    { key: 'announcements', label: '公告', icon: '📣' },
    ...(features?.growth ? [{ key: 'growth', label: '成長', icon: '🌱' } as TabItem] : []),
    ...(features?.grades ? [{ key: 'grades', label: '成績', icon: '📊' } as TabItem] : []),
  ];

  const heads: Record<string, string> = {
    home:
      view === 'calendar'
        ? '班級行事曆'
        : view === 'leave'
          ? '請假 / 回報'
          : view === 'messages'
            ? '聯絡老師'
            : view === 'consent'
              ? '簽署同意書'
              : '今天',
    contact: '聯絡簿',
    announcements: '班級公告',
    growth: '成長',
    grades: '成績',
  };

  const onSelectTab = (key: string) => {
    setView('home');
    setConsentFocus(null);
    setTab(key);
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
        tabbar={<TabBar variant="p" items={tabs} active={safeTab} onSelect={onSelectTab} />}
      >
        {safeTab === 'home' && view === 'calendar' && (
          <div className="body">
            <ParentCalendar classId={child?.classId} onBack={goHome} />
          </div>
        )}
        {safeTab === 'home' && view === 'leave' && (
          <div className="body">
            <ParentLeave studentId={child?.id} studentName={child?.name} onBack={goHome} />
          </div>
        )}
        {safeTab === 'home' && view === 'messages' && (
          <ParentMessages classId={child?.classId} studentId={child?.id} onBack={goHome} />
        )}
        {safeTab === 'home' && view === 'consent' && (
          <div className="body">
            <ParentConsent studentId={child?.id} onBack={goHome} initialForm={consentFocus} />
          </div>
        )}
        {safeTab === 'home' && view === 'home' && (
          <div className="body">
            <Feature
              variant="p"
              kicker="今日作業"
              title={total === 0 ? '今天沒有作業 🎉' : `已完成 ${doneCount}/${total} 項`}
              sub={total === 0 ? '點此也可進聯絡簿看看' : '點此到聯絡簿打勾回報'}
              pct={pct}
              onClick={() => onSelectTab('contact')}
            />

            <div className="home-primary">
              <button type="button" className="home-primary-btn" onClick={() => onSelectTab('contact')}>
                <div className="hp-i">📒</div>
                <div className="hp-t">聯絡簿</div>
                <div className="hp-s">作業與攜帶 · 每天看</div>
              </button>
              <button
                type="button"
                className="home-primary-btn"
                onClick={() => onSelectTab('announcements')}
              >
                <div className="hp-i">📣</div>
                <div className="hp-t">班級公告</div>
                <div className="hp-s">重要通知 · 記得回讀</div>
              </button>
            </div>

            {features?.consent && (pendingConsent?.length ?? 0) > 0 && (
              <div className="card announce imp">
                <div className="top">
                  <span className="tag">待簽</span>
                  <b style={{ fontSize: 13.5 }}>{pendingConsent![0].title}</b>
                </div>
                <div className="msg">
                  {pendingConsent![0].deadline
                    ? `${pendingConsent![0].deadline} 前需線上簽署，免印免帶回。`
                    : '需線上簽署，免印免帶回。'}
                </div>
                <button
                  type="button"
                  className="read-btn"
                  style={{ marginTop: 10, background: 'var(--accent-soft)', color: '#c26a1f' }}
                  onClick={() => {
                    setConsentFocus(pendingConsent![0]);
                    setView('consent');
                  }}
                >
                  ✍️ 立即線上簽署
                </button>
              </div>
            )}

            <details className="home-more">
              <summary className="home-more-summary">其他服務（較少用）</summary>
              <div className="qa-grid">
                <div
                  className="qa"
                  style={{ opacity: features?.calendar ? 1 : 0.4 }}
                  onClick={() => openQa('calendar', features?.calendar)}
                >
                  <div className="qa-i">📅</div>
                  <div className="qa-t">行事曆</div>
                </div>
                <div
                  className="qa amber"
                  style={{ opacity: features?.leave ? 1 : 0.4 }}
                  onClick={() => openQa('leave', features?.leave)}
                >
                  <div className="qa-i">🤒</div>
                  <div className="qa-t">請假</div>
                </div>
                <div className="qa blue" onClick={() => openQa('messages', true)}>
                  <div className="qa-i">💬</div>
                  <div className="qa-t">聯絡老師</div>
                </div>
              </div>
            </details>

            {!features?.grades && !features?.growth && (
              <div className="info p">
                🌱 老師開啟更多功能後，底部會多出成長／成績等分頁。
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
