import { useEffect, useState } from 'react';
import { useToast } from '@/ui';
import { useAuth } from '@/app/AuthProvider';
import { useEnablePush } from '@/hooks/usePush';

const SEEN_KEY = 'cc_push_prompt_seen';

/** Soft prompt after login — once per browser (SPEC L17-style, short). */
export function PushOptInBanner() {
  const { session } = useAuth();
  const { toast } = useToast();
  const enable = useEnablePush();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session) return;
    if (localStorage.getItem(SEEN_KEY) === '1') return;
    if (!('Notification' in window) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted') return;
    setOpen(true);
  }, [session]);

  if (!open) return null;

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, '1');
    setOpen(false);
  };

  return (
    <div className="push-banner">
      <div className="push-banner-text">
        🔔 開啟通知，重要公告／請假結果／私訊會即時提醒你
      </div>
      <div className="push-banner-actions">
        <button
          type="button"
          className="push-banner-yes"
          disabled={enable.isPending}
          onClick={() =>
            enable.mutate(undefined, {
              onSuccess: (r) => {
                dismiss();
                toast(r === 'granted' ? '已開啟通知' : '未允許通知');
              },
              onError: (e) => toast(e instanceof Error ? e.message : '無法開啟通知'),
            })
          }
        >
          開啟
        </button>
        <button type="button" className="push-banner-no" onClick={dismiss}>
          稍後
        </button>
      </div>
    </div>
  );
}
