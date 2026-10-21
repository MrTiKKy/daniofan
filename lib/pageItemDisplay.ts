/* Detalii pe casuță (ofertă) — separate de produsul din catalogul Produse. */
import type { BoxPos, ImageLayout, PageItem, PageItemDisplay } from './catalogTypes';
import {
  DEFAULT_IMAGE_LAYOUT,
  DEFAULT_PRICE_POS,
  DEFAULT_PRICE_POS_LEFT,
  DEFAULT_TEXT_POS,
  DEFAULT_TEXT_POS_LEFT,
} from './catalogTypes';
import type { Product } from './types';
import { productBrandTitle } from './store';

export function snapshotDisplay(p: Product): PageItemDisplay {
  const { brand, title } = productBrandTitle(p);
  const images = p.image ? [p.image] : [];
  return {
    brand,
    name: title || p.name || '',
    size: p.size || '',
    variants: p.variants || '',
    specialLabel: p.specialLabel || '',
    oldPrice: +p.oldPrice || 0,
    newPrice: +p.newPrice || 0,
    unitQty: p.unitQty,
    unitKind: p.unitKind,
    images,
    imageLayouts: images.map(() => ({ ...DEFAULT_IMAGE_LAYOUT })),
    overflow: false,
    priceLeft: false,
    textPos: { ...DEFAULT_TEXT_POS },
    pricePos: { ...DEFAULT_PRICE_POS },
  };
}

export function resolveTextPos(d?: PageItemDisplay | null): BoxPos {
  if (d?.textPos) return { scale: 1, ...d.textPos };
  return d?.priceLeft ? { ...DEFAULT_TEXT_POS_LEFT } : { ...DEFAULT_TEXT_POS };
}

export function resolvePricePos(d?: PageItemDisplay | null): BoxPos {
  if (d?.pricePos) return { scale: 1, ...d.pricePos };
  return d?.priceLeft ? { ...DEFAULT_PRICE_POS_LEFT } : { ...DEFAULT_PRICE_POS };
}

/**
 * boxWPct / boxHPct = mărimea vizuală curentă (% din casuță), inclusiv zoom.
 * left/top = colț stânga-sus → clamp 0 … 100−mărime pe toate laturile.
 */
export function clampBoxPos(
  x: number,
  y: number,
  boxWPct: number,
  boxHPct: number,
  scale = 1,
): BoxPos {
  const s = Math.min(2.4, Math.max(0.45, scale));
  const w = Math.max(0.5, Math.min(100, boxWPct));
  const h = Math.max(0.5, Math.min(100, boxHPct));
  const maxX = Math.max(0, 100 - w);
  const maxY = Math.max(0, 100 - h);
  return {
    x: Math.round(Math.min(maxX, Math.max(0, x)) * 10) / 10,
    y: Math.round(Math.min(maxY, Math.max(0, y)) * 10) / 10,
    scale: Math.round(s * 100) / 100,
  };
}

export function normalizeImageLayouts(
  images: string[],
  layouts?: ImageLayout[],
): ImageLayout[] {
  return images.map((_, i) => ({
    ...DEFAULT_IMAGE_LAYOUT,
    ...(layouts?.[i] || {}),
  }));
}

export function layoutLooksOverflow(layout: ImageLayout): boolean {
  return (
    Math.abs(layout.x) > 8
    || Math.abs(layout.y) > 8
    || layout.scale > 1.05
    || Math.abs(layout.rotate || 0) > 4
  );
}

/** Produs „vizual” pentru căsuță = snapshot pe item (sau fallback la produsul sursă). */
export function displayAsProduct(base: Product, item: PageItem): Product {
  const d = item.display;
  if (!d) {
    return {
      ...base,
      newPrice: item.promoPrice != null ? item.promoPrice : base.newPrice,
    };
  }
  return {
    ...base,
    brand: d.brand,
    name: d.name,
    size: d.size,
    variants: d.variants || undefined,
    specialLabel: d.specialLabel || undefined,
    oldPrice: d.oldPrice,
    newPrice: d.newPrice,
    unitQty: d.unitQty,
    unitKind: d.unitKind,
    image: d.images[0] || '',
  };
}

export function displayImages(item: PageItem, base: Product): string[] {
  if (item.display?.images?.length) return item.display.images.slice(0, 2);
  return base.image ? [base.image] : [];
}
