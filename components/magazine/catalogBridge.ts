/* Adaptori catalog → căutare / modal / tracking (fără a schimba PageRenderer). */
import type { Catalog, CatalogPage, CatalogProduct, PageItem } from '@/lib/catalogTypes';
import { stripDiacritics } from '@/lib/text';
import type { Product } from '@/lib/types';

export function pageProductEntries(
  page: CatalogPage,
  productsById: Map<string, CatalogProduct>,
): { product: CatalogProduct; item: PageItem }[] {
  const out: { product: CatalogProduct; item: PageItem }[] = [];
  for (const item of page.items) {
    if (item.type !== 'product' || !item.productId) continue;
    const product = productsById.get(item.productId);
    if (product) out.push({ product, item });
  }
  return out;
}

export function pageProductIds(page: CatalogPage): string[] {
  return page.items
    .filter((i) => i.type === 'product' && i.productId)
    .map((i) => i.productId!) ;
}

export function findProductPage(catalog: Catalog, productId: string): number {
  const i = catalog.pages.findIndex((p) => pageProductIds(p).includes(productId));
  return i < 0 ? 1 : i + 1;
}

export function toLegacyProduct(product: CatalogProduct, item?: PageItem): Product {
  return {
    id: product.id,
    name: [product.brand, product.name].filter(Boolean).join(' '),
    size: product.details,
    oldPrice: product.normalPrice,
    newPrice: item?.promoPrice ?? product.normalPrice,
    category: '',
    hero: false,
    sgr: true,
    image: product.images[0]?.src || '',
    validUntil: '',
    brand: product.brand,
    unitQty: product.unitQty,
    unitKind: product.unit,
    specialLabel: item?.label,
  };
}

export type CatalogSearchHit = { product: CatalogProduct; item: PageItem; page: number };

export function searchCatalog(
  catalog: Catalog,
  productsById: Map<string, CatalogProduct>,
  query: string,
): CatalogSearchHit[] {
  const q = stripDiacritics(query.trim());
  if (!q) return [];
  const out: CatalogSearchHit[] = [];
  const seen = new Set<string>();
  catalog.pages.forEach((page, i) => {
    pageProductEntries(page, productsById).forEach(({ product, item }) => {
      if (seen.has(product.id)) return;
      const hay = stripDiacritics(`${product.brand} ${product.name} ${product.details}`);
      if (hay.includes(q)) {
        seen.add(product.id);
        out.push({ product, item, page: i + 1 });
      }
    });
  });
  return out;
}
