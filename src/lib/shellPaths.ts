/** Path helpers so in-app screens push browser history (back = previous screen). */

export type TeacherOverviewView = 'home' | 'calendar' | 'leave' | 'consent';

export type TeacherShellLoc = {
  tab: string;
  overviewView: TeacherOverviewView;
  previewStudentId: string | null;
};

export type ParentSubView = 'home' | 'calendar' | 'leave' | 'messages' | 'consent';

export type ParentShellLoc = {
  tab: string;
  view: ParentSubView;
};

const TEACHER_OVERVIEW_SUB = new Set(['calendar', 'leave', 'consent']);
const TEACHER_TABS = new Set([
  'overview',
  'announcements',
  'contact',
  'growth',
  'grades',
  'settings',
]);
const PARENT_SUB = new Set(['calendar', 'leave', 'messages', 'consent']);
const PARENT_TABS = new Set(['home', 'contact', 'announcements', 'growth', 'grades']);

export function parseTeacherPath(pathname: string): TeacherShellLoc {
  const parts = pathname.replace(/^\/t\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'preview') {
    return {
      tab: 'overview',
      overviewView: 'home',
      previewStudentId: parts[1] ?? null,
    };
  }
  if (parts[0] && TEACHER_OVERVIEW_SUB.has(parts[0])) {
    return {
      tab: 'overview',
      overviewView: parts[0] as TeacherOverviewView,
      previewStudentId: null,
    };
  }
  if (parts[0] && TEACHER_TABS.has(parts[0]) && parts[0] !== 'overview') {
    return { tab: parts[0], overviewView: 'home', previewStudentId: null };
  }
  return { tab: 'overview', overviewView: 'home', previewStudentId: null };
}

export function teacherPath(loc: {
  tab: string;
  overviewView?: TeacherOverviewView;
  previewStudentId?: string | null;
}): string {
  if (loc.previewStudentId) return `/t/preview/${loc.previewStudentId}`;
  if (loc.tab === 'overview') {
    const v = loc.overviewView ?? 'home';
    return v === 'home' ? '/t' : `/t/${v}`;
  }
  return `/t/${loc.tab}`;
}

export function parseParentPath(pathname: string): ParentShellLoc {
  // Teacher-embedded preview: /t/preview/:id[/tab]
  const previewMatch = pathname.match(/^\/t\/preview\/[^/]+(?:\/(.*))?$/);
  if (previewMatch) {
    return parseParentSegment(previewMatch[1] ?? '');
  }
  const parts = pathname.replace(/^\/p\/?/, '').split('/').filter(Boolean);
  return parseParentSegment(parts.join('/'));
}

function parseParentSegment(rest: string): ParentShellLoc {
  const parts = rest.split('/').filter(Boolean);
  if (parts[0] && PARENT_SUB.has(parts[0])) {
    return { tab: 'home', view: parts[0] as ParentSubView };
  }
  if (parts[0] && PARENT_TABS.has(parts[0]) && parts[0] !== 'home') {
    return { tab: parts[0], view: 'home' };
  }
  return { tab: 'home', view: 'home' };
}

export function parentPath(
  loc: { tab: string; view?: ParentSubView },
  base = '/p',
): string {
  const root = base.replace(/\/$/, '') || '/p';
  if (loc.tab === 'home') {
    const v = loc.view ?? 'home';
    return v === 'home' ? root : `${root}/${v}`;
  }
  return `${root}/${loc.tab}`;
}

export function teacherPreviewBase(studentId: string): string {
  return `/t/preview/${studentId}`;
}
