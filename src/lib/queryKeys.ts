// Unified TanStack Query key factory (DEVELOPMENT.md §3, §8.4).
// Every hook derives its key here so Realtime invalidation stays precise.

export const queryKeys = {
  classes: {
    mine: () => ['classes', 'mine'] as const,
    one: (classId: string) => ['classes', classId] as const,
  },
  features: {
    forClass: (classId: string) => ['features', classId] as const,
  },
  onboarding: {
    mine: () => ['onboarding', 'mine'] as const,
  },
  students: {
    roster: (classId: string) => ['students', 'roster', classId] as const,
    mine: () => ['students', 'mine'] as const,
  },
  announcements: {
    list: (classId: string) => ['announcements', classId] as const,
    listWithStats: (classId: string) => ['announcements', classId, 'stats'] as const,
  },
  contact: {
    homework: (classId: string, date: string, studentId?: string) =>
      ['contact', 'homework', classId, date, studentId ?? 'all'] as const,
    bring: (classId: string, date: string) => ['contact', 'bring', classId, date] as const,
    completion: (classId: string, date: string) =>
      ['contact', 'completion', classId, date] as const,
  },
  grades: {
    exams: (classId: string) => ['grades', 'exams', classId] as const,
    subjects: (classId: string) => ['grades', 'subjects', classId] as const,
    examTypes: (classId: string) => ['grades', 'examTypes', classId] as const,
    myScore: (examId: string, studentId: string) =>
      ['grades', 'score', examId, studentId] as const,
    distribution: (examId: string) => ['grades', 'dist', examId] as const,
    examRoster: (examId: string) => ['grades', 'roster', examId] as const,
  },
  growth: {
    timeline: (studentId: string) => ['growth', 'timeline', studentId] as const,
    memoryBook: (studentId: string) => ['growth', 'book', studentId] as const,
    photos: (studentId: string) => ['growth', 'photos', studentId] as const,
  },
  calendar: {
    events: (classId: string) => ['calendar', classId] as const,
  },
  leaves: {
    forParent: (studentId: string) => ['leaves', 'parent', studentId] as const,
    pending: (classId: string) => ['leaves', 'pending', classId] as const,
  },
  consent: {
    forms: (classId: string) => ['consent', 'forms', classId] as const,
    status: (consentId: string) => ['consent', 'status', consentId] as const,
    myPending: (studentId: string) => ['consent', 'pending', studentId] as const,
  },
  messages: {
    conversation: (classId: string, studentId: string) =>
      ['messages', 'conversation', classId, studentId] as const,
    list: (conversationId: string) => ['messages', 'list', conversationId] as const,
    inbox: (classId: string) => ['messages', 'inbox', classId] as const,
  },
} as const;
