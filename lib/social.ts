/* Generator de imagini pentru Facebook / Instagram / Story — desenat pe <canvas>, 100% local.
   Același șablon ca pliantul lor: angajatul scrie produsele, sistemul face imaginea.
   Port 1:1 din js/social.js al prototipului static. */
import * as DF from './store';
import type { OfferData, Product, ResolvedOffer } from './types';
import { getTheme, THEMES, type Theme, type ThemePalette } from './themes';

export type FormatKey = 'square' | 'portrait' | 'story';
/** Alias: previzualizarea de share = exact postarea pătrată. */
export type RenderFormatKey = FormatKey;
export const FORMATS: Record<FormatKey, { w: number; h: number; label: string; size: string }> = {
  square: { w: 1080, h: 1080, label: 'Postare Facebook — pătrat', size: '1080×1080' },
  portrait: { w: 1080, h: 1350, label: 'Postare Facebook / Instagram — portret', size: '1080×1350' },
  story: { w: 1080, h: 1920, label: 'Story Facebook / Instagram / WhatsApp', size: '1080×1920' },
};
export const FORMAT_KEYS: FormatKey[] = ['square', 'portrait', 'story'];
/** Facebook / WhatsApp og:image = aceeași imagine ca «Postare Facebook — pătrat». */
export const OG_FORMAT: FormatKey = 'square';
export const OG_WIDTH = FORMATS.square.w;
export const OG_HEIGHT = FORMATS.square.h;

type Ctx = CanvasRenderingContext2D;
type Rect = { x: number; y: number; w: number; h: number };
/** paleta temei curente (se setează la începutul fiecărei randări) */
let C: ThemePalette = THEMES.standard.pal;
let THEME: Theme = THEMES.standard;
const FAM = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
const F = (w: number | string, s: number, it?: boolean) => `${it ? 'italic ' : ''}${w} ${Math.max(1, Math.round(s))}px ${FAM}`;
const FB = (w: number | string, s: number) => `${w} ${Math.max(1, Math.round(s))}px Barlow, Arial, sans-serif`;
const rad = (d: number) => d * Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

let fontsReady: Promise<unknown> | null = null;
export function ensureFonts(): Promise<unknown> {
  if (fontsReady) return fontsReady;
  const sample = 'AȘȚĂÎÂășțîâ0123';
  const jobs: Promise<unknown>[] = [];
  ['700', '800', '900'].forEach((w) => { jobs.push(document.fonts.load(F(w, 40), sample)); });
  ['800', '900'].forEach((w) => jobs.push(document.fonts.load(F(w, 40, true), sample)));
  jobs.push(document.fonts.load(FB(600, 20), sample), document.fonts.load(FB(700, 20), sample));
  fontsReady = Promise.all(jobs).catch(() => null);
  return fontsReady;
}
const imgCache = new Map<string, Promise<HTMLImageElement | null>>();
function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  src = DF.imageSrc(src);
  const hit = imgCache.get(src);
  if (hit) return hit;
  const pr = new Promise<HTMLImageElement | null>((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  imgCache.set(src, pr);
  return pr;
}

/* ---------- utilitare text ---------- */
type TextOpts = { font: string; align?: CanvasTextAlign; color?: string; shadow?: { color: string; dx: number; dy: number }; stroke?: string; strokeW?: number };
function fit(ctx: Ctx, t: string, font: (s: number) => string, maxW: number, maxS: number) { // mărimea maximă a fontului care încape în lățime
  ctx.font = font(100);
  const w = ctx.measureText(t).width || 1;
  return Math.max(8, Math.min(maxS, 100 * maxW / w));
}
function text(ctx: Ctx, t: string, x: number, y: number, o: TextOpts) {
  ctx.save();
  ctx.font = o.font; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  if (o.shadow) { ctx.fillStyle = o.shadow.color; ctx.fillText(t, x + o.shadow.dx, y + o.shadow.dy); }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW || 1; ctx.strokeText(t, x, y); }
  ctx.fillStyle = o.color || C.ink; ctx.fillText(t, x, y);
  ctx.restore();
}
function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function star(ctx: Ctx, cx: number, cy: number, r: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * 0.8 : r; const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/* ---------- fundal ---------- */
function background(ctx: Ctx, W: number, H: number, cx: number, cy: number) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const R = Math.hypot(W, H);
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = C.burst;
  const n = 40;
  for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a0 + (Math.PI / n) * 0.75); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(255,255,255,.96)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  decorations(ctx, W, H);
}

/* ---------- decoruri de sezon (desenate, fără imagini externe) ---------- */
const EGG_COLORS: [string, string][] = [['#E30613', '#FFE100'], ['#1559E0', '#fff'], ['#22B33A', '#FFE100'], ['#FF7A00', '#fff'], ['#B620C9', '#FFE100'], ['#FFC400', '#E30613']];
export function egg(ctx: Ctx, cx: number, cy: number, h: number, rot: number, cols: [string, string]) {
  const w = h * 0.74;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(rot));
  const shape = () => { ctx.beginPath(); ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(w * 0.62, -h / 2, w * 0.68, h * 0.18, w * 0.5, h * 0.32);
    ctx.bezierCurveTo(w * 0.3, h * 0.52, -w * 0.3, h * 0.52, -w * 0.5, h * 0.32);
    ctx.bezierCurveTo(-w * 0.68, h * 0.18, -w * 0.62, -h / 2, 0, -h / 2); ctx.closePath(); };
  ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = h * 0.08; ctx.shadowOffsetY = h * 0.04;
  shape(); ctx.fillStyle = cols[0]; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.save(); shape(); ctx.clip();
  ctx.fillStyle = cols[1]; ctx.strokeStyle = cols[1]; ctx.lineWidth = h * 0.045; ctx.lineJoin = 'round';
  // zig-zag + buline, ca la ouăle încondeiate
  ctx.beginPath(); const zy = -h * 0.02, n = 7;
  for (let i = 0; i <= n; i++) { const x = -w / 2 + (w * i) / n; ctx.lineTo(x, zy + (i % 2 ? -h * 0.07 : h * 0.07)); }
  ctx.stroke();
  ctx.fillRect(-w, -h * 0.22, w * 2, h * 0.05); ctx.fillRect(-w, h * 0.17, w * 2, h * 0.05);
  [-0.25, 0, 0.25].forEach((k) => { ctx.beginPath(); ctx.arc(w * k, -h * 0.33, h * 0.04, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(w * k, h * 0.3, h * 0.035, 0, 7); ctx.fill(); });
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-w * 0.2, -h * 0.25, w * 0.08, h * 0.12, rad(20), 0, 7); ctx.fill();
  shape(); ctx.lineWidth = Math.max(2, h * 0.03); ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.restore();
}
export function snowflake(ctx: Ctx, cx: number, cy: number, r: number, color: string, alpha = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, r * 0.13);
  for (let i = 0; i < 6; i++) {
    ctx.save(); ctx.rotate((i * Math.PI) / 3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r);
    ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.28, -r * 0.8); ctx.moveTo(0, -r * 0.55); ctx.lineTo(-r * 0.28, -r * 0.8);
    ctx.moveTo(0, -r * 0.3); ctx.lineTo(r * 0.18, -r * 0.45); ctx.moveTo(0, -r * 0.3); ctx.lineTo(-r * 0.18, -r * 0.45);
    ctx.stroke(); ctx.restore();
  }
  ctx.restore();
}
function decorations(ctx: Ctx, W: number, H: number) {
  const s = Math.min(W, H);
  if (THEME.key === 'paste') {
    // ouă în colțuri + „iarbă" jos
    ([[0.06, 0.12, 0.16, -18], [0.95, 0.1, 0.14, 16], [0.04, 0.55, 0.11, -10], [0.97, 0.6, 0.12, 12]] as const)
      .forEach(([x, y, k, r], i) => egg(ctx, W * x, H * y, s * k, r, EGG_COLORS[i % EGG_COLORS.length]));
  } else if (THEME.key === 'craciun') {
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 26; i++) snowflake(ctx, rnd() * W, rnd() * H, s * (0.015 + rnd() * 0.03), '#9EC9E8', 0.55);
    ([[0.06, 0.1, 0.07], [0.94, 0.12, 0.08], [0.05, 0.6, 0.05], [0.96, 0.55, 0.06]] as const)
      .forEach(([x, y, k]) => snowflake(ctx, W * x, H * y, s * k, '#fff', 1));
    ([[0.06, 0.1, 0.07], [0.94, 0.12, 0.08], [0.05, 0.6, 0.05], [0.96, 0.55, 0.06]] as const)
      .forEach(([x, y, k]) => snowflake(ctx, W * x, H * y, s * k * 0.8, '#5FA8D8', 1));
  }
}

/* ---------- banda de sărbătoare (sus) ---------- */
function holidayBand(ctx: Ctx, W: number, h: number) {
  const b = THEME.banner; if (!b) return;
  const P = C;
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, P.band); g.addColorStop(1, P.bandDark);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, h);
  // raze în bandă
  ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = '#fff'; ctx.translate(W / 2, h * 0.5);
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, W, a, a + 0.06); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // margine de jos: ouă -> zig-zag galben; Crăciun -> dungi roșu/alb (baston)
  const eh = Math.max(8, h * 0.11);
  if (THEME.key === 'craciun') {
    ctx.save(); ctx.beginPath(); ctx.rect(0, h - eh, W, eh); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(0, h - eh, W, eh);
    ctx.fillStyle = P.red; for (let x = -eh * 2; x < W + eh * 2; x += eh * 2) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + eh, h); ctx.lineTo(x + eh * 2, h - eh); ctx.lineTo(x + eh, h - eh); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = P.yellowDeep; ctx.fillRect(0, 0, W, Math.max(3, h * 0.04));
  } else {
    ctx.fillStyle = P.yellowDeep; ctx.beginPath(); ctx.moveTo(0, h - eh);
    for (let x = 0; x <= W + eh; x += eh) ctx.lineTo(x, (x / eh) % 2 ? h : h - eh);
    ctx.lineTo(W, h - eh); ctx.lineTo(W, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    ctx.fillRect(0, h - eh * 0.45, W, eh * 0.45);
  }
  const side = h >= 140 ? h * 1.2 : h * 1.15, inner = W - side * 2 - (h >= 140 ? h * 0.5 : 0);
  const big = b[0], small = b[1];
  if (h >= 140) { // story: două rânduri mari
    const bs = fit(ctx, big, (z) => F(900, z, true), inner, h * 0.5);
    const ss = fit(ctx, small, (z) => F(900, z, true), inner, h * 0.27);
    const y1 = h * 0.08 + bs * 0.82, y2 = y1 + ss * 1.12;
    text(ctx, big, W / 2, y1, { font: F(900, bs, true), align: 'center', color: P.bandText, stroke: P.bandDark, strokeW: bs * 0.16, shadow: { color: 'rgba(0,0,0,.35)', dx: bs * 0.04, dy: bs * 0.06 } });
    text(ctx, small, W / 2, y2, { font: F(900, ss, true), align: 'center', color: '#fff', stroke: P.bandDark, strokeW: ss * 0.14 });
  } else {
  const bs = fit(ctx, big + '  ' + small, (z) => F(900, z, true), inner, h * 0.62);
  ctx.font = F(900, bs, true); const bw = ctx.measureText(big + ' ').width;
  const ss = bs * 0.62; ctx.font = F(900, ss, true); const sw = ctx.measureText(small).width;
  let x0 = W / 2 - (bw + sw) / 2; const y = h * 0.44 + bs * 0.36;
  if (bw + sw > inner) x0 = side;
  text(ctx, big, x0, y, { font: F(900, bs, true), color: P.bandText, stroke: P.bandDark, strokeW: bs * 0.16, shadow: { color: 'rgba(0,0,0,.35)', dx: bs * 0.04, dy: bs * 0.06 } });
  text(ctx, small, x0 + bw, y, { font: F(900, ss, true), color: '#fff', stroke: P.bandDark, strokeW: ss * 0.14 });
  }
  if (THEME.key === 'paste') {
    egg(ctx, side * 0.36, h * 0.47, h * 0.66, -16, EGG_COLORS[0]); egg(ctx, side * 0.78, h * 0.5, h * 0.54, 14, EGG_COLORS[1]);
    egg(ctx, W - side * 0.36, h * 0.47, h * 0.66, 16, EGG_COLORS[4]); egg(ctx, W - side * 0.78, h * 0.5, h * 0.54, -14, EGG_COLORS[3]);
  } else {
    const k = h >= 140 ? 0.8 : 1;
    snowflake(ctx, side * 0.38, h * 0.45, h * 0.34 * k, '#fff'); snowflake(ctx, side * 0.85, h * 0.42, h * 0.2 * k, P.bandText);
    snowflake(ctx, W - side * 0.38, h * 0.45, h * 0.34 * k, '#fff'); snowflake(ctx, W - side * 0.85, h * 0.42, h * 0.2 * k, P.bandText);
  }
  ctx.restore();
}

/* ---------- logo (recreat, nu copiat) ---------- */
function logoWord(ctx: Ctx, t: string, x: number, y: number, s: number, fill: string, dark: string, align: CanvasTextAlign) {
  const font = F(900, s, true);
  ctx.save(); ctx.font = font; ctx.textAlign = align; ctx.lineJoin = 'round';
  ctx.strokeStyle = dark; ctx.fillStyle = dark; ctx.lineWidth = s * 0.2;
  ctx.strokeText(t, x + s * 0.05, y + s * 0.06); ctx.fillText(t, x + s * 0.05, y + s * 0.06);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.17; ctx.strokeText(t, x, y);
  ctx.fillStyle = fill; ctx.fillText(t, x, y);
  ctx.restore();
}
function cart(ctx: Ctx, x: number, y: number, s: number) { // s = înălțime
  const k = s / 52;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const path = () => { ctx.beginPath(); ctx.moveTo(2, 6); ctx.lineTo(11, 6); ctx.lineTo(18, 34); ctx.lineTo(50, 34); ctx.lineTo(56, 14); ctx.lineTo(16, 14); };
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 11; path(); ctx.stroke();
  ctx.strokeStyle = C.blue; ctx.lineWidth = 5; path(); ctx.stroke();
  ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(53, 20); ctx.moveTo(22, 27); ctx.lineTo(50, 27); ctx.stroke();
  ([[24, C.red], [46, C.yellowDeep]] as const).forEach(([cx, col]) => { ctx.beginPath(); ctx.arc(cx, 44, 6.5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.beginPath(); ctx.arc(cx, 44, 5, 0, 7); ctx.fillStyle = col; ctx.fill(); });
  ctx.restore();
}
function logo(ctx: Ctx, cx: number, top: number, width: number) { // întoarce y-ul de jos
  const s1 = fit(ctx, 'DANIOFAN', (s) => F(900, s, true), width * 0.9, 200);
  const y1 = top + s1 * 0.78;
  logoWord(ctx, 'DANIOFAN', cx, y1, s1, C.blue, C.blueDark, 'center');
  const s2 = s1 * 0.86;
  ctx.font = F(900, s2, true);
  const mw = ctx.measureText('MARKET').width, cw = s2 * 0.95, total = mw + cw + s2 * 0.08;
  const y2 = y1 + s2 * 0.86;
  logoWord(ctx, 'MARKET', cx - total / 2, y2, s2, C.red, '#7a0008', 'left');
  cart(ctx, cx - total / 2 + mw + s2 * 0.08, y2 - s2 * 0.78, s2 * 0.8);
  return y2 + s2 * 0.18;
}

/* ---------- titlul ofertei pe panglică roșie ---------- */
function title(ctx: Ctx, cx: number, top: number, maxW: number, offer: ResolvedOffer, scale: number) {
  const [small, big] = DF.splitTitle(offer.title);
  const dates = DF.fmtRange(offer.start, offer.end).toUpperCase();
  const bigS = fit(ctx, big.toUpperCase(), (s) => F(900, s, true), maxW * 0.78, 96 * scale);
  const smallS = bigS * 0.46, dateS = bigS * 0.44;
  ctx.font = F(900, bigS, true); const bw = ctx.measureText(big.toUpperCase()).width;
  ctx.font = F(900, dateS, true); const dw = ctx.measureText(dates).width;
  const boxW = Math.min(maxW, Math.max(bw, dw) + bigS * 0.75);
  const boxH = (small ? smallS * 1.0 : 0) + bigS * 0.92 + dateS * 1.05 + bigS * 0.42;
  const cy = top + boxH / 2 + 6;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-3));
  // raze laterale
  [-1, 1].forEach((side) => {
    ([[-0.32, 28, C.yellowDeep, 0.5], [0, 0, C.red, 0.62], [0.32, -28, C.yellowDeep, 0.5]] as const).forEach(([dy, ang, col, len]) => {
      ctx.save(); ctx.translate(side * (boxW / 2 + bigS * 0.15), dy * boxH); ctx.rotate(rad(side * -ang));
      ctx.fillStyle = col; rrect(ctx, side > 0 ? 0 : -bigS * len, -bigS * 0.05, bigS * len, bigS * 0.1, bigS * 0.05); ctx.fill(); ctx.restore();
    });
  });
  ctx.save(); ctx.transform(1, 0, -0.14, 1, 0, 0);
  ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
  ctx.fillStyle = C.redDark; rrect(ctx, -boxW / 2, -boxH / 2 + 8, boxW, boxH, 12); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#fff'; rrect(ctx, -boxW / 2 - 5, -boxH / 2 - 5, boxW + 10, boxH + 10, 15); ctx.fill();
  ctx.fillStyle = C.red; rrect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 12); ctx.fill();
  ctx.restore();
  let y = -boxH / 2 + bigS * 0.2;
  if (small) { y += smallS * 0.8; text(ctx, small, 0, y, { font: F(900, smallS, true), align: 'center', color: '#fff' }); y += smallS * 0.2; }
  y += bigS * 0.78;
  text(ctx, big.toUpperCase(), 0, y, { font: F(900, bigS, true), align: 'center', color: C.yellow, stroke: C.redDark, strokeW: bigS * 0.12 });
  y += dateS * 1.1;
  text(ctx, dates, 0, y, { font: F(900, dateS, true), align: 'center', color: '#fff' });
  ctx.restore();
  return top + boxH + 22;
}

/* ---------- elementele unui produs ---------- */
function grass(ctx: Ctx, x: number, y: number, w: number, h: number, front: boolean) { // y = baza
  let seed = Math.round(x * 7 + w); const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const n = Math.max(10, Math.round(w / (front ? 9 : 6)));
  const cols = front ? ['#3DBE3A', '#58D24A', '#2EA22E'] : ['#1E8C2A', '#2BA334', '#167022'];
  for (let i = 0; i < n; i++) {
    const bx = x + (w * (i + rnd() * 0.8)) / n, bh = h * (front ? 0.35 + rnd() * 0.45 : 0.6 + rnd() * 0.4), bw = w / n * 1.6, lean = (rnd() - 0.5) * bh * 0.6;
    ctx.beginPath(); ctx.moveTo(bx - bw / 2, y); ctx.quadraticCurveTo(bx + lean * 0.3, y - bh * 0.6, bx + lean, y - bh); ctx.quadraticCurveTo(bx + lean * 0.4, y - bh * 0.5, bx + bw / 2, y); ctx.closePath();
    ctx.fillStyle = cols[i % 3]; ctx.fill();
  }
}
function snowMound(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,40,80,.25)'; ctx.shadowBlur = h * 0.3;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w * 0.2, y - h * 1.1, x + w * 0.45, y - h * 0.7); ctx.quadraticCurveTo(x + w * 0.7, y - h * 1.2, x + w, y); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawImage(ctx: Ctx, img: HTMLImageElement | null | undefined, x: number, y: number, w: number, h: number) {
  const gh = Math.min(h * 0.16, w * 0.22);
  if (THEME.key === 'paste') {
    grass(ctx, x, y + h, w, gh * 1.3, false);
    egg(ctx, x + w * 0.1, y + h - gh * 0.55, gh * 1.15, -18, EGG_COLORS[(Math.round(x + y) >> 3) % EGG_COLORS.length]);
    egg(ctx, x + w * 0.9, y + h - gh * 0.5, gh * 0.95, 16, EGG_COLORS[((Math.round(x + y) >> 3) + 2) % EGG_COLORS.length]);
  } else if (THEME.key === 'craciun') snowMound(ctx, x + w * 0.05, y + h, w * 0.9, gh * 0.8);
  drawImageRaw(ctx, img, x, y, w, h);
  if (THEME.key === 'paste') grass(ctx, x + w * 0.12, y + h, w * 0.76, gh * 0.55, true);
}
function drawImageRaw(ctx: Ctx, img: HTMLImageElement | null | undefined, x: number, y: number, w: number, h: number) {
  if (!img) {
    ctx.save(); ctx.strokeStyle = '#ccc'; ctx.setLineDash([10, 8]); ctx.lineWidth = 3; rrect(ctx, x + 6, y + 6, w - 12, h - 12, 14); ctx.stroke();
    text(ctx, 'FĂRĂ POZĂ', x + w / 2, y + h / 2, { font: F(900, Math.min(w * 0.16, 40)), align: 'center', color: '#aaa' }); ctx.restore(); return;
  }
  const k = Math.min(w / img.width, h / img.height);
  const dw = img.width * k, dh = img.height * k;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = dh * 0.04; ctx.shadowOffsetY = dh * 0.02;
  ctx.drawImage(img, x + (w - dw) / 2, y + h - dh, dw, dh); ctx.restore();
}
function discSticker(ctx: Ctx, cx: number, cy: number, r: number, pct: number) {
  if (!pct) return;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-12));
  ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = r * 0.15; ctx.shadowOffsetY = r * 0.06;
  star(ctx, 0, 0, r, 12); ctx.fillStyle = C.yellow; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(2, r * 0.05); ctx.strokeStyle = C.red; ctx.stroke();
  const t = '-' + pct + '%';
  const s = fit(ctx, t, (z) => F(900, z), r * 1.35, r * 0.72);
  text(ctx, t, 0, s * 0.36, { font: F(900, s), align: 'center', color: C.red });
  ctx.restore();
}
function oldBox(ctx: Ctx, p: Product, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = C.red; ctx.lineWidth = Math.max(3, h * 0.045);
  rrect(ctx, x, y, w, h, h * 0.12); ctx.fill(); ctx.stroke();
  const pad = h * 0.1;
  const ls = fit(ctx, 'PREȚ NORMAL', (s) => F(900, s), w - pad * 2, h * 0.24);
  text(ctx, 'PREȚ NORMAL', x + pad, y + pad + ls * 0.78, { font: F(900, ls), color: C.ink });
  const price = DF.fmtPrice(p.oldPrice);
  const us = h * 0.15;
  ctx.font = F(900, us); const uw = ctx.measureText('LEI/BUC').width;
  const ps = fit(ctx, price, (s) => F(900, s), w - pad * 2.4 - uw, h * 0.6);
  ctx.font = F(900, ps); const pw = ctx.measureText(price).width;
  const by = y + h - pad * 0.9;
  text(ctx, price, x + pad, by, { font: F(900, ps), color: '#222' });
  text(ctx, 'LEI/BUC', x + pad * 1.6 + pw, by, { font: F(900, us), color: C.ink });
  // linia roșie de tăiere
  ctx.translate(x + pad + pw / 2, by - ps * 0.36); ctx.rotate(rad(-10));
  ctx.fillStyle = C.red; rrect(ctx, -pw / 2 - ps * 0.1, -ps * 0.055, pw + ps * 0.2, ps * 0.11, ps * 0.05); ctx.fill();
  ctx.restore();
}
function promoBadge(ctx: Ctx, p: Product, x: number, y: number, w: number, h: number) {
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rad(-2));
  const bw = h * 0.045;
  ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = h * 0.08; ctx.shadowOffsetY = h * 0.04;
  ctx.fillStyle = C.red; rrect(ctx, -w / 2 - bw * 1.6, -h / 2 - bw * 1.6, w + bw * 3.2, h + bw * 3.2, h * 0.16); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#fff'; rrect(ctx, -w / 2 - bw, -h / 2 - bw, w + bw * 2, h + bw * 2, h * 0.14); ctx.fill();
  ctx.fillStyle = C.red; rrect(ctx, -w / 2, -h / 2, w, h, h * 0.12); ctx.fill();
  const ls = fit(ctx, 'PREȚ PROMOȚIONAL', (s) => F(900, s), w * 0.86, h * 0.15);
  text(ctx, 'PREȚ PROMOȚIONAL', 0, -h / 2 + h * 0.07 + ls * 0.76, { font: F(900, ls), align: 'center', color: C.yellow });
  const price = DF.fmtPrice(p.newPrice);
  const ps = fit(ctx, price, (s) => F(900, s), w * 0.84, h * 0.62);
  const us = h * 0.12;
  const py = -h / 2 + h * 0.07 + ls * 0.95 + (h * 0.86 - ls * 0.95 - us * 1.1) / 2 + ps * 0.36;
  text(ctx, price, 0, py, { font: F(900, ps), align: 'center', color: '#fff', shadow: { color: C.redDark, dx: ps * 0.03, dy: ps * 0.04 } });
  text(ctx, 'LEI/BUC', 0, h / 2 - h * 0.07, { font: F(900, us), align: 'center', color: '#fff' });
  ctx.restore();
}
function sgrPill(ctx: Ctx, cx: number, y: number, maxW: number, h: number) {
  const s = fit(ctx, 'Prețul nu include SGR', (z) => FB(700, z), maxW - h, h * 0.6);
  ctx.font = FB(700, s); const w = ctx.measureText('Prețul nu include SGR').width + h * 0.9;
  ctx.fillStyle = C.sgr; rrect(ctx, cx - w / 2, y, w, h, h / 2); ctx.fill();
  text(ctx, 'Prețul nu include SGR', cx, y + h / 2 + s * 0.35, { font: FB(700, s), align: 'center', color: '#fff' });
}
function ribbon(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rad(-1));
  ctx.fillStyle = C.yellowDeep; rrect(ctx, -w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 8); ctx.fill();
  ctx.fillStyle = C.red; rrect(ctx, -w / 2, -h / 2, w, h, 6); ctx.fill();
  const t = 'ÎN LIMITA STOCULUI DISPONIBIL';
  const s = fit(ctx, t, (z) => F(900, z, true), w * 0.9, h * 0.62);
  text(ctx, t, 0, s * 0.36, { font: F(900, s, true), align: 'center', color: '#fff' });
  ctx.restore();
}

export function bell(ctx: Ctx, cx: number, cy: number, r: number) { // zurgălău auriu
  ctx.save(); ctx.translate(cx, cy);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r); g.addColorStop(0, '#FFF3B0'); g.addColorStop(0.5, '#F2C230'); g.addColorStop(1, '#A87400');
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = r * 0.3; ctx.shadowOffsetY = r * 0.15;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#7A5200'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(-r * 0.85, -r * 0.05); ctx.lineTo(r * 0.85, -r * 0.05); ctx.stroke();
  ctx.fillStyle = '#5A3C00'; ctx.beginPath(); ctx.arc(0, r * 0.38, r * 0.17, 0, 7); ctx.fill(); ctx.fillRect(-r * 0.05, r * 0.38, r * 0.1, r * 0.45);
  ctx.beginPath(); ctx.arc(0, -r * 1.05, r * 0.2, 0, 7); ctx.strokeStyle = '#A87400'; ctx.lineWidth = r * 0.1; ctx.stroke();
  ctx.restore();
}
function bells(ctx: Ctx, cx: number, top: number, r: number) { // doi zurgălăi legați cu fundă
  ctx.save(); ctx.strokeStyle = '#0B6B36'; ctx.lineWidth = r * 0.22;
  ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx - r * 0.9, top + r * 1.3); ctx.moveTo(cx, top); ctx.lineTo(cx + r * 0.9, top + r * 1.5); ctx.stroke(); ctx.restore();
  bell(ctx, cx - r * 0.95, top + r * 2.1, r); bell(ctx, cx + r * 0.95, top + r * 2.3, r);
  ctx.save(); ctx.fillStyle = C.red; ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.08;
  [-1, 1].forEach((sd) => { ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx + sd * r * 0.9, top - r * 0.5); ctx.lineTo(cx + sd * r * 0.9, top + r * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke(); });
  ctx.beginPath(); ctx.arc(cx, top, r * 0.25, 0, 7); ctx.fill(); ctx.restore();
}
function cardBg(ctx: Ctx, x: number, y: number, w: number, h: number, hero: boolean) {
  ctx.save();
  if (THEME.key === 'craciun') {
    ctx.fillStyle = '#4A0008'; rrect(ctx, x, y + 7, w, h, 22); ctx.fill();
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#E0142B'); g.addColorStop(1, '#9A0014');
    ctx.fillStyle = g; ctx.strokeStyle = C.yellowDeep; ctx.lineWidth = 4; rrect(ctx, x, y, w, h, 22); ctx.fill(); ctx.stroke();
    ctx.save(); rrect(ctx, x, y, w, h, 22); ctx.clip();
    let seed = Math.round(x * 3 + y); const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 18; i++) snowflake(ctx, x + rnd() * w, y + rnd() * h, Math.min(w, h) * (0.02 + rnd() * 0.035), '#fff', 0.55);
    for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(x + rnd() * w, y + rnd() * h, 1.5 + rnd() * 2.5, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); }
    ctx.restore();
  } else if (THEME.key === 'paste') {
    ctx.fillStyle = hero ? C.redDark : '#0E5A1E'; rrect(ctx, x, y + 7, w, h, 22); ctx.fill();
    const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#FFFDE8'); g.addColorStop(0.55, '#F2FBC9'); g.addColorStop(1, '#D9F3A0');
    ctx.fillStyle = g; ctx.strokeStyle = hero ? C.red : '#0E5A1E'; ctx.lineWidth = 3; rrect(ctx, x, y, w, h, 22); ctx.fill(); ctx.stroke();
    ctx.save(); rrect(ctx, x, y, w, h, 22); ctx.clip();
    let seed = Math.round(x * 3 + y); const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 10; i++) { // flori mici de primăvară
      const fx = x + rnd() * w, fy = y + rnd() * h, fr = Math.min(w, h) * 0.018;
      ctx.fillStyle = 'rgba(255,196,0,.35)'; for (let k = 0; k < 5; k++) { const a = k * 1.2566; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr, fr * 0.8, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  } else {
    ctx.fillStyle = hero ? C.redDark : '#111'; rrect(ctx, x, y + 7, w, h, 22); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.97)'; ctx.strokeStyle = hero ? C.red : '#111'; ctx.lineWidth = 3;
    rrect(ctx, x, y, w, h, 22); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
function xmasPanel(ctx: Ctx, x: number, y: number, w: number, h: number, pad: number) { // panou crem pentru contrast + zurgălăi
  const rh = w / h > 1.7 ? clamp(h * 0.1, 20, 60) : clamp(Math.min(h * 0.085, w * 0.11), 20, 58);
  ctx.save(); ctx.fillStyle = 'rgba(255,252,244,.96)'; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 8;
  rrect(ctx, x + pad * 0.5, y + pad * 0.5, w - pad, h - pad * 1.5 - rh, 16); ctx.fill(); ctx.restore();
  const r = clamp(Math.min(w, h) * 0.05, 11, 30);
  bells(ctx, x + w - pad * 0.4 - r * 2, y + r * 0.7, r);
}
function cell(ctx: Ctx, p: Product, r: Rect, img: HTMLImageElement | null | undefined, hero: boolean) {
  const { x, y, w, h } = r;
  cardBg(ctx, x, y, w, h, hero);
  const pad = clamp(Math.min(w, h) * 0.045, 8, 26) * (THEME.key === 'craciun' ? 1.35 : 1);
  if (THEME.key === 'craciun') xmasPanel(ctx, x, y, w, h, pad);
  const rh = w / h > 1.7 ? clamp(h * 0.1, 20, 60) : clamp(Math.min(h * 0.085, w * 0.11), 20, 58);
  ribbon(ctx, x + pad * 0.6, y + h - rh - pad * 0.7, w - pad * 1.2, rh);
  const I = { x: x + pad, y: y + pad, w: w - pad * 2, h: h - pad * 2 - rh - pad * 0.4 };
  const pct = DF.discountPct(p.oldPrice, p.newPrice);
  const name = (p.name || '').toUpperCase();
  const ratio = I.w / I.h;
  const hasOld = +p.oldPrice > 0;

  if (ratio < 0.85) { // înalt: nume sus, poza + preț vechi, preț mare jos
    let cy = I.y;
    const ns = fit(ctx, name, (s) => F(900, s), I.w, I.h * 0.095);
    text(ctx, name, x + w / 2, cy + ns * 0.74, { font: F(900, ns), align: 'center' }); cy += ns * 0.98;
    const ss = fit(ctx, p.size || '', (s) => F(800, s), I.w, I.h * 0.06);
    text(ctx, p.size || '', x + w / 2, cy + ss * 0.76, { font: F(800, ss), align: 'center' }); cy += ss * 0.95 + I.h * 0.015;
    const H = I.y + I.h - cy;
    const sgrH = p.sgr ? clamp(H * 0.07, 14, 46) : 0;
    const promoH = H * 0.31;
    const midH = H - promoH - sgrH - H * 0.07;
    const iw = I.w * 0.54;
    drawImage(ctx, img, I.x, cy, iw, midH);
    const rx = I.x + iw + I.w * 0.04, rw = I.w - iw - I.w * 0.04;
    const sr = Math.min(rw * 0.36, midH * 0.2);
    discSticker(ctx, rx + rw / 2, cy + midH * 0.08 + sr, sr, pct);
    if (hasOld) { const oh = Math.min(midH * 0.36, rw * 0.62); oldBox(ctx, p, rx, cy + midH - oh, rw, oh); }
    const py = cy + midH + H * 0.045;
    promoBadge(ctx, p, I.x + I.w * 0.05, py, I.w * 0.9, promoH);
    if (sgrH) sgrPill(ctx, x + w / 2, py + promoH + H * 0.025, I.w, sgrH);
  } else if (ratio > 1.7) { // lat: poză | nume + preț vechi | preț mare
    const iw = I.w * 0.25;
    drawImage(ctx, img, I.x, I.y, iw, I.h);
    discSticker(ctx, I.x + iw * 0.2, I.y + I.h * 0.8, Math.min(iw * 0.3, I.h * 0.17), pct);
    const g = I.w * 0.03;
    const mx = I.x + iw + g, mw = I.w * 0.35;
    const ns = fit(ctx, name, (s) => F(900, s), mw, I.h * 0.22);
    const ss = fit(ctx, p.size || '', (s) => F(800, s), mw, I.h * 0.15);
    const oh = hasOld ? Math.min(I.h * 0.33, mw * 0.5) : 0, ow = Math.min(mw, oh * 2.1);
    const sgrH = p.sgr ? clamp(I.h * 0.11, 14, 44) : 0;
    const stackH = ns * 0.98 + ss * 1.0 + (oh ? I.h * 0.05 + oh : 0) + (sgrH ? I.h * 0.06 + sgrH : 0);
    let cy = I.y + (I.h - stackH) / 2;
    text(ctx, name, mx, cy + ns * 0.74, { font: F(900, ns) }); cy += ns * 0.98;
    text(ctx, p.size || '', mx, cy + ss * 0.76, { font: F(800, ss) }); cy += ss;
    if (oh) { cy += I.h * 0.05; oldBox(ctx, p, mx, cy, ow, oh); cy += oh; }
    if (sgrH) { cy += I.h * 0.06; ctx.font = FB(700, sgrH * 0.6); const sw = ctx.measureText('Prețul nu include SGR').width + sgrH * 0.9; sgrPill(ctx, mx + Math.min(sw, mw) / 2, cy, mw, sgrH); }
    const px = mx + mw + g, pw = I.x + I.w - px - I.w * 0.01;
    const ph = Math.min(I.h * 0.84, pw * 0.72);
    promoBadge(ctx, p, px + pw * 0.02, I.y + (I.h - ph) / 2, pw * 0.96, ph);
  } else { // rând: poză în stânga, informații în dreapta
    const iw = I.w * 0.4;
    drawImage(ctx, img, I.x, I.y, iw, I.h);
    discSticker(ctx, I.x + iw * 0.2, I.y + I.h * 0.82, Math.min(iw * 0.28, I.h * 0.14), pct);
    const ix = I.x + iw + I.w * 0.03, iwd = I.x + I.w - ix;
    const ns = fit(ctx, name, (s) => F(900, s), iwd, I.h * 0.13);
    const ss = fit(ctx, p.size || '', (s) => F(800, s), iwd, I.h * 0.085);
    const oh = hasOld ? Math.min(I.h * 0.2, iwd * 0.45) : 0;
    const ph = I.h * 0.34;
    const sgrH = p.sgr ? clamp(I.h * 0.065, 14, 42) : 0;
    const used = ns * 0.98 + ss + oh + ph + sgrH;
    const gap = (I.h - used) / 4;
    let cy = I.y + gap * 0.5;
    text(ctx, name, ix, cy + ns * 0.74, { font: F(900, ns) }); cy += ns * 0.98;
    text(ctx, p.size || '', ix, cy + ss * 0.76, { font: F(800, ss) }); cy += ss + gap * 0.7;
    if (oh) { oldBox(ctx, p, ix, cy, Math.min(iwd, oh * 2.2), oh); cy += oh + gap * 1.1; }
    promoBadge(ctx, p, ix + iwd * 0.04, cy, iwd * 0.92, ph); cy += ph + gap * 1.0;
    if (sgrH) sgrPill(ctx, ix + iwd / 2, cy, iwd, sgrH);
  }
}

function footer(ctx: Ctx, W: number, y: number, h: number, data: OfferData) {
  ctx.fillStyle = C.red; ctx.fillRect(0, y, W, h);
  ctx.fillStyle = C.yellowDeep; ctx.fillRect(0, y, W, Math.max(4, h * 0.06));
  const host = (data.store.publicUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const t1 = data.store.address, t2 = host ? 'Toate ofertele pe telefon: ' + host : '';
  const s = fit(ctx, t1 + '   •   ' + t2, (z) => F(800, z), W * 0.92, h * 0.46);
  text(ctx, t1 + (t2 ? '   •   ' + t2 : ''), W / 2, y + h / 2 + s * 0.38, { font: F(800, s), align: 'center', color: '#fff' });
}

function gridRects(area: Rect, n: number, cols: number, gap: number): Rect[] {
  const rows = Math.ceil(n / cols);
  const cw = (area.w - gap * (cols - 1)) / cols, ch = (area.h - gap * (rows - 1)) / rows;
  const out: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols), c = i % cols;
    const off = (cols - inRow) * (cw + gap) / 2; // ultimul rând incomplet: centrat
    out.push({ x: area.x + off + c * (cw + gap), y: area.y + r * (ch + gap), w: cw, h: ch });
  }
  return out;
}

/* ---------- randare completă ---------- */
export async function render(data: OfferData, fmtKey: RenderFormatKey): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const fmt = FORMATS[fmtKey];
  const W = fmt.w;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = fmt.h;
  const ctx = canvas.getContext('2d') as Ctx;
  THEME = getTheme(data.offer?.theme); C = THEME.pal;
  // tema de sărbătoare: bandă sus, restul compoziției se mută dedesubt
  const BH = THEME.banner ? (fmtKey === 'story' ? 200 : fmtKey === 'portrait' ? 104 : 92) : 0;
  if (BH) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, fmt.h); holidayBand(ctx, W, BH); ctx.translate(0, BH); ctx.beginPath(); ctx.rect(0, 0, W, fmt.h - BH); ctx.clip(); }
  const H = fmt.h - BH;
  const offer = DF.resolveOffer(data);
  const list = DF.activeProducts(data);
  const hero = DF.heroOf(list);
  let others = list.filter((p) => p !== hero);
  const MAX = 8; const hidden = Math.max(0, others.length - MAX); others = others.slice(0, MAX);
  const imgs = new Map<Product, HTMLImageElement | null>(await Promise.all(list.map(async (p) => [p, await loadImage(p.image)] as const)));
  const M = 24, G = 16;

  if (!hero) {
    background(ctx, W, H, W / 2, H / 2);
    const b = logo(ctx, W / 2, H * 0.2, W * 0.6);
    title(ctx, W / 2, b + 20, W * 0.7, offer, 1.3);
    text(ctx, 'Ofertele noi apar în curând', W / 2, H * 0.75, { font: F(900, 70), align: 'center' });
    return canvas;
  }

  if (fmtKey === 'square' && others.length >= 1 && others.length <= 4) {
    // exact compoziția pliantului lor: vedeta la mijloc, câte două produse pe laterale
    const colW = 318, cw = W - 2 * M - 2 * colW - 2 * 14;
    const lx = M, mx = M + colW + 14, rx = mx + cw + 14;
    const footH = 46, bottom = H - footH - 16;
    background(ctx, W, H, W / 2, H * 0.55);
    const lb = logo(ctx, W / 2, 20, cw + 20);
    const tb = title(ctx, W / 2, lb + 4, cw + 10, offer, 0.8);
    const sideH = (bottom - M - 14) / 2;
    const left = others.slice(0, 2), right = others.slice(2, 4);
    ([[left, lx], [right, rx]] as const).forEach(([arr, cx]) => arr.forEach((p, i) => cell(ctx, p, { x: cx, y: M + i * (sideH + 14), w: colW, h: sideH }, imgs.get(p), false)));
    cell(ctx, hero, { x: mx, y: tb + 6, w: cw, h: bottom - tb - 6 }, imgs.get(hero), true);
    footer(ctx, W, H - footH, footH, data);
    return canvas;
  }

  // portret / story / square cu >4 laterale: antet sus, vedeta pe un rând, restul în grilă
  const story = fmtKey === 'story', square = fmtKey === 'square';
  const topSafe = story ? (BH ? 30 : 150) : 22;
  const footH = story ? 0 : (fmtKey === 'portrait' ? 62 : 46);
  const storyFootH = story ? 230 : 0;
  let tb: number;
  if (square) { // antet compact pe un rând: logo stânga, titlu dreapta
    background(ctx, W, H, W / 2, H * 0.5);
    const lb = logo(ctx, 270, 26, 440);
    tb = Math.max(lb, title(ctx, 790, 18, 480, offer, 0.72));
  } else {
    background(ctx, W, H, W / 2, story ? 760 : H * 0.42);
    const lb = logo(ctx, W / 2, topSafe, story ? 640 : 520);
    tb = title(ctx, W / 2, lb + 2, story ? 760 : 640, offer, story ? 1.25 : 1);
  }
  const areaTop = tb + 8, areaBottom = H - footH - storyFootH - (story ? 30 : 18);
  const areaH = areaBottom - areaTop;
  const heroH = others.length ? areaH * (others.length > 4 ? 0.34 : (story ? 0.42 : 0.4)) : areaH;
  cell(ctx, hero, { x: M, y: areaTop, w: W - 2 * M, h: heroH }, imgs.get(hero), true);
  if (others.length) {
    const cols = others.length > 6 ? 4 : others.length > 4 ? 3 : (others.length === 1 ? 1 : 2);
    const area = { x: M, y: areaTop + heroH + G + 6, w: W - 2 * M, h: areaBottom - (areaTop + heroH + G + 6) - (hidden ? 50 : 0) };
    gridRects(area, others.length, cols, G).forEach((r, i) => cell(ctx, others[i], r, imgs.get(others[i]), false));
    if (hidden) text(ctx, `+ încă ${hidden} ${hidden === 1 ? 'ofertă' : 'oferte'} în pliantul online`, W / 2, areaBottom - 8, { font: F(900, 40), align: 'center', color: C.red });
  }
  if (story) {
    const y = H - storyFootH - 10, host = (data.store.publicUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    ctx.fillStyle = C.red; ctx.fillRect(0, y, W, H - y); ctx.fillStyle = C.yellowDeep; ctx.fillRect(0, y, W, 8);
    text(ctx, 'Toate ofertele, pe telefon:', W / 2, y + 66, { font: F(800, 46), align: 'center', color: '#fff' });
    const hs = fit(ctx, host, (z) => F(900, z), W * 0.86, 76);
    text(ctx, host, W / 2, y + 66 + hs * 1.0, { font: F(900, hs), align: 'center', color: C.yellow });
    text(ctx, data.store.address, W / 2, y + 66 + hs + 54, { font: F(800, 36), align: 'center', color: '#fff' });
  } else footer(ctx, W, H - footH, footH, data);
  return canvas;
}

export function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> { return new Promise((res) => canvas.toBlob(res, 'image/png')); }
