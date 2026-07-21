import type { ReactNode } from 'react';

interface PhoneShellProps {
  /** fixed chrome above the scroll area (status bar + app bar) */
  chrome: ReactNode;
  /** scrollable content */
  children: ReactNode;
  /** bottom tab bar */
  tabbar?: ReactNode;
  /** apply the page-enter fade animation on this render */
  animate?: boolean;
}

export function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <span>📶 🔋</span>
    </div>
  );
}

// The rounded floating panel + grabber (DEVELOPMENT.md §10.2). Prod keeps the panel; the phone
// frame is decorative and collapses to full-screen on small widths (see global.css).
export function PhoneShell({ chrome, children, tabbar, animate = true }: PhoneShellProps) {
  return (
    <div className="phone">
      <div className="notch" />
      <div className="screen">
        {chrome}
        <div className="scr-scroll">
          <div className={animate ? 'page-anim' : ''}>{children}</div>
        </div>
        {tabbar}
      </div>
    </div>
  );
}
