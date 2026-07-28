import type { KeyboardEvent } from 'react';
import { Ring } from './Ring';

interface FeatureProps {
  variant: 'p' | 't';
  kicker: string;
  title: string;
  sub?: string;
  /** 0–100 for the progress ring */
  pct: number;
  onClick?: () => void;
}

// Signature "hero" block (DESIGN.md §1.3, §5.2): colored gradient + ring + serif headline.
export function Feature({ variant, kicker, title, sub, pct, onClick }: FeatureProps) {
  const track = variant === 'p' ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.3)';
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <div
      className={`feature ${variant}${onClick ? ' clickable' : ''}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Ring pct={pct} fg="#ffffff" track={track} />
      <div className="ft">
        <div className="kicker">{kicker}</div>
        <div className="ft-h">{title}</div>
        {sub && <div className="ft-sub">{sub}</div>}
      </div>
    </div>
  );
}
