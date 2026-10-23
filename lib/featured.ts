/* Vitrină produse vedetă — pură, testabilă. Citește căsuțele din revistele active. */
import type { Catalog, CatalogPage, MagazineKind, PageItem } from './catalogTypes';
import { discountPct } from './catalogPricing';
import { displayAsProduct } from './pageItemDisplay';
import type { Product } from './types';

export const FEATURED_LIMIT_DEFAULT = 8;
export const FEATURED_LIMIT_MAX = 10;

export interface FeaturedSource {
  kind: MagazineKind;
  label: string;
  catalog: Catalog;
}

export interface FeaturedSlot {
  /** id căsuță (PageItem.id) — folosit în ?produs= */
  slotId: string;
  productId: string;
  kind: MagazineKind;
  magazineLabel: string;
  /** pagină 1-based în revistă */
  page: number;
  discount: number;
  manual: boolean;
  /** produs vizual pentru ProductCell */
  product: Product;
  item: PageItem;
}

function isCatalogActiveOn(catalog: Catalog, now: Date): boolean {
  const start = parseDay(catalog.start);
  const end = parseDay(catalog.end);
  end.setHours(23, 59, 59, 999);
  const t = now.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function parseDay(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return new Date(iso);
  return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0);
}

function slotDiscount(item: PageItem, product: Product): number {
  const view = displayAsProduct(product, item);
  return discountPct(+view.oldPrice || 0, +view.newPrice || 0);
}

type Candidate = FeaturedSlot;

function collectCandidates(
  sources: FeaturedSource[],
  productsById: Map<string, Product>,
  now: Date,
): Candidate[] {
  const out: Candidate[] = [];
  for (const src of sources) {
    if (!isCatalogActiveOn(src.catalog, now)) continue;
    const pages: CatalogPage[] = src.catalog.pages || [];
    pages.forEach((page, pageIdx) => {
      for (const item of page.items) {
        if (item.type !== 'product' || !item.productId) continue;
        const base = productsById.get(item.productId);
        if (!base) continue;
        const product = displayAsProduct(base, item);
        /* fără preț promoțional util — sare */
        if (!(+product.newPrice > 0)) continue;
        out.push({
          slotId: item.id,
          productId: item.productId,
          kind: src.kind,
          magazineLabel: src.label,
          page: pageIdx + 1,
          discount: slotDiscount(item, base),
          manual: !!item.featured,
          product,
          item,
        });
      }
    });
  }
  return out;
}

/**
 * Selectează 6–10 (implicit 8) căsuțe: întâi featured manual, apoi cele mai mari reduceri.
 * Fără duplicate pe productId. Catalogurile expirate sunt ignorate.
 */
export function getFeaturedSlots(
  sources: FeaturedSource[],
  products: Product[],
  opts?: { limit?: number; now?: Date },
): FeaturedSlot[] {
  const limit = Math.min(
    FEATURED_LIMIT_MAX,
    Math.max(1, opts?.limit ?? FEATURED_LIMIT_DEFAULT),
  );
  const now = opts?.now ?? new Date();
  const productsById = new Map(products.map((p) => [p.id, p]));
  const all = collectCandidates(sources, productsById, now);

  const picked: FeaturedSlot[] = [];
  const seen = new Set<string>();

  const push = (c: Candidate) => {
    if (picked.length >= limit) return;
    if (seen.has(c.productId)) return;
    seen.add(c.productId);
    picked.push(c);
  };

  /* 1) marcate manual — ordinea apariției în reviste */
  for (const c of all) {
    if (c.manual) push(c);
  }

  /* 2) completare automată după reducere % desc */
  const auto = all
    .filter((c) => !c.manual)
    .slice()
    .sort((a, b) => b.discount - a.discount || a.page - b.page);
  for (const c of auto) push(c);

  return picked;
}

/** Număr total de căsuțe marcate featured (toate paginile). */
export function countFeaturedItems(pages: CatalogPage[]): number {
  let n = 0;
  for (const page of pages) {
    for (const item of page.items) {
      if (item.type === 'product' && item.featured) n += 1;
    }
  }
  return n;
}
