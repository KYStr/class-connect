import { useEffect, useState } from 'react';

/** Capture beforeinstallprompt and show a soft “加入主畫面” tip. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => localStorage.getItem('cc_a2hs_hide') === '1');

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  if (hidden || !deferred) return null;

  return (
    <div className="install-prompt">
      <span>📲 可安裝到主畫面，離線也能看已載入的內容</span>
      <button
        type="button"
        className="install-prompt-yes"
        onClick={async () => {
          await deferred.prompt();
          setDeferred(null);
          localStorage.setItem('cc_a2hs_hide', '1');
          setHidden(true);
        }}
      >
        安裝
      </button>
      <button
        type="button"
        className="install-prompt-no"
        onClick={() => {
          localStorage.setItem('cc_a2hs_hide', '1');
          setHidden(true);
        }}
      >
        略過
      </button>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
