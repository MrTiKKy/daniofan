/* Teste getFeaturedSlots — npx tsx --test lib/featured.test.ts */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFeaturedSlots, countFeaturedItems } from './featured';
import type { Catalog, CatalogPage, PageItem } from './catalogTypes';
import type { Product } from './types';

function product(id: string, oldP: number, newP: number): Product {
  return {
    id,
    name: id,
    brand: 'Brand',
    size: '1l',
    oldPrice: oldP,
    newPrice: newP,
    category: 'x',
    hero: false,
    sgr: true,
    image: '',
    validUntil: '',
  };
}

function item(
  id: string,
  productId: string,
  opts?: { featured?: boolean; newPrice?: number; oldPrice?: number },
): PageItem {
  return {
    id,
    type: 'product',
    productId,
    col: 0,
    row: 0,
    w: 1,
    h: 1,
    featured: opts?.featured,
    media: [],
    mediaLayout: 'single',
    display: {
      brand: 'Brand',
      name: productId,
      size: '1l',
      variants: '',
      specialLabel: '',
      oldPrice: opts?.oldPrice ?? 10,
      newPrice: opts?.newPrice ?? 8,
      images: [],
    },
    promoPrice: opts?.newPrice ?? 8,
  };
}

function catalog(
  id: string,
  start: string,
  end: string,
  pages: CatalogPage[],
): Catalog {
  return {
    id,
    title: id,
    start,
    end,
    theme: 'standard',
    status: 'published',
    grid: { cols: 3, rows: 4 },
    pages,
    kind: 'weekend',
  };
}

const products = [
  product('a', 10, 5), /* -50% */
  product('b', 10, 7), /* -30% */
  product('c', 10, 9), /* -10% */
  product('d', 10, 6), /* -40% */
  product('e', 10, 8), /* -20% */
];

describe('getFeaturedSlots', () => {
  it('marcate manual apar primele', () => {
    const pages: CatalogPage[] = [{
      id: 'p1',
      items: [
        item('s1', 'c', { featured: true, oldPrice: 10, newPrice: 9 }),
        item('s2', 'a', { oldPrice: 10, newPrice: 5 }),
        item('s3', 'd', { oldPrice: 10, newPrice: 6 }),
      ],
    }];
    const src = [{
      kind: 'weekend' as const,
      label: 'Weekend',
      catalog: catalog('c1', '2026-03-01', '2026-03-31', pages),
    }];
    const now = new Date(2026, 2, 15);
    const out = getFeaturedSlots(src, products, { now, limit: 3 });
    assert.equal(out[0].productId, 'c');
    assert.equal(out[0].manual, true);
    assert.equal(out[1].productId, 'a'); /* cea mai mare reducere rămasă */
    assert.equal(out[2].productId, 'd');
  });

  it('completare automată după reducere', () => {
    const pages: CatalogPage[] = [{
      id: 'p1',
      items: [
        item('s1', 'a', { oldPrice: 10, newPrice: 5 }),
        item('s2', 'b', { oldPrice: 10, newPrice: 7 }),
        item('s3', 'd', { oldPrice: 10, newPrice: 6 }),
      ],
    }];
    const src = [{
      kind: 'weekend' as const,
      label: 'Weekend',
      catalog: catalog('c1', '2026-03-01', '2026-03-31', pages),
    }];
    const out = getFeaturedSlots(src, products, { now: new Date(2026, 2, 15), limit: 2 });
    assert.deepEqual(out.map((x) => x.productId), ['a', 'd']);
  });

  it('fără duplicate pe productId', () => {
    const pages: CatalogPage[] = [
      {
        id: 'p1',
        items: [
          item('s1', 'a', { featured: true, oldPrice: 10, newPrice: 5 }),
        ],
      },
      {
        id: 'p2',
        items: [
          item('s2', 'a', { featured: true, oldPrice: 10, newPrice: 4 }),
          item('s3', 'b', { oldPrice: 10, newPrice: 7 }),
        ],
      },
    ];
    const src = [{
      kind: 'weekend' as const,
      label: 'Weekend',
      catalog: catalog('c1', '2026-03-01', '2026-03-31', pages),
    }];
    const out = getFeaturedSlots(src, products, { now: new Date(2026, 2, 15), limit: 5 });
    assert.equal(out.filter((x) => x.productId === 'a').length, 1);
    assert.ok(out.some((x) => x.productId === 'b'));
  });

  it('oferte expirate sunt ignorate', () => {
    const pages: CatalogPage[] = [{
      id: 'p1',
      items: [item('s1', 'a', { featured: true, oldPrice: 10, newPrice: 5 })],
    }];
    const src = [{
      kind: 'weekend' as const,
      label: 'Weekend',
      catalog: catalog('c1', '2026-01-01', '2026-01-31', pages),
    }];
    const out = getFeaturedSlots(src, products, { now: new Date(2026, 2, 15), limit: 8 });
    assert.equal(out.length, 0);
  });

  it('countFeaturedItems', () => {
    const pages: CatalogPage[] = [{
      id: 'p1',
      items: [
        item('s1', 'a', { featured: true }),
        item('s2', 'b'),
        item('s3', 'c', { featured: true }),
      ],
    }];
    assert.equal(countFeaturedItems(pages), 2);
  });
});
