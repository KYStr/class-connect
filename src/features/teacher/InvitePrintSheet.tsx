import { inviteLink, inviteQrDataUrl } from '@/lib/inviteQr';
import type { Student } from '@/types/domain';

export type PrintInviteRow = {
  student: Student;
  code: string;
};

/** Open a print-friendly window with name + QR + short code + link for each student. */
export async function openInvitePrintSheet(
  className: string,
  rows: PrintInviteRow[],
): Promise<void> {
  if (rows.length === 0) return;

  const cards = await Promise.all(
    rows.map(async ({ student, code }) => {
      const link = inviteLink(code);
      const qr = await inviteQrDataUrl(link, 220);
      return { student, code, link, qr };
    }),
  );

  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) throw new Error('無法開啟列印視窗，請允許彈出視窗');

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const body = cards
    .map(
      (c) => `
      <article class="card">
        <div class="name">${esc(c.student.seat)}　${esc(c.student.name)}</div>
        <img src="${c.qr}" alt="QR" width="160" height="160" />
        <div class="code">${esc(c.code)}</div>
        <div class="link">${esc(c.link)}</div>
      </article>`,
    )
    .join('');

  win.document.write(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>${esc(className)} · 家長邀請單</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif; margin: 16px; color: #212a33; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .hint { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .card {
      border: 1px solid #d8dde3; border-radius: 12px; padding: 14px; text-align: center;
      break-inside: avoid; page-break-inside: avoid;
    }
    .name { font-weight: 700; font-size: 15px; margin-bottom: 8px; }
    .code { font-family: ui-monospace, monospace; font-size: 14px; letter-spacing: 0.08em; margin-top: 6px; }
    .link { font-size: 10px; color: #6b7280; word-break: break-all; margin-top: 4px; }
    @media print {
      body { margin: 8mm; }
      .no-print { display: none !important; }
      .grid { grid-template-columns: repeat(2, 1fr); gap: 8mm; }
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom:12px;padding:8px 14px;font-size:14px;">列印／存成 PDF</button>
  <h1>${esc(className)} · 家長邀請單</h1>
  <p class="hint">每位學生一組家庭邀請碼；爸媽可用同一 QR／連結綁定。掃描後註冊或登入即可。</p>
  <div class="grid">${body}</div>
</body>
</html>`);
  win.document.close();
}
