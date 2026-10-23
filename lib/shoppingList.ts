/* Listă de cumpărături — logică pură (fără React / localStorage). */
import type { MagazineKind } from './catalogTypes';
import { magazineKindLabel } from './catalogTypes';

export const SHOPPING_LIST_KEY = 'daniofan_list_v1';
export const MAX_QTY = 99;

export interface ShoppingListItem {
  slotId: string;
  productId: string;
  magazineType: MagazineKind;
  name: string;
  brand: string;
  size: string;
  image: string;
  promoPrice: number;
  oldPrice: number;
  qty: number;
  addedAt: number;
  validUntil: string;
}

/** Date copiate la adăugare (fără qty / addedAt). */
export type ShoppingListDraft = Omit<ShoppingListItem, 'qty' | 'addedAt'>;

export function emptyList(): ShoppingListItem[] {
  return [];
}

export function hasSlot(list: ShoppingListItem[], slotId: string): boolean {
  return list.some((it) => it.slotId === slotId);
}

export function getQty(list: ShoppingListItem[], slotId: string): number {
  const hit = list.find((it) => it.slotId === slotId);
  return hit && hit.qty > 0 ? hit.qty : 0;
}

export function countQty(list: ShoppingListItem[]): number {
  return list.reduce((sum, it) => sum + (it.qty > 0 ? it.qty : 0), 0);
}

/** +1 (max 99). Dacă nu există, adaugă cu qty 1. */
export function incrementItem(
  list: ShoppingListItem[],
  draft: ShoppingListDraft,
  now = Date.now(),
): { list: ShoppingListItem[]; qty: number; added: boolean } {
  const cur = getQty(list, draft.slotId);
  if (cur <= 0) {
    const next: ShoppingListItem = { ...draft, qty: 1, addedAt: now };
    return { list: [...list, next], qty: 1, added: true };
  }
  if (cur >= MAX_QTY) {
    return { list, qty: MAX_QTY, added: false };
  }
  const qty = cur + 1;
  return { list: setQty(list, draft.slotId, qty), qty, added: false };
}

/**
 * −1. La 1 → scoate (returnează removed).
 * Returnează qty 0 când a fost scos.
 */
export function decrementItem(
  list: ShoppingListItem[],
  slotId: string,
): { list: ShoppingListItem[]; qty: number; removed: ShoppingListItem | null } {
  const hit = list.find((it) => it.slotId === slotId) || null;
  if (!hit) return { list, qty: 0, removed: null };
  if (hit.qty <= 1) {
    return { list: removeBySlotId(list, slotId), qty: 0, removed: hit };
  }
  const qty = hit.qty - 1;
  return { list: setQty(list, slotId, qty), qty, removed: null };
}

/** Preț vechi efectiv: dacă lipsește, = promo (economie 0). */
export function effectiveOldPrice(item: ShoppingListItem): number {
  const old = Number(item.oldPrice) || 0;
  const promo = Number(item.promoPrice) || 0;
  return old > 0 ? old : promo;
}

/** validUntil < azi → expirată (ziua validUntil încă e activă). */
export function isOfferExpired(item: ShoppingListItem, now: Date): boolean {
  const raw = (item.validUntil || '').trim();
  if (!raw) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  const endDay = m
    ? new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0)
    : (() => {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return d;
    })();
  if (!endDay) return false;
  const today = new Date(now.getTime());
  today.setHours(0, 0, 0, 0);
  return endDay.getTime() < today.getTime();
}

/**
 * Doar ofertele active (și qty > 0).
 * Fără `now` → nu filtrează expirarea (util la SSR / listă goală).
 */
export function activeItems(
  list: ShoppingListItem[],
  now?: Date,
): ShoppingListItem[] {
  return list.filter((it) => {
    if (!(it.qty > 0)) return false;
    if (!now) return true;
    return !isOfferExpired(it, now);
  });
}

/** Cele mai recente adăugate sus. */
export function sortedByRecent(list: ShoppingListItem[]): ShoppingListItem[] {
  return [...list].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

export function totalPromo(list: ShoppingListItem[], now?: Date): number {
  return round2(
    activeItems(list, now).reduce(
      (sum, it) => sum + it.promoPrice * Math.max(0, it.qty),
      0,
    ),
  );
}

export function totalOld(list: ShoppingListItem[], now?: Date): number {
  return round2(
    activeItems(list, now).reduce(
      (sum, it) => sum + effectiveOldPrice(it) * Math.max(0, it.qty),
      0,
    ),
  );
}

export function savings(list: ShoppingListItem[], now?: Date): number {
  return round2(Math.max(0, totalOld(list, now) - totalPromo(list, now)));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Formatează 24.5 → „24,50”. */
export function fmtLei(amount: number): string {
  const v = round2(amount);
  const [lei, ban = '00'] = v.toFixed(2).split('.');
  return `${lei},${ban}`;
}

/** Alias cerut de Faza 4. */
export const formatLei = fmtLei;

export function removeBySlotId(
  list: ShoppingListItem[],
  slotId: string,
): ShoppingListItem[] {
  return list.filter((it) => it.slotId !== slotId);
}

export const remove = removeBySlotId;

/** Cantitate 1–99; ≤0 scoate produsul. */
export function setQty(
  list: ShoppingListItem[],
  slotId: string,
  qty: number,
): ShoppingListItem[] {
  const q = Math.floor(Number(qty));
  if (!Number.isFinite(q) || q <= 0) return removeBySlotId(list, slotId);
  const nextQty = Math.min(MAX_QTY, q);
  let found = false;
  const next = list.map((it) => {
    if (it.slotId !== slotId) return it;
    found = true;
    return { ...it, qty: nextQty };
  });
  return found ? next : list;
}

/** Readuce un produs scos (ex. Anulează). */
export function restore(
  list: ShoppingListItem[],
  item: ShoppingListItem,
): ShoppingListItem[] {
  const qty = Math.min(MAX_QTY, Math.max(1, Math.floor(item.qty) || 1));
  const restored: ShoppingListItem = { ...item, qty };
  if (hasSlot(list, item.slotId)) {
    return list.map((it) => (it.slotId === item.slotId ? restored : it));
  }
  return [...list, restored];
}

export function clear(): ShoppingListItem[] {
  return emptyList();
}

/**
 * Toggle pe slot: dacă există → scoate; altfel adaugă cu qty 1.
 * Returnează lista nouă + dacă a fost adăugare (pentru animația de zbor).
 */
export function toggleItem(
  list: ShoppingListItem[],
  draft: ShoppingListDraft,
  now = Date.now(),
): { list: ShoppingListItem[]; added: boolean } {
  if (hasSlot(list, draft.slotId)) {
    return { list: removeBySlotId(list, draft.slotId), added: false };
  }
  const next: ShoppingListItem = {
    ...draft,
    qty: 1,
    addedAt: now,
  };
  return { list: [...list, next], added: true };
}

/** Etichetă scurtă pentru rând / WhatsApp. */
export function itemDisplayName(item: ShoppingListItem): string {
  const parts = [item.brand, item.name, item.size]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  if (parts.length) return parts.join(' ');
  return 'Produs';
}

/** Linie WhatsApp: „2 × Ursus 0.33L · 6,30 lei” */
export function itemWhatsAppLine(item: ShoppingListItem): string {
  const name = [item.brand, item.size || item.name]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .join(' ') || item.name || 'Produs';
  const line = round2(item.promoPrice * Math.max(0, item.qty));
  return `${item.qty} × ${name} · ${fmtLei(line)} lei`;
}

export function buildWhatsAppText(
  list: ShoppingListItem[],
  siteUrl: string,
  now?: Date,
): string {
  const rows = sortedByRecent(activeItems(list, now));
  const lines: string[] = ['Lista mea Daniofan:'];
  for (const it of rows) {
    lines.push(itemWhatsAppLine(it));
  }
  lines.push('');
  lines.push(`Total: ${fmtLei(totalPromo(list, now))} lei`);
  lines.push(`Ai economisit: ${fmtLei(savings(list, now))} lei`);
  const url = (siteUrl || '').trim();
  if (url) {
    lines.push('');
    lines.push(url);
  }
  return lines.join('\n');
}

export function magazineBadge(kind: MagazineKind): string {
  return magazineKindLabel(kind);
}

/** Titlu pe bon: „URSUS 0.33L STICLĂ” (majuscule, trunchiat). */
export function receiptItemTitle(item: ShoppingListItem, maxLen = 28): string {
  const raw = [item.brand, item.size, item.name]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .toUpperCase();
  const title = raw || 'PRODUS';
  if (title.length <= maxLen) return title;
  return `${title.slice(0, Math.max(1, maxLen - 1))}…`;
}

/** „2 x 3,15” */
export function receiptQtyUnit(item: ShoppingListItem): string {
  return `${item.qty} x ${fmtLei(item.promoPrice)}`;
}

/** Total linie promo: „6,30” */
export function receiptLineTotal(item: ShoppingListItem): string {
  return fmtLei(round2(item.promoPrice * Math.max(0, item.qty)));
}

/** Economie pe linie (0 dacă nu e reducere). */
export function receiptLineDiscount(item: ShoppingListItem): number {
  const unit = Math.max(0, effectiveOldPrice(item) - (Number(item.promoPrice) || 0));
  return round2(unit * Math.max(0, item.qty));
}

/** „2 x 3,15 ……… 6,30” (fără spacer vizual — testabil). */
export function receiptQtyPriceLine(item: ShoppingListItem): string {
  return `${receiptQtyUnit(item)} … ${receiptLineTotal(item)}`;
}

/** zz.ll.aaaa, HH:MM — Europe/Bucharest. */
export function formatReceiptDateTime(now: Date): string {
  try {
    const fmt = new Intl.DateTimeFormat('ro-RO', {
      timeZone: 'Europe/Bucharest',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
    return `${get('day')}.${get('month')}.${get('year')}, ${get('hour')}:${get('minute')}`;
  } catch {
    const d = now;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

export function serializeList(list: ShoppingListItem[]): string {
  return JSON.stringify(list);
}

export function parseList(raw: string | null | undefined): ShoppingListItem[] {
  if (!raw) return emptyList();
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return emptyList();
    return data
      .map(normalizeItem)
      .filter((it): it is ShoppingListItem => it != null);
  } catch {
    return emptyList();
  }
}

function normalizeItem(raw: unknown): ShoppingListItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const slotId = String(o.slotId || '').trim();
  const productId = String(o.productId || '').trim();
  if (!slotId || !productId) return null;
  const magazineType = o.magazineType === 'special' ? 'special' : 'weekend';
  const qty = Number(o.qty);
  return {
    slotId,
    productId,
    magazineType,
    name: String(o.name || ''),
    brand: String(o.brand || ''),
    size: String(o.size || ''),
    image: String(o.image || ''),
    promoPrice: Number(o.promoPrice) || 0,
    oldPrice: Number(o.oldPrice) || 0,
    qty: Number.isFinite(qty) && qty > 0 ? Math.min(MAX_QTY, Math.floor(qty)) : 1,
    addedAt: Number(o.addedAt) || 0,
    validUntil: String(o.validUntil || ''),
  };
}
