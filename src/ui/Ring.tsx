// SVG progress ring — signature element (DESIGN.md §5.2). Ports the demo's ring() math.

interface RingProps {
  /** 0–100 */
  pct: number;
  /** foreground stroke + label color */
  fg?: string;
  /** track stroke color */
  track?: string;
  size?: number;
}

export function Ring({ pct, fg = '#ffffff', track = 'rgba(255,255,255,.28)', size = 62 }: RingProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = 25;
  const c = 2 * Math.PI * r;
  const off = c * (1 - clamped / 100);
  return (
    <span className="ringwrap">
      <svg viewBox="0 0 62 62" width={size} height={size} role="img" aria-label={`${clamped}%`}>
        <circle cx="31" cy="31" r={r} fill="none" stroke={track} strokeWidth="7" />
        <circle
          cx="31"
          cy="31"
          r={r}
          fill="none"
          stroke={fg}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={off.toFixed(1)}
          transform="rotate(-90 31 31)"
        />
        <text x="31" y="36" textAnchor="middle" fontSize="15" fontWeight="900" fill={fg}>
          {clamped}%
        </text>
      </svg>
    </span>
  );
}
