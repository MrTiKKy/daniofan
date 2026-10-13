/* Daniofan MVP — date, calcule și statistici comune (pliant + panou angajați).
   Port 1:1 din js/store.js al prototipului static. Rulează doar în browser. */
import { loadDefaultOffer } from '@/data/offer';
import type { Countdown, LocalStats, OfferData, Product, ProductStatus, ResolvedOffer } from './types';

export const DATA_KEY = 'daniofan.data.v1';
export const STATS_KEY = 'daniofan.stats.v1';
const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const MONTHS_SHORT = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sept.', 'oct.', 'nov.', 'dec.'];
const DAYS = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];

export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

/** "YYYY-MM-DD" -> Date local, 00:00 */
export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function endOfDay(d: Date) { const e = new Date(d); e.setHours(23, 59, 59, 999); return e; }
function startOfDay(d: Date) { const e = new Date(d); e.setHours(0, 0, 0, 0); return e; }

/* Pentru demo: oferta rulează mereu în weekendul curent (vineri–duminică),
   ca prototipul să fie „live" în ziua întâlnirii. */
function autoWeekend(now?: Date) {
  const today = startOfDay(now || new Date());
  const dow = today.getDay();
  const end = new Date(today); end.setDate(today.getDate() + ((7 - dow) % 7)); // duminica următoare (sau azi)
  let start = new Date(end); start.setDate(end.getDate() - 2); // vineri
  if (start > today) start = today;
  return { start, end };
}

export function resolveOffer(data: OfferData, now?: Date): ResolvedOffer {
  const o = data.offer || ({} as OfferData['offer']);
  let start: Date, end: Date;
  if (o.autoDates) ({ start, end } = autoWeekend(now));
  else { start = parseDate(o.start) || new Date(); end = parseDate(o.end) || start; }
  return { title: o.title || 'Oferta săptămânii', start: startOfDay(start), end: endOfDay(end), autoDates: !!o.autoDates };
}

export function discountPct(oldP: number | string, newP: number | string): number {
  const o = +oldP, n = +newP;
  if (!(o > 0) || !(n > 0) || n >= o) return 0;
  return Math.round((1 - n / o) * 100);
}
/** Același format ca pe pliantul lor (punct zecimal: 2.99) */
export const fmtPrice = (n: number | string): string => (Math.round((+n || 0) * 100) / 100).toFixed(2);

export function productStatus(p: Product, offer: ResolvedOffer | null, now?: Date): ProductStatus {
  now = now || new Date();
  if (!p.name || !(+p.newPrice > 0)) return 'incomplet';
  if (+p.oldPrice > 0 && +p.newPrice >= +p.oldPrice) return 'pret';
  const vu = parseDate(p.validUntil);
  if (vu && endOfDay(vu) < now) return 'expirat';
  if (offer && offer.end < now) return 'expirat';
  return 'activ';
}
export function activeProducts(data: OfferData, now?: Date): Product[] {
  const offer = resolveOffer(data, now);
  return (data.products || []).filter((p) => productStatus(p, offer, now) === 'activ');
}
export function heroOf(list: Product[]): Product | null {
  if (!list.length) return null;
  return list.find((p) => p.hero) || list.slice().sort((a, b) => discountPct(b.oldPrice, b.newPrice) - discountPct(a.oldPrice, a.newPrice))[0];
}

/** "25–27 septembrie" */
export function fmtRange(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return (start.getDate() === end.getDate() ? '' : start.getDate() + '–') + end.getDate() + ' ' + MONTHS[end.getMonth()];
  }
  return start.getDate() + ' ' + MONTHS_SHORT[start.getMonth()] + ' – ' + end.getDate() + ' ' + MONTHS_SHORT[end.getMonth()];
}
export function fmtDayLong(d: Date): string { return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }

export function countdown(offer: ResolvedOffer, now?: Date): Countdown {
  now = now || new Date();
  const plural = (n: number, one: string, many: string) => n === 1 ? '1 ' + one : n + (n >= 20 || n === 0 ? ' de ' : ' ') + many;
  if (now > offer.end) return { state: 'ended', main: 'Oferta s-a încheiat', sub: 'Ofertele noi apar în curând' };
  const target = now < offer.start ? offer.start : offer.end;
  const ms = target.getTime() - now.getTime();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  let lead: string;
  if (days >= 1) lead = plural(days, 'zi', 'zile');
  else if (hours >= 1) lead = plural(hours, 'oră', 'ore');
  else lead = plural(Math.max(mins, 1), 'minut', 'minute');
  const p2 = (n: number) => String(n).padStart(2, '0');
  const detail = days >= 1 ? 'și ' + p2(hours) + ' h ' + p2(mins) + ' min' : (hours >= 1 ? 'și ' + p2(mins) + ' min' : '');
  if (now < offer.start) return { state: 'soon', prefix: 'Oferta începe în', lead, detail, sub: 'Începe ' + fmtDayLong(offer.start) };
  const lastDay = days === 0 && offer.end.getDate() === now.getDate();
  return { state: lastDay ? 'last' : 'live', prefix: lastDay ? 'Ultima zi! Se termină în' : 'Oferta se termină în', lead, detail, sub: 'Valabilă până ' + fmtDayLong(offer.end) };
}

/* ---------- date: implicit + modificările angajatului din localStorage ---------- */
export async function load(): Promise<OfferData> {
  const def = await loadDefaultOffer();
  let saved: OfferData | null = null;
  try { saved = JSON.parse(localStorage.getItem(DATA_KEY) || 'null'); } catch { saved = null; }
  const data = saved && saved.products ? saved : def;
  data.store = Object.assign({}, def.store, data.store || {});
  return data;
}
export function save(data: OfferData): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}
export function reset(): void { localStorage.removeItem(DATA_KEY); }
export const hasCustom = (): boolean => !!localStorage.getItem(DATA_KEY);

/* ---------- statistici locale (click-uri reale în acest browser) ---------- */
const emptyStats = (): LocalStats => ({ views: {}, shares: {}, calls: 0, directions: 0, visits: 0 });
export function getStats(): LocalStats {
  try { return Object.assign(emptyStats(), JSON.parse(localStorage.getItem(STATS_KEY) || '{}')); }
  catch { return emptyStats(); }
}
export type TrackKind = 'view' | 'share' | 'calls' | 'directions' | 'visits';
export function track(kind: TrackKind, id?: string): void {
  const s = getStats();
  if (kind === 'view' || kind === 'share') {
    const k = kind === 'view' ? 'views' : 'shares';
    const key = id || '';
    s[k][key] = (s[k][key] || 0) + 1;
  } else s[kind] = (s[kind] || 0) + 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}
export const resetStats = (): void => localStorage.removeItem(STATS_KEY);

/** URL-ul de distribuit: local -> adresa publică planificată (demo); publicat -> adresa reală a site-ului */
export function shareBaseUrl(data: OfferData): string {
  const local = location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);
  if (local) return (data.store.publicUrl || '').replace(/\/$/, '') + '/';
  return location.origin + location.pathname.replace(/\/admin\/?$/, '/').replace(/index\.html$/, '');
}

/** Căile relative din date (img/products/x.png) devin absolute (/img/products/x.png). */
export function assetUrl(src: string): string {
  if (!src) return src;
  if (/^(data:|blob:|https?:|\/)/i.test(src)) return src;
  return '/' + src;
}

/* Panoul și generatorul de imagini folosesc aceleași variante WebP ale pozelor demo
   ca prototipul static (data/images-embedded.js), ca imaginile generate să fie identice. */
const DEMO_IMAGE_VARIANTS: Record<string, string> = {
  'img/products/ciucas.png': '/img/products/webp/ciucas.webp',
  'img/products/timisoreana-doza.png': '/img/products/webp/timisoreana-doza.webp',
  'img/products/timisoreana-25l.png': '/img/products/webp/timisoreana-25l.webp',
  'img/products/heineken.png': '/img/products/webp/heineken.webp',
  'img/products/ursus.png': '/img/products/webp/ursus.webp',
};
export const imageSrc = (src: string): string => DEMO_IMAGE_VARIANTS[src] || assetUrl(src);

/** "Ofertă de WEEK-END" -> ["Ofertă de", "WEEK-END"] */
export function splitTitle(title: string): [string, string] {
  const m = /^(.*?\bde)\s+(.+)$/i.exec((title || '').trim());
  return m ? [m[1], m[2]] : ['', (title || '').trim()];
}
