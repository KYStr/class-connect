import { useEffect, useState } from 'react';
import { Button, GhostButton, useToast } from '@/ui';
import { downloadDataUrl, inviteLink, inviteQrDataUrl } from '@/lib/inviteQr';
import type { Student } from '@/types/domain';

type Props = {
  student: Student;
  code: string;
  guardianCount: number;
  busy?: boolean;
  onClose: () => void;
  onRegenerate: () => void;
};

export function InviteQrSheet({
  student,
  code,
  guardianCount,
  busy,
  onClose,
  onRegenerate,
}: Props) {
  const { toast } = useToast();
  const link = inviteLink(code);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void inviteQrDataUrl(link).then((url) => {
      if (alive) setQr(url);
    });
    return () => {
      alive = false;
    };
  }, [link]);

  return (
    <div className="invite-sheet-layer">
      <button type="button" className="invite-sheet-mask" aria-label="關閉" onClick={onClose} />
      <div className="invite-sheet" role="dialog" aria-modal="true" aria-label="學生邀請">
        <div className="invite-sheet-title">
          {student.seat} {student.name}
        </div>
        <div className="invite-sheet-sub">
          同一連結／QR 可供多位家長綁定
          {guardianCount > 0 ? ` · 已綁定 ${guardianCount} 位` : ''}
        </div>
        <div className="invite-qr-wrap">
          {qr ? <img src={qr} alt="邀請 QR code" width={200} height={200} /> : <div className="invite-qr-ph" />}
        </div>
        <div className="invite-code">{code}</div>
        <input className="in invite-link-in" readOnly value={link} onFocus={(e) => e.target.select()} />
        <div className="invite-sheet-actions">
          <Button
            tone="amber"
            onClick={() => {
              void navigator.clipboard.writeText(link);
              toast('已複製邀請連結');
            }}
          >
            複製連結
          </Button>
          <GhostButton
            disabled={!qr}
            onClick={() => {
              if (!qr) return;
              downloadDataUrl(qr, `invite-${student.seat}-${student.name}.png`);
              toast('已下載 QR');
            }}
          >
            下載 QR
          </GhostButton>
          <GhostButton disabled={busy} onClick={onRegenerate}>
            {busy ? '產生中…' : '重新產生'}
          </GhostButton>
          <GhostButton onClick={onClose}>關閉</GhostButton>
        </div>
      </div>
    </div>
  );
}
