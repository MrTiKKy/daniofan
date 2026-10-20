/* Calcule de preț pentru catalog (independent de OfferData). */
import type { CatalogProduct, PageItem } from './catalogTypes';

export function discountPct(normal: number, promo: number): number {
  if (!(normal > 0) || !(promo > 0) || promo >= normal) return 0;
  return Math.round((1 - promo / normal) * 100);
}

export const fmtPrice = (n: number | string): string =>
  (Math.round((+n || 0) * 100) / 100).toFixed(2);

export const fmtPriceRo = (n: number | string): string => fmtPrice(n).replace('.', ',');

export function autoLabel(normal: number, promo: number | undefined): string | undefined {
  if (promo == null || !(promo > 0)) return undefined;
  const d = discountPct(normal, promo);
  return d > 0 ? `-${d}%` : undefined;
}

export function displayLabel(item: PageItem, product: CatalogProduct | undefined): string | null {
  const custom = (item.label || '').trim();
  if (custom) return custom;
  if (!product || item.promoPrice == null) return null;
  return autoLabel(product.normalPrice, item.promoPrice) || null;
}

export function unitPriceLine(product: CatalogProduct, promoPrice: number): string | null {
  if (!(promoPrice > 0)) return null;
  let qty = +product.unitQty;
  let kind = (product.unit || '').trim().toLowerCase();
  if (!(qty > 0) || !kind) {
    const m = /(\d+[.,]?\d*)\s*(kg|g|l|ml)\b/i.exec(product.details || '');
    if (!m) return null;
    qty = parseFloat(m[1].replace(',', '.'));
    const u = m[2].toLowerCase();
    if (u === 'g') { qty /= 1000; kind = 'kg'; }
    else if (u === 'ml') { qty /= 1000; kind = 'l'; }
    else kind = u;
  }
  if (!(qty > 0) || !kind) return null;
  const per = promoPrice / qty;
  if (!(per > 0) || !Number.isFinite(per)) return null;
  return `1 ${kind} = ${fmtPriceRo(per)} lei`;
}

export function suggestSizeFromImage(w: number, h: number): { w: number; h: number; preset: string } {
  if (!(w > 0) || !(h > 0)) return { w: 2, h: 2, preset: 'lat' };
  const ratio = w / h;
  if (ratio < 0.72) return { w: 1, h: 3, preset: 'inalt' };
  if (ratio > 1.6) return { w: 4, h: 2, preset: 'panoramic' };
  if (ratio > 1.15) return { w: 2, h: 2, preset: 'lat' };
  return { w: 2, h: 3, preset: 'mare' };
}
