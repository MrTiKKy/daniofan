/* Poze încărcate din panou: micșorare (max. 700 px) + decupare fundal
   în browser cu U-2-Net (u2netp via onnxruntime-web). Fără flood-fill
   (mănâncă ambalajele albe). Rezultat: data-URI WebP. */

import { removeBackgroundBrowser } from '@/lib/remove-bg-browser';

function cropTransparent(c: HTMLCanvasElement, d: Uint8ClampedArray, w: number, h: number): string {
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 > x0 && y1 > y0) {
    const c2 = document.createElement('canvas');
    c2.width = x1 - x0 + 1;
    c2.height = y1 - y0 + 1;
    (c2.getContext('2d') as CanvasRenderingContext2D).drawImage(
      c, x0, y0, c2.width, c2.height, 0, 0, c2.width, c2.height,
    );
    return c2.toDataURL('image/webp', 0.85);
  }
  return c.toDataURL('image/webp', 0.85);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

export async function processImage(file: File, cut: boolean): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => resolve(fr.result as string);
    fr.readAsDataURL(file);
  });

  const im = await loadImage(dataUrl);
  const k = Math.min(1, 700 / Math.max(im.width, im.height));
  const w = Math.round(im.width * k);
  const h = Math.round(im.height * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(im, 0, 0, w, h);

  if (!cut) {
    return c.toDataURL('image/webp', 0.85);
  }

  const cutBlob = await removeBackgroundBrowser(c);
  const cutDataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(cutBlob);
  });

  const cutIm = await loadImage(cutDataUrl);
  const cCut = document.createElement('canvas');
  cCut.width = cutIm.width;
  cCut.height = cutIm.height;
  const ctxCut = cCut.getContext('2d') as CanvasRenderingContext2D;
  ctxCut.drawImage(cutIm, 0, 0);
  const id = ctxCut.getImageData(0, 0, cCut.width, cCut.height);
  return cropTransparent(cCut, id.data, cCut.width, cCut.height);
}

/** Parsează un preț scris de mână („3,19” sau „3.19”) */
export const num = (v: string | number): number => {
  const n = parseFloat(String(v).replace(',', '.'));
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export function download(url: string, name: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
