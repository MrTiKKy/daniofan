/* CRUD catalogs + pages pe Postgres — mapare 1:1 cu Catalog / CatalogPage. Server-only. */
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { Catalog, CatalogPage, CatalogStatus, MagazineKind } from '@/lib/catalogTypes';
import { DEFAULT_GRID, normalizeCatalogStatus } from '@/lib/catalogTypes';
import { getDb } from './index';
import { catalogPages, catalogs, magazineDrafts } from './schema';

export { isDatabaseConfigured } from './products';

const RECENT_LIMIT = 8;

function rowToCatalog(
  row: typeof catalogs.$inferSelect,
  pages: CatalogPage[],
): Catalog {
  return {
    id: row.id,
    title: row.title || '',
    start: row.startDate || '',
    end: row.endDate || '',
    theme: row.theme || 'standard',
    status: normalizeCatalogStatus(row.status),
    kind: row.kind === 'special' ? 'special' : 'weekend',
    permanent: !!row.permanent,
    coverSrc: row.coverSrc || undefined,
    grid: row.grid || { ...DEFAULT_GRID },
    pages,
    updatedAt: row.updatedAt?.toISOString?.() || undefined,
  };
}

function pageRowToPage(row: typeof catalogPages.$inferSelect): CatalogPage {
  return {
    id: row.id,
    items: Array.isArray(row.items) ? row.items : [],
    ...(row.grid ? { grid: row.grid } : {}),
    ...(row.chrome ? { chrome: row.chrome } : {}),
    ...(Array.isArray(row.decor) && row.decor.length ? { decor: row.decor } : {}),
  };
}

async function loadPages(catalogId: string): Promise<CatalogPage[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(catalogPages)
    .where(eq(catalogPages.catalogId, catalogId))
    .orderBy(asc(catalogPages.sortOrder));
  return rows.map(pageRowToPage);
}

export async function listCatalogsDb(): Promise<Catalog[]> {
  const db = getDb();
  const rows = await db.select().from(catalogs).orderBy(desc(catalogs.updatedAt));
  const out: Catalog[] = [];
  for (const row of rows) {
    out.push(rowToCatalog(row, await loadPages(row.id)));
  }
  return out;
}

/** Ultimele N pe tip (draft + published + archived), recent întâi. */
export async function listRecentCatalogsDb(
  kind: MagazineKind,
  limit = RECENT_LIMIT,
): Promise<Catalog[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(catalogs)
    .where(eq(catalogs.kind, kind))
    .orderBy(desc(catalogs.updatedAt))
    .limit(limit);
  const out: Catalog[] = [];
  for (const row of rows) {
    out.push(rowToCatalog(row, await loadPages(row.id)));
  }
  return out;
}

export async function getCatalogByIdDb(id: string): Promise<Catalog | null> {
  const db = getDb();
  const rows = await db.select().from(catalogs).where(eq(catalogs.id, id)).limit(1);
  if (!rows[0]) return null;
  return rowToCatalog(rows[0], await loadPages(id));
}

export async function getPublishedByKindDb(kind: MagazineKind): Promise<Catalog | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(catalogs)
    .where(and(eq(catalogs.kind, kind), eq(catalogs.status, 'published')))
    .orderBy(desc(catalogs.updatedAt))
    .limit(1);
  if (!rows[0]) return null;
  return rowToCatalog(rows[0], await loadPages(rows[0].id));
}

/** Înlocuiește toate foile unui catalog (design per pagină). */
async function replacePages(catalogId: string, pages: CatalogPage[]): Promise<void> {
  const db = getDb();
  const now = new Date();
  await db.delete(catalogPages).where(eq(catalogPages.catalogId, catalogId));
  if (!pages.length) return;

  /* Evită conflict PK dacă aceleași page-id există pe altă revistă (ex. publicată). */
  const wantedIds = pages.map((p) => p.id).filter(Boolean);
  const taken = new Set<string>();
  if (wantedIds.length) {
    const rows = await db
      .select({ id: catalogPages.id })
      .from(catalogPages)
      .where(inArray(catalogPages.id, wantedIds));
    for (const r of rows) taken.add(r.id);
  }

  const mint = () => `page-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(catalogPages).values(
    pages.map((p, i) => {
      let id = p.id || mint();
      if (taken.has(id)) id = mint();
      taken.add(id);
      return {
        id,
        catalogId,
        sortOrder: i,
        grid: p.grid ?? null,
        chrome: p.chrome ?? null,
        decor: p.decor?.length ? p.decor : null,
        items: p.items || [],
        createdAt: now,
        updatedAt: now,
      };
    }),
  );
}

export async function upsertCatalogDb(catalog: Catalog): Promise<Catalog> {
  const db = getDb();
  const now = new Date();
  const kind: MagazineKind = catalog.kind === 'special' ? 'special' : 'weekend';
  const status = normalizeCatalogStatus(catalog.status);
  let startDate = catalog.start || '';
  let endDate = catalog.end || '';
  /* Guard: end înainte de start → home tratează revista ca inactivă. */
  if (startDate && endDate && endDate < startDate) {
    endDate = startDate;
  }
  const values = {
    id: catalog.id,
    title: (catalog.title || '').trim(),
    kind,
    status,
    theme: catalog.theme || 'standard',
    startDate,
    endDate,
    permanent: status === 'published' ? !!catalog.permanent : false,
    coverSrc: catalog.coverSrc || null,
    grid: catalog.grid || { ...DEFAULT_GRID },
    updatedAt: now,
  };

  await db
    .insert(catalogs)
    .values({ ...values, createdAt: now })
    .onConflictDoUpdate({
      target: catalogs.id,
      set: {
        title: values.title,
        kind: values.kind,
        status: values.status,
        theme: values.theme,
        startDate: values.startDate,
        endDate: values.endDate,
        permanent: values.permanent,
        coverSrc: values.coverSrc,
        grid: values.grid,
        updatedAt: now,
      },
    });

  /* Un singur published pe tip → celelalte published pe tip → archived */
  if (status === 'published') {
    await db
      .update(catalogs)
      .set({ status: 'archived', permanent: false, updatedAt: now })
      .where(
        and(
          eq(catalogs.kind, kind),
          eq(catalogs.status, 'published'),
          ne(catalogs.id, catalog.id),
        ),
      );
  }

  await replacePages(catalog.id, catalog.pages || []);

  if (status === 'draft') {
    await saveMagazineDraftDb(kind, catalog.id, 0);
  }

  const saved = await getCatalogByIdDb(catalog.id);
  if (!saved) throw new Error('upsert catalog eșuat');
  return saved;
}

/** Publică un catalog existent (fără a rescrie pages dacă lipsesc). */
export async function publishCatalogDb(id: string): Promise<Catalog> {
  const current = await getCatalogByIdDb(id);
  if (!current) throw new Error('Revista nu există');
  if (!current.pages?.some((p) => p.grid)) {
    throw new Error('Revista nu are pagini cu grilă.');
  }
  return upsertCatalogDb({ ...current, status: 'published' });
}

export async function archiveCatalogDb(id: string): Promise<Catalog> {
  const current = await getCatalogByIdDb(id);
  if (!current) throw new Error('Revista nu există');
  return upsertCatalogDb({ ...current, status: 'archived', permanent: false });
}

export async function deleteCatalogDb(id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db.delete(catalogs).where(eq(catalogs.id, id)).returning({ id: catalogs.id });
  return deleted.length > 0;
}

export async function getMagazineDraftDb(kind: MagazineKind): Promise<{
  catalog: Catalog | null;
  activeIndex: number;
} | null> {
  const db = getDb();
  const rows = await db.select().from(magazineDrafts).where(eq(magazineDrafts.kind, kind)).limit(1);
  if (!rows[0]) return null;
  const catalog = rows[0].catalogId ? await getCatalogByIdDb(rows[0].catalogId) : null;
  return { catalog, activeIndex: rows[0].activeIndex || 0 };
}

export async function saveMagazineDraftDb(
  kind: MagazineKind,
  catalogId: string,
  activeIndex: number,
): Promise<void> {
  const db = getDb();
  const now = new Date();
  await db
    .insert(magazineDrafts)
    .values({ kind, catalogId, activeIndex, updatedAt: now })
    .onConflictDoUpdate({
      target: magazineDrafts.kind,
      set: { catalogId, activeIndex, updatedAt: now },
    });
}

export async function countCatalogsDb(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(catalogs);
  return Number(rows[0]?.n) || 0;
}
