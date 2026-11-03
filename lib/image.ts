/* Poze încărcate din panou: micșorare (max. 800 px) + decupare fundal
   în browser cu U-2-Net (u2netp via onnxruntime-web). Fără flood-fill
   (mănâncă ambalajele albe). Dacă poza are deja fundal transparent, sărim U-2-Net.
   Rezultat: data-URI WebP → urcat la /api/images/upload. */

import { removeBackgroundBrowser } from '@/lib/remove-bg-browser';

const WEBP_Q = 0.85;
/** Alpha sub acest prag = „transparent” pentru detectare / crop. */
const ALPHA_CLEAR = 16;
/** Pe chenarul exterior: ≥ acest % pixeli clari ⇒ deja decupată. */
const EDGE_CLEAR_RATIO = 0.35;
/** În tot cadrul: ≥ acest % pixeli clari ⇒ deja decupată. */
const BODY_CLEAR_RATIO = 0.08;

function cropTransparent(c: HTMLCanvasElement, d: Uint8ClampedArray, w: number, h: number): string {
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > ALPHA_CLEAR) {
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
    return c2.toDataURL('image/webp', WEBP_Q);
  }
  return c.toDataURL('image/webp', WEBP_Q);
}

/**
 * Detectează poze deja cu fundal scos (PNG/WebP cu alpha pe margini).
 * JPEG / cadre complet opace → false.
 */
export function looksLikeCutout(data: Uint8ClampedArray, w: number, h: number): boolean {
  if (w < 4 || h < 4) return false;
  const border = Math.max(2, Math.round(Math.min(w, h) * 0.04));
  let edgeTotal = 0;
  let edgeClear = 0;
  let bodyClear = 0;
  let anyPartialAlpha = false;

  for (let y = 0; y < h; y++) {
    const onEdgeY = y < border || y >= h - border;
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > ALPHA_CLEAR && a < 250) anyPartialAlpha = true;
      if (a <= ALPHA_CLEAR) bodyClear += 1;
      const onEdge = onEdgeY || x < border || x >= w - border;
      if (!onEdge) continue;
      edgeTotal += 1;
      if (a <= ALPHA_CLEAR) edgeClear += 1;
    }
  }

  if (edgeTotal === 0) return false;
  const edgeRatio = edgeClear / edgeTotal;
  const bodyRatio = bodyClear / (w * h);
  /* Chenar majoritar transparent SAU suficient alpha în cadru + ceva soft-edge. */
  return edgeRatio >= EDGE_CLEAR_RATIO
    || (bodyRatio >= BODY_CLEAR_RATIO && (anyPartialAlpha || edgeRatio >= 0.15));
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
  const k = Math.min(1, 800 / Math.max(im.width, im.height));
  const w = Math.round(im.width * k);
  const h = Math.round(im.height * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.drawImage(im, 0, 0, w, h);

  if (!cut) {
    return c.toDataURL('image/webp', WEBP_Q);
  }

  const srcId = ctx.getImageData(0, 0, w, h);
  if (looksLikeCutout(srcId.data, w, h)) {
    /* Deja fără fundal — doar crop pe conținut + WebP. */
    return cropTransparent(c, srcId.data, w, h);
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
  const ctxCut = cCut.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
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
