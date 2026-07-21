import type { ReactNode } from 'react';

type PillTone = 'p' | 'a' | 'b' | 'g';

interface PillProps {
  tone?: PillTone;
  children: ReactNode;
}

// Status / semantic label (DESIGN.md §6). Color carries meaning — never decorative.
export function Pill({ tone = 'g', children }: PillProps) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
