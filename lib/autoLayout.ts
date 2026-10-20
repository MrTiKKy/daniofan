/* Așază automat produsele rămase din sertar pe pagini. */
import { findFirstFit } from './collision';
import { autoLabel, suggestSizeFromImage } from './catalogPricing';
import type {
  Catalog,
  CatalogPage,
  CatalogProduct,
  PageItem,
  SizePreset,
} from './catalogTypes';
import { DEFAULT_GRID, SIZE_PRESETS } from './catalogTypes';

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function emptyPage(): CatalogPage {
  return { id: uid('page'), items: [] };
}

function usedProductIds(catalog: Catalog): Set<string> {
  const s = new Set<string>();
  for (const p of catalog.pages) {
    for (const it of p.items) {
      if (it.type === 'product' && it.productId) s.add(it.productId);
    }
  }
  return s;
}

function defaultMedia(product: CatalogProduct): PageItem['media'] {
  if (!product.images.length) return [];
  return [{ imageIndex: 0, x: 0, y: 0, scale: 1 }];
}

function sizeForProduct(product: CatalogProduct, prefer?: SizePreset): { w: number; h: number } {
  if (prefer) return { w: prefer.w, h: prefer.h };
  const img = product.images[0];
  if (img) {
    const s = suggestSizeFromImage(img.w, img.h);
    return { w: s.w, h: s.h };
  }
  return { w: 2, h: 2 };
}

export function makeProductItem(
  product: CatalogProduct,
  col: number,
  row: number,
  size?: { w: number; h: number },
  promoPrice?: number,
): PageItem {
  const dim = size || sizeForProduct(product);
  const promo = promoPrice ?? product.normalPrice * 0.9;
  const rounded = Math.round(promo * 100) / 100;
  return {
    id: uid('item'),
    type: 'product',
    productId: product.id,
    col,
    row,
    w: dim.w,
    h: dim.h,
    promoPrice: rounded,
    label: autoLabel(product.normalPrice, rounded),
    media: defaultMedia(product),
    mediaLayout: product.images.length >= 3 ? 'fan' : product.images.length === 2 ? 'side' : 'single',
  };
}

/**
 * Pune produsele care nu sunt încă în revistă în primul loc liber.
 * Creează pagini noi când e nevoie. Returnează catalogul actualizat.
 */
export function autoPlaceProducts(
  catalog: Catalog,
  products: CatalogProduct[],
  sizeByProductId?: Record<string, SizePreset>,
): Catalog {
  const grid = catalog.grid || DEFAULT_GRID;
  const used = usedProductIds(catalog);
  const pending = products.filter((p) => !used.has(p.id));
  if (!pending.length) return catalog;

  const pages = catalog.pages.map((p) => ({ ...p, items: [...p.items] }));
  if (!pages.length) pages.push(emptyPage());

  for (const product of pending) {
    const prefer = sizeByProductId?.[product.id];
    const size = sizeForProduct(product, prefer);
    let placed = false;

    for (let i = 0; i < pages.length; i++) {
      const spot = findFirstFit(size.w, size.h, grid, pages[i].items);
      if (spot) {
        pages[i].items.push(makeProductItem(product, spot.col, spot.row, size));
        placed = true;
        break;
      }
    }

    if (!placed) {
      const page = emptyPage();
      const spot = findFirstFit(size.w, size.h, grid, page.items);
      if (spot) {
        page.items.push(makeProductItem(product, spot.col, spot.row, size));
        pages.push(page);
      } else {
        // fallback: încearcă mic 1×2
        const tiny = SIZE_PRESETS[0];
        const spot2 = findFirstFit(tiny.w, tiny.h, grid, page.items);
        if (spot2) {
          page.items.push(makeProductItem(product, spot2.col, spot2.row, tiny));
          pages.push(page);
        }
      }
    }
  }

  return { ...catalog, pages };
}

export { usedProductIds, emptyPage, uid };
