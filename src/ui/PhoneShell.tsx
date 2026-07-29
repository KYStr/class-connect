import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export type SlideDir = 'left' | 'right' | null;

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
  /** Content key — remounts page for slide transition */
  contentKey?: string;
  /** Slide direction for tab changes (null = no slide / instant) */
  slideDir?: SlideDir;
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

const SLIDE_MS = 280;

// Product shell: mobile-first UI without a fake phone chrome (DEVELOPMENT.md §10.2).
export function PhoneShell({
  chrome,
  children,
  tabbar,
  overlay,
  animate = true,
  contentKey = 'page',
  slideDir = null,
  variant,
}: PhoneShellProps) {
  const mode = shellVariant(variant);
  const prevKey = useRef(contentKey);
  const prevKids = useRef(children);
  const [outgoing, setOutgoing] = useState<ReactNode>(null);
  const [outgoingDir, setOutgoingDir] = useState<SlideDir>(null);

  useLayoutEffect(() => {
    if (contentKey === prevKey.current) {
      prevKids.current = children;
      return;
    }
    if (slideDir) {
      setOutgoing(prevKids.current);
      setOutgoingDir(slideDir);
      const t = window.setTimeout(() => {
        setOutgoing(null);
        setOutgoingDir(null);
      }, SLIDE_MS);
      prevKey.current = contentKey;
      prevKids.current = children;
      return () => window.clearTimeout(t);
    }
    prevKey.current = contentKey;
    prevKids.current = children;
    setOutgoing(null);
    setOutgoingDir(null);
  }, [contentKey, children, slideDir]);

  const inClass =
    slideDir === 'right'
      ? 'page-slide-in-right'
      : slideDir === 'left'
        ? 'page-slide-in-left'
        : animate
          ? 'page-anim'
          : '';

  const outClass =
    outgoingDir === 'right'
      ? 'page-slide-out-left'
      : outgoingDir === 'left'
        ? 'page-slide-out-right'
        : '';

  return (
    <div className={`phone phone-${mode}`}>
      {mode === 'device' && <div className="notch" />}
      <div className="screen">
        {chrome}
        <div className={`scr-scroll${outgoing ? ' scr-scroll-slide' : ''}`}>
          {outgoing && (
            <div className={`page-slide-layer page-slide-out ${outClass}`} aria-hidden="true">
              {outgoing}
            </div>
          )}
          <div key={contentKey} className={`page-slide-layer ${inClass}`}>
            {children}
          </div>
        </div>
        {overlay}
        {tabbar}
      </div>
    </div>
  );
}
