/* Cod QR desenat pe canvas (qrcode-generator 2.0.4, MIT — aceeași bibliotecă ca în prototipul static). */
import qrcode from 'qrcode-generator';

export function drawQR(canvas: HTMLCanvasElement, text: string, px: number): HTMLCanvasElement {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), quiet = 4, cell = Math.floor(px / (n + quiet * 2)), size = cell * (n + quiet * 2);
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#111';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
  return canvas;
}
