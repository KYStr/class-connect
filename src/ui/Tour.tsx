import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface TourStep {
  /** ≤ 1 sentence (SPEC L17). */
  body: string;
  /** CSS selector inside the phone `.screen` (e.g. [data-tour="feature-grades"]). */
  target?: string;
  /** Run when this step becomes active (e.g. switch tab). */
  onEnter?: () => void;
}

interface TourProps {
  open: boolean;
  steps: TourStep[];
  /** Called on skip / mask click / finish — leave user on current screen. */
  onDone: () => void;
  title?: string;
  /** Show prev/next for feature map (settings guide). Welcome keeps next-only. */
  browsable?: boolean;
}

type Spot = {
  top: number;
  left: number;
  width: number;
  height: number;
  cardTop: number;
};

function screenEl(): HTMLElement | null {
  return document.querySelector('.phone .screen');
}

function padFor(el: HTMLElement, target?: string): number {
  if (target?.includes('tab-') || el.classList.contains('tab')) return 2;
  if (el.classList.contains('toggle-row')) return 4;
  return 3;
}

function measure(step: TourStep | undefined, cardHeight: number): Spot | null {
  const screen = screenEl();
  if (!screen || !step?.target) return null;
  const el = screen.querySelector(step.target) as HTMLElement | null;
  if (!el) return null;

  const sr = screen.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  const rawTop = er.top - sr.top;
  const rawLeft = er.left - sr.left;
  const rawW = Math.min(er.width, sr.width);
  const rawH = Math.min(er.height, sr.height);

  const pad = padFor(el, step.target);
  const top = Math.max(0, rawTop - pad);
  const left = Math.max(0, rawLeft - pad);
  const width = Math.min(rawW + pad * 2, sr.width - left);
  const height = Math.min(rawH + pad * 2, sr.height - top);

  const gap = 14;
  const spaceBelow = sr.height - (top + height);
  const placeBelow = spaceBelow > cardHeight + gap + 64;
  const cardTop = placeBelow
    ? Math.min(top + height + gap, Math.max(12, sr.height - cardHeight - 72))
    : Math.max(12, top - cardHeight - gap);

  return { top, left, width, height, cardTop };
}

/** Spotlight-only tour (no arrow). Mask click closes and keeps current screen. */
export function Tour({
  open,
  steps,
  onDone,
  title = '快速導覽',
  browsable = false,
}: TourProps) {
  const labelId = useId();
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    setHost(screenEl());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDone]);

  const step = steps[Math.min(index, Math.max(0, steps.length - 1))];

  // Navigate / focus when step changes.
  useEffect(() => {
    if (!open || !step) return;
    step.onEnter?.();
  }, [open, index, step]);

  useLayoutEffect(() => {
    if (!open || !step) {
      setSpot(null);
      return;
    }

    let cancelled = false;
    const screen = screenEl();
    const scroll = screen?.querySelector('.scr-scroll');

    const run = () => {
      if (cancelled) return;
      const el = step.target ? (screen?.querySelector(step.target) as HTMLElement | null) : null;
      if (el) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      }
      const cardH = cardRef.current?.offsetHeight || 132;
      setSpot(measure(step, cardH));
    };

    run();
    const t1 = window.setTimeout(run, 80);
    const t2 = window.setTimeout(run, 220);
    const raf = requestAnimationFrame(() => requestAnimationFrame(run));

    scroll?.addEventListener('scroll', run, { passive: true });
    window.addEventListener('resize', run);
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      cancelAnimationFrame(raf);
      scroll?.removeEventListener('scroll', run);
      window.removeEventListener('resize', run);
    };
  }, [open, step, index]);

  if (!open || steps.length === 0 || !host) return null;

  const last = index >= steps.length - 1;
  const first = index <= 0;
  const hasTarget = Boolean(step?.target && spot);

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (last) onDone();
    else setIndex((i) => i + 1);
  };

  const node = (
    <div className="tour-root" role="dialog" aria-modal="true" aria-labelledby={labelId}>
      <button
        type="button"
        className={`tour-mask${hasTarget ? ' dim-only' : ''}`}
        aria-label="關閉導覽，留在此頁"
        onClick={onDone}
      />
      {hasTarget && spot && (
        <div
          className="tour-spot"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
          }}
        />
      )}
      <div
        ref={cardRef}
        className={`tour-card${hasTarget ? ' tour-card-anchored' : ''}`}
        style={
          hasTarget && spot
            ? { top: spot.cardTop, bottom: 'auto', marginBottom: 0 }
            : undefined
        }
      >
        <div className="tour-kicker" id={labelId}>
          {title}
          <span className="tour-count">
            {index + 1}/{steps.length}
          </span>
        </div>
        <p className="tour-body">{step?.body}</p>
        <p className="tour-hint">點灰色暗處可關閉，畫面會停在這裡</p>
        <div className="tour-actions">
          {browsable ? (
            <>
              <button
                type="button"
                className="tour-btn ghost"
                disabled={first}
                onClick={goPrev}
              >
                上一步
              </button>
              <button type="button" className="tour-btn primary" onClick={goNext}>
                {last ? '完成' : '下一步'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="tour-btn ghost" onClick={onDone}>
                略過
              </button>
              {last ? (
                <button type="button" className="tour-btn primary" onClick={onDone}>
                  知道了
                </button>
              ) : (
                <button type="button" className="tour-btn primary" onClick={goNext}>
                  下一步
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(node, host);
}
