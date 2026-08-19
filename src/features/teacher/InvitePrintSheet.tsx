import { useEffect, useState } from 'react';
import { Button, GhostButton } from '@/ui';
import { inviteLink, inviteQrDataUrl } from '@/lib/inviteQr';
import type { Student } from '@/types/domain';

export type PrintInviteRow = {
  student: Student;
  code: string;
};

type Card = PrintInviteRow & { link: string; qr: string };

type Props = {
  className: string;
  rows: PrintInviteRow[];
  onClose: () => void;
};

/** In-app invite sheet preview (avoids blank popup tabs from async window.open). */
export function InvitePrintPreview({ className, rows, onClose }: Props) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const next = await Promise.all(
          rows.map(async ({ student, code }) => {
            const link = inviteLink(code);
            const qr = await inviteQrDataUrl(link, 220);
            return { student, code, link, qr };
          }),
        );
        if (alive) setCards(next);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : '無法產生邀請單');
      }
    })();
    return () => {
      alive = false;
    };
  }, [rows]);

  return (
    <div className="invite-print-layer" role="dialog" aria-modal="true" aria-label="家長邀請單">
      <div className="invite-print-toolbar no-print">
        <div className="invite-print-toolbar-title">家長邀請單預覽</div>
        <div className="invite-print-toolbar-actions">
          <Button
            tone="amber"
            disabled={!cards?.length}
            onClick={() => {
              window.print();
            }}
          >
            列印／存成 PDF
          </Button>
          <GhostButton onClick={onClose}>關閉</GhostButton>
        </div>
      </div>

      <div className="invite-print-page">
        <h1 className="invite-print-h1">
          {className} · 家長邀請單
        </h1>
        <p className="invite-print-hint">
          每位學生一組家庭邀請碼；爸媽可用同一 QR／連結綁定。掃描後註冊或登入即可。
        </p>

        {err && <div className="info" style={{ background: 'var(--pink-soft)', color: '#c33f4c' }}>{err}</div>}
        {!cards && !err && <div className="invite-print-loading">產生 QR 中…</div>}
        {cards && (
          <div className="invite-print-grid">
            {cards.map((c) => (
              <article key={c.student.id} className="invite-print-card">
                <div className="invite-print-name">
                  {c.student.seat}　{c.student.name}
                </div>
                <img src={c.qr} alt="" width={160} height={160} />
                <div className="invite-print-code">{c.code}</div>
                <div className="invite-print-link">{c.link}</div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
