/* CRUD produse pe Postgres — mapare 1:1 cu CatalogProduct. Server-only. */
import { asc, eq, sql } from 'drizzle-orm';
import type { CatalogProduct, ProductImage } from '@/lib/catalogTypes';
import { getDb } from './index';
import { products, type ProductImageRow } from './schema';

/** True când app-ul are SUPABASE_DATABASE_URL. */
export function isDatabaseConfigured(): boolean {
  return !!process.env.SUPABASE_DATABASE_URL;
}

function normalizeImages(raw: unknown): ProductImage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((im) => {
      if (!im || typeof im !== 'object') return null;
      const o = im as Record<string, unknown>;
      const src = String(o.src || '').trim();
      if (!src) return null;
      return {
        src,
        w: Number(o.w) > 0 ? Math.round(Number(o.w)) : 0,
        h: Number(o.h) > 0 ? Math.round(Number(o.h)) : 0,
      } satisfies ProductImage;
    })
    .filter((x): x is ProductImage => x != null);
}

/** src: URL absolut, path relativ sau data-URI. */
export function isValidImageSrc(src: string): boolean {
  const s = src.trim();
  if (!s) return false;
  if (s.startsWith('data:image/')) return true;
  if (s.startsWith('/') || s.startsWith('./') || s.startsWith('../')) return true;
  if (/^https?:\/\//i.test(s)) return true;
  /* path fără slash (ex. img/x.webp din seed) */
  if (!/\s/.test(s) && s.includes('.')) return true;
  return false;
}

export function validateCatalogProduct(p: CatalogProduct): string | null {
  if (!p.id?.trim()) return 'id obligatoriu';
  if (!String(p.name || '').trim() && !String(p.brand || '').trim()) {
    return 'name sau brand obligatoriu';
  }
  if (!String(p.name || '').trim()) return 'name obligatoriu';
  const price = Number(p.normalPrice);
  if (!Number.isFinite(price) || price < 0) return 'normal_price trebuie ≥ 0';
  const promo = Number(p.promoPrice ?? 0);
  if (!Number.isFinite(promo) || promo < 0) return 'promo_price trebuie ≥ 0';
  for (const im of p.images || []) {
    if (!isValidImageSrc(im.src)) return `imagine invalidă: ${im.src?.slice(0, 40) || '(gol)'}`;
  }
  return null;
}

function rowToProduct(row: typeof products.$inferSelect): CatalogProduct {
  const qty = row.unitQty;
  const kind = row.kind === 'test' ? 'test' as const : 'live' as const;
  return {
    id: row.id,
    brand: row.brand || '',
    name: row.name || '',
    details: row.details || '',
    unit: row.unit || '',
    unitQty: qty != null && Number.isFinite(qty) ? qty : 0,
    normalPrice: Number(row.normalPrice) || 0,
    promoPrice: Number(row.promoPrice) || 0,
    images: normalizeImages(row.images).map((im) => ({
      src: im.src,
      w: im.w || 0,
      h: im.h || 0,
    })),
    kind,
  };
}

function toImageRows(images: ProductImage[]): ProductImageRow[] {
  return (images || [])
    .filter((im) => isValidImageSrc(im.src))
    .map((im) => ({
      src: im.src.trim(),
      ...(im.w > 0 ? { w: im.w } : {}),
      ...(im.h > 0 ? { h: im.h } : {}),
    }));
}

export async function listProductsDb(): Promise<CatalogProduct[]> {
  const db = getDb();
  const rows = await db.select().from(products).orderBy(asc(products.brand), asc(products.name));
  return rows.map(rowToProduct);
}

export async function getProductById(id: string): Promise<CatalogProduct | null> {
  const db = getDb();
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return rows[0] ? rowToProduct(rows[0]) : null;
}

export async function upsertProductDb(product: CatalogProduct): Promise<CatalogProduct> {
  const err = validateCatalogProduct(product);
  if (err) throw new Error(err);
  const db = getDb();
  const now = new Date();
  const kind = product.kind === 'test' ? 'test' : 'live';
  const values = {
    id: product.id.trim(),
    brand: (product.brand || '').trim(),
    name: (product.name || '').trim(),
    details: (product.details || '').trim(),
    unit: (product.unit || '').trim(),
    unitQty: product.unitQty > 0 ? product.unitQty : null,
    normalPrice: String(Math.round(Number(product.normalPrice) * 100) / 100),
    promoPrice: String(Math.round(Number(product.promoPrice ?? 0) * 100) / 100),
    images: toImageRows(product.images),
    kind,
    updatedAt: now,
  };
  await db
    .insert(products)
    .values({ ...values, createdAt: now })
    .onConflictDoUpdate({
      target: products.id,
      set: {
        brand: values.brand,
        name: values.name,
        details: values.details,
        unit: values.unit,
        unitQty: values.unitQty,
        normalPrice: values.normalPrice,
        promoPrice: values.promoPrice,
        images: values.images,
        kind: values.kind,
        updatedAt: now,
      },
    });
  const saved = await getProductById(values.id);
  if (!saved) throw new Error('upsert eșuat');
  return saved;
}

export async function deleteProductDb(id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
  return deleted.length > 0;
}

export async function countProductsDb(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(products);
  return Number(rows[0]?.n) || 0;
}
