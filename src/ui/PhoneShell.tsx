import type { ReactNode } from 'react';

interface PhoneShellProps {
  /** fixed chrome above the scroll area (status bar + app bar) */
  chrome: ReactNode;
  /** scrollable content */
  children: ReactNode;
  /** bottom tab bar */
  tabbar?: ReactNode;
  /** overlays above scroll (e.g. messenger dock), below tab bar */
  overlay?: ReactNode;
  /** apply the page-enter fade animation on this render */
  animate?: boolean;
  /**
   * `app` (default): real product shell — fullscreen on phone, floating window on desktop.
   * `device`: legacy demo phone bezel (notch / fake status). Opt in via ?demo=1.
   */
  variant?: 'app' | 'device';
}

function shellVariant(explicit?: 'app' | 'device'): 'app' | 'device' {
  if (explicit) return explicit;
  if (typeof window === 'undefined') return 'app';
  return new URLSearchParams(window.location.search).get('demo') === '1' ? 'device' : 'app';
}

/** Fake iOS status bar — only in `?demo=1` device frame. */
export function StatusBar() {
  if (shellVariant() !== 'device') return null;
  return (
    <div className="statusbar">
      <span>9:41</span>
      <span>📶 🔋</span>
    </div>
  );
}

// Product shell: mobile-first UI without a fake phone chrome (DEVELOPMENT.md §10.2).
// Use ?demo=1 to restore the old device frame for side-by-side demos.
export function PhoneShell({
  chrome,
  children,
  tabbar,
  overlay,
  animate = true,
  variant,
}: PhoneShellProps) {
  const mode = shellVariant(variant);
  return (
    <div className={`phone phone-${mode}`}>
      {mode === 'device' && <div className="notch" />}
      <div className="screen">
        {chrome}
        <div className="scr-scroll">
          <div className={animate ? 'page-anim' : ''}>{children}</div>
        </div>
        {overlay}
        {tabbar}
      </div>
    </div>
  );
}
