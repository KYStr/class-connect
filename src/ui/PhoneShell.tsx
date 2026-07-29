import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

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

export const TAB_SLIDE_MS = 280;

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
  /** Direction applied only for the entering page's animation (cleared after slide). */
  const [enterDir, setEnterDir] = useState<SlideDir>(null);

  // Keep latest children without restarting the slide timeout on every render.
  useLayoutEffect(() => {
    if (contentKey === prevKey.current) {
      prevKids.current = children;
    }
  }, [children, contentKey]);

  useLayoutEffect(() => {
    if (contentKey === prevKey.current) return;

    const leaving = prevKids.current;
    prevKey.current = contentKey;
    prevKids.current = children;

    if (slideDir) {
      setOutgoing(leaving);
      setOutgoingDir(slideDir);
      setEnterDir(slideDir);
    } else {
      setOutgoing(null);
      setOutgoingDir(null);
      setEnterDir(null);
    }
  }, [contentKey, slideDir, children]);

  // Timeout lives in its own effect so child re-renders during the slide cannot cancel it.
  useEffect(() => {
    if (!outgoing && !enterDir) return;
    const t = window.setTimeout(() => {
      setOutgoing(null);
      setOutgoingDir(null);
      setEnterDir(null);
    }, TAB_SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [outgoing, enterDir, contentKey]);

  const inClass =
    enterDir === 'right'
      ? 'page-slide-in-right'
      : enterDir === 'left'
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
