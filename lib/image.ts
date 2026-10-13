/* Poze încărcate din panou: micșorare (max. 700 px) + decupare fundal
   (U-2-Net via /api/remove-bg; fallback flood-fill pe alb), apoi tăiere
   la marginile produsului. Rezultat: data-URI WebP. */

function floodFillWhite(ctx: CanvasRenderingContext2D, w: number, h: number): ImageData {
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const seen = new Uint8Array(w * h);
  const st: number[] = [];
  const isBg = (q: number) => {
    const r = d[q * 4], g = d[q * 4 + 1], b = d[q * 4 + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    return mn > 212 && mx - mn < 30;
  };
  for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
  while (st.length) {
    const q = st.pop() as number;
    if (seen[q]) continue;
    seen[q] = 1;
    if (!isBg(q)) continue;
    d[q * 4 + 3] = 0;
    const x = q % w;
    if (x > 0) st.push(q - 1);
    if (x < w - 1) st.push(q + 1);
    if (q >= w) st.push(q - w);
    if (q < w * (h - 1)) st.push(q + w);
  }
  ctx.putImageData(id, 0, 0);
  return id;
}

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

async function removeBgViaApi(dataUrl: string): Promise<string> {
  const res = await fetch('/api/remove-bg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: dataUrl }),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) detail = j.error;
    } catch { /* body may be empty */ }
    throw new Error(`remove-bg ${res.status}: ${detail}`);
  }
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
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

  const resizedDataUrl = c.toDataURL('image/png');

  try {
    const cutDataUrl = await removeBgViaApi(resizedDataUrl);
    const cutIm = await loadImage(cutDataUrl);
    const cCut = document.createElement('canvas');
    cCut.width = cutIm.width;
    cCut.height = cutIm.height;
    const ctxCut = cCut.getContext('2d') as CanvasRenderingContext2D;
    ctxCut.drawImage(cutIm, 0, 0);
    const id = ctxCut.getImageData(0, 0, cCut.width, cCut.height);
    return cropTransparent(cCut, id.data, cCut.width, cCut.height);
  } catch (err) {
    console.warn('[processImage] U-2-Net a eșuat; fallback flood-fill pe alb:', err);
    const id = floodFillWhite(ctx, w, h);
    return cropTransparent(c, id.data, w, h);
  }
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
