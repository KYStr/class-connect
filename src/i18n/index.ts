/** zh-Hant copy (P5 i18n scaffold — architecture ready for en later). */

export const zhHant = {
  tour: {
    teacherTitle: '歡迎使用導師後台',
    /** First-time welcome (≤ 3 steps) — setup on overview. */
    teacherSteps: [
      '底部有公告、聯絡簿、聯絡老師——這三項永遠可用。',
      '在總覽加入學生，並產生邀請碼給家長綁定。',
      '需要成績、行事曆等進階功能時，到「設定」逐一開啟。',
    ],
    featureGuideTitle: '功能位置導覽',
    featureGuide: {
      announcements: '公告：在這裡發布全班通知與已讀回條。',
      contact: '聯絡簿：寫今日作業與明日攜帶。',
      todos: '今日待辦：一眼看到請假、未簽、未完成作業。',
      roster: '名冊與邀請：在設定裡管理學生、產生綁定連結。',
      growthOn: '成長：底部已有分頁，可記錄亮點與照片。',
      growthOff: '成長：到設定開啟後，底部會出現分頁。',
      gradesOn: '成績：底部已有分頁，可登錄考試分數。',
      gradesOff: '成績：到設定開啟後，底部會出現分頁。',
      calendar: '行事曆：從總覽進入，管理考試與活動。',
      leave: '線上請假：從總覽進入審核（需先在設定開啟）。',
      consent: '同意書：從總覽追蹤簽署（需先在設定開啟）。',
      moreFeatures: '更多功能：在設定逐一開啟，家長端會同步出現。',
    },
    parentTitle: '歡迎加入班級',
    parentWelcome: '這裡只會看到自己孩子的資料與班級資訊，不會看到別的孩子。',
    pointOutTitle: '新功能已開啟',
    pointOut: {
      grades: '底部已出現「成績」分頁，可登錄考試分數。',
      growth: '底部已出現「成長」分頁，可記錄亮點與照片。',
      calendar: '回到總覽即可新增考試、活動與放假。',
      leave: '回到總覽即可審核家長送來的請假。',
      consent: '回到總覽即可發送同意書並追蹤簽署。',
    } as Record<string, string>,
    replay: '功能位置導覽',
    replayHint: '依序指出各功能在哪，可前後切換；點暗處關閉並留在該頁',
  },
} as const;

export type Locale = 'zh-Hant';

let locale: Locale = 'zh-Hant';

export function setLocale(next: Locale) {
  locale = next;
}

export function getLocale(): Locale {
  return locale;
}

/** Resolve zh-Hant messages; swap dictionary when more locales land. */
export function t() {
  return zhHant;
}
