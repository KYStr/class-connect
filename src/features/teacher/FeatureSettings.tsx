import { useMutation } from '@tanstack/react-query';
import { Card, EmptyState, useToast } from '@/ui';
import { useFeatures, useSetFeature } from '@/hooks/useFeatures';
import { useEnablePush, useDisablePush } from '@/hooks/usePush';
import { sendTestPushToSelf } from '@/services/push';
import { CORE_FEATURES, OPT_IN_FEATURES, type FeatureKey } from '@/types/domain';

// Teacher "⚙️ 設定 / 更多功能" (SPEC L16). Core-3 are locked on; the rest are opt-in.
const META: Record<FeatureKey, { icon: string; name: string; desc: string }> = {
  announcements: { icon: '📣', name: '公告', desc: '全班通知與已讀回條' },
  contact: { icon: '📒', name: '聯絡簿', desc: '今日作業 / 明日攜帶與完成統計' },
  messages: { icon: '💬', name: '聯絡老師', desc: '家長一對一私訊' },
  grades: { icon: '📊', name: '成績', desc: '登錄分數與級距，家長只看得到自己孩子' },
  growth: { icon: '🌱', name: '成長紀錄', desc: '用照片與亮點累積孩子的成長時間軸' },
  calendar: { icon: '📅', name: '行事曆', desc: '考試 / 活動 / 繳費 / 放假一覽' },
  leave: { icon: '🤒', name: '線上請假', desc: '家長線上請假，你逐筆審核' },
  consent: { icon: '✍️', name: '同意書', desc: '發送同意書並追蹤簽署進度' },
};

export function FeatureSettings({ classId }: { classId: string | undefined }) {
  const { data: features, isLoading } = useFeatures(classId);
  const setFeature = useSetFeature(classId);
  const enablePush = useEnablePush();
  const disablePush = useDisablePush();
  const testPush = useMutation({ mutationFn: sendTestPushToSelf });
  const { toast } = useToast();

  if (!classId) return <EmptyState>請先建立班級</EmptyState>;
  if (isLoading || !features) return <EmptyState>載入中…</EmptyState>;

  const onToggle = (feature: FeatureKey, enabled: boolean) => {
    setFeature.mutate(
      { feature, enabled },
      {
        onSuccess: () => {
          if (enabled && (feature === 'growth' || feature === 'grades')) {
            toast(`已開啟「${META[feature].name}」· 底部已出現新分頁`);
          } else if (enabled) {
            toast(`已開啟「${META[feature].name}」· 入口已可使用`);
          } else {
            toast(`已關閉「${META[feature].name}」`);
          }
        },
      },
    );
  };

  return (
    <>
      <div className="info a">
        ☝️ 一開始只開最核心的功能，降低負擔。想用更多功能時再逐一開啟即可，家長端會同步長出。
      </div>

      <Card label="🔔 裝置通知">
        <div className="toggle-row">
          <div className="tx">
            Web Push
            <small>重要公告、請假結果、私訊會推到這台裝置</small>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="ghost-btn"
              style={{ width: 'auto', padding: '6px 12px' }}
              disabled={enablePush.isPending}
              onClick={() =>
                enablePush.mutate(undefined, {
                  onSuccess: (r) =>
                    toast(r === 'granted' ? '已開啟通知' : '未允許通知權限'),
                  onError: (e) => toast(e instanceof Error ? e.message : '開啟失敗'),
                })
              }
            >
              開啟
            </button>
            <button
              type="button"
              className="ghost-btn"
              style={{ width: 'auto', padding: '6px 12px' }}
              disabled={disablePush.isPending}
              onClick={() =>
                disablePush.mutate(undefined, {
                  onSuccess: () => toast('已關閉此裝置通知'),
                })
              }
            >
              關閉
            </button>
            <button
              type="button"
              className="ghost-btn"
              style={{ width: 'auto', padding: '6px 12px' }}
              disabled={testPush.isPending}
              onClick={() =>
                testPush.mutate(undefined, {
                  onSuccess: (r) =>
                    toast(
                      r.sent > 0
                        ? '已送出測試通知 · 請看系統通知列（可先切到別的分頁）'
                        : '沒有訂閱紀錄 · 請先按「開啟」並允許通知',
                    ),
                  onError: (e) => toast(e instanceof Error ? e.message : '測試失敗'),
                })
              }
            >
              測試
            </button>
          </div>
        </div>
      </Card>

      <Card label="🔒 核心功能（永遠開啟）">
        {CORE_FEATURES.map((f) => (
          <div className="toggle-row" key={f}>
            <div className="tx">
              {META[f].icon} {META[f].name}
              <small>{META[f].desc}</small>
            </div>
            <label className="sw2 green" title="核心功能不可關閉">
              <input type="checkbox" checked readOnly disabled />
              <span className="sw2-tr" />
            </label>
          </div>
        ))}
      </Card>

      <Card label="✨ 更多功能（自行開啟）">
        {OPT_IN_FEATURES.map((f) => (
          <div className="toggle-row" key={f}>
            <div className="tx">
              {META[f].icon} {META[f].name}
              <small>{META[f].desc}</small>
            </div>
            <label className="sw2">
              <input
                type="checkbox"
                checked={features[f]}
                onChange={(e) => onToggle(f, e.target.checked)}
              />
              <span className="sw2-tr" />
            </label>
          </div>
        ))}
      </Card>
    </>
  );
}
