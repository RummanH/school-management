import QRCode from 'qrcode';
import { THEME } from './theme.js';

// School logos are stored either as a data: URI (uploaded/base64) or a plain
// https URL (external host). Either way PDFKit needs raw bytes, not a URL, so
// this resolves both — and swallows failures, since a broken logo should
// never block a document from generating.
export async function loadImageBuffer(url) {
  if (!url) return null;
  try {
    if (url.startsWith('data:')) {
      const base64 = url.split(',')[1];
      return base64 ? Buffer.from(base64, 'base64') : null;
    }
    if (/^https?:\/\//i.test(url)) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
      } finally {
        clearTimeout(timeout);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function buildVerifyQrPng(verifyUrl) {
  return QRCode.toBuffer(verifyUrl, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
    color: { dark: THEME.brandStrong, light: '#FFFFFF' },
  });
}
