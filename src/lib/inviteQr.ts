import QRCode from 'qrcode';

export function inviteLink(code: string, origin = window.location.origin): string {
  return `${origin}/join/${code}`;
}

export async function inviteQrDataUrl(link: string, size = 280): Promise<string> {
  return QRCode.toDataURL(link, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#212a33', light: '#ffffff' },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
