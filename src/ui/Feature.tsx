import { Ring } from './Ring';

interface FeatureProps {
  variant: 'p' | 't';
  kicker: string;
  title: string;
  sub?: string;
  /** 0–100 for the progress ring */
  pct: number;
}

// Signature "hero" block (DESIGN.md §1.3, §5.2): colored gradient + ring + serif headline.
export function Feature({ variant, kicker, title, sub, pct }: FeatureProps) {
  const track = variant === 'p' ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.3)';
  return (
    <div className={`feature ${variant}`}>
      <Ring pct={pct} fg="#ffffff" track={track} />
      <div className="ft">
        <div className="kicker">{kicker}</div>
        <div className="ft-h">{title}</div>
        {sub && <div className="ft-sub">{sub}</div>}
      </div>
    </div>
  );
}
