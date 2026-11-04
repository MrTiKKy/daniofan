/* Strat de date pentru catalog — API / Postgres first.
   Componentele folosesc CatalogRepository / funcțiile exportate.
   Când API-ul răspunde (inclusiv listă goală), nu mai citim/seedăm localStorage. */
import { loadDefaultOffer } from '@/data/offer';
import { adminAuthHeaders } from './adminAuth';
import { autoPlaceProducts, emptyPage, uid } from './autoLayout';
import type {
  Catalog,
  CatalogProduct,
  CatalogStatus,
  MagazineKind,
  PublishIssue,
} from './catalogTypes';
import { DEFAULT_GRID, MAGAZINE_KINDS, magazineKindLabel } from './catalogTypes';
import { discountPct } from './catalogPricing';
import { MAGAZINE_PUBLISHED_KEY } from './magazineBuilderStore';
import type { Product } from './types';
import type { PublicContactSettings, StoreLocation } from './storeTypes';
import {
  DEMO_PRIMARY_STORE,
  DEFAULT_CONTACT_SETTINGS,
} from './storeTypes';
export const CATALOG_PRODUCTS_KEY = 'daniofan.catalog.products.v1';
export const CATALOG_LIST_KEY = 'daniofan.catalog.list.v1';
export const CATALOG_ACTIVE_KEY = 'daniofan.catalog.active.v1';
export const CATALOG_STORES_KEY = 'daniofan.catalog.stores.v1';
export const CATALOG_SETTINGS_KEY = 'daniofan.catalog.settings.v1';

/** CatalogProduct → Product (pliant / admin OfferData). */
export function catalogProductToOfferProduct(p: CatalogProduct): Product {
  const img = p.images?.[0]?.src || '';
  const size = (p.details || '').trim()
    || (p.unitQty > 0 && p.unit ? `${p.unitQty} ${p.unit}` : '');
  return {
    id: p.id,
    brand: p.brand || undefined,
    name: p.name || '',
    size,
    oldPrice: +p.normalPrice || 0,
    newPrice: +p.promoPrice > 0 ? +p.promoPrice : 0,
    category: '',
    hero: false,
    sgr: false,
    image: img,
    validUntil: '',
    unitQty: p.unitQty > 0 ? p.unitQty : undefined,
    unitKind: p.unit || undefined,
  };
}

/** Product (admin) → Postgres CatalogProduct. */
export function offerProductToCatalogProduct(p: Product): CatalogProduct {
  const brand = (p.brand || '').trim() || p.name.split(/\s+/)[0] || p.name;
  const name = (p.brand || '').trim()
    ? p.name
    : (p.name.split(/\s+/).slice(1).join(' ') || p.name);
  const m = /(\d+[.,]?\d*)\s*(kg|g|l|ml)\b/i.exec(p.size || '');
  let unitQty = p.unitQty ?? 0;
  let unit = (p.unitKind || '').trim();
  if (m && !(unitQty > 0)) {
    unitQty = parseFloat(m[1].replace(',', '.'));
    const u = m[2].toLowerCase();
    if (u === 'g') { unitQty /= 1000; unit = 'kg'; }
    else if (u === 'ml') { unitQty /= 1000; unit = 'l'; }
    else unit = u;
  }
  const details = [p.size, p.variants].filter(Boolean).join(' · ');
  const normalPrice = +p.oldPrice > 0 ? +p.oldPrice : 0;
  const promoPrice = +p.newPrice > 0 ? +p.newPrice : 0;
  return {
    id: p.id,
    brand,
    name,
    details,
    unit,
    unitQty,
    normalPrice: Number.isFinite(normalPrice) ? normalPrice : 0,
    promoPrice: Number.isFinite(promoPrice) ? promoPrice : 0,
    images: p.image
      ? [{ src: p.image.replace(/^\//, ''), w: 400, h: 800 }]
      : [],
    kind: 'live',
  };
}

/** Șterge cache-ul local de produse/reviste — Postgres e sursa. */
export function clearLocalCatalogCaches(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(CATALOG_PRODUCTS_KEY);
    localStorage.removeItem(CATALOG_LIST_KEY);
    localStorage.removeItem(CATALOG_ACTIVE_KEY);
    localStorage.removeItem(MAGAZINE_PUBLISHED_KEY);
  } catch { /* */ }
}

/** Slot pe pagina de pornire (cele 2 tipuri). */
export interface HomeMagazineSlot {
  kind: MagazineKind;
  label: string;
  catalog: Catalog | null;
  /** true = în perioada start–end */
  active: boolean;
  coverSrc: string | null;
}

export interface CatalogRepository {
  listProducts(): Promise<CatalogProduct[]>;
  saveProduct(product: CatalogProduct): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  listCatalogs(): Promise<Catalog[]>;
  getCatalog(id: string): Promise<Catalog | null>;
  saveCatalog(catalog: Catalog): Promise<void>;
  duplicateCatalog(id: string): Promise<Catalog>;
  deleteCatalog(id: string): Promise<void>;
  getActiveCatalogId(): Promise<string | null>;
  setActiveCatalogId(id: string): Promise<void>;
  getPublishedCatalog(): Promise<Catalog | null>;
  getPublishedByKind(kind: MagazineKind): Promise<Catalog | null>;
  getHomeMagazines(now?: Date): Promise<HomeMagazineSlot[]>;
  getOtherActiveMagazine(kind: MagazineKind, now?: Date): Promise<HomeMagazineSlot | null>;
  getStores(): Promise<StoreLocation[]>;
  saveStore(store: StoreLocation): Promise<void>;
  deleteStore(id: string): Promise<void>;
  getSettings(): Promise<PublicContactSettings>;
  saveSettings(settings: PublicContactSettings): Promise<void>;
}

function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Migrează produsele demo din offer.json în formatul catalog. */
export async function migrateDemoProducts(): Promise<CatalogProduct[]> {
  const offer = await loadDefaultOffer();
  return offer.products.map((p) => {
    const brand = (p.brand || '').trim() || p.name.split(/\s+/)[0] || p.name;
    const name = (p.brand || '').trim() ? p.name : (p.name.split(/\s+/).slice(1).join(' ') || '');
    const m = /(\d+[.,]?\d*)\s*(kg|g|l|ml)\b/i.exec(p.size || '');
    let unitQty = p.unitQty ?? 0;
    let unit = (p.unitKind || '').trim();
    if (m && !(unitQty > 0)) {
      unitQty = parseFloat(m[1].replace(',', '.'));
      const u = m[2].toLowerCase();
      if (u === 'g') { unitQty /= 1000; unit = 'kg'; }
      else if (u === 'ml') { unitQty /= 1000; unit = 'l'; }
      else unit = u;
    }
    const details = [p.size, p.variants].filter(Boolean).join(' · ');
    return {
      id: p.id,
      brand,
      name,
      details,
      unit,
      unitQty,
      normalPrice: +p.oldPrice > 0 ? +p.oldPrice : 0,
      promoPrice: +p.newPrice > 0 ? +p.newPrice : 0,
      images: p.image
        ? [{ src: p.image.replace(/^\//, ''), w: 400, h: 800 }]
        : [],
    } satisfies CatalogProduct;
  });
}

function weekendRange(): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const end = new Date(today);
  end.setDate(today.getDate() + ((7 - dow) % 7));
  const start = new Date(end);
  start.setDate(end.getDate() - 2);
  const iso = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  return { start: iso(start), end: iso(end) };
}

export async function seedDefaultCatalog(products: CatalogProduct[]): Promise<Catalog> {
  const offer = await loadDefaultOffer();
  const dates = offer.offer.autoDates ? weekendRange() : { start: offer.offer.start, end: offer.offer.end };
  const catalog: Catalog = {
    id: uid('cat'),
    title: offer.offer.title || 'Ofertă de WEEK-END',
    start: dates.start,
    end: dates.end,
    theme: (offer.offer.theme as Catalog['theme']) || 'standard',
    status: 'published',
    grid: { ...DEFAULT_GRID },
    pages: [emptyPage()],
  };
  // promo = newPrice din demo
  const withPromo = autoPlaceProducts(catalog, products);
  // setează promoPrice din oferta veche
  const priceMap = new Map(offer.products.map((p) => [p.id, +p.newPrice]));
  withPromo.pages.forEach((page) => {
    page.items.forEach((it) => {
      if (it.type === 'product' && it.productId && priceMap.has(it.productId)) {
        it.promoPrice = priceMap.get(it.productId);
        const prod = products.find((x) => x.id === it.productId);
        if (prod && it.promoPrice != null) {
          const d = discountPct(prod.normalPrice, it.promoPrice);
          it.label = d > 0 ? `-${d}%` : it.label;
        }
      }
    });
  });
  return withPromo;
}

/**
 * Client → /api/products (Postgres pe server).
 * Returnează null dacă API e offline / 503 → fallback localStorage.
 */
async function fetchProductsFromApi(): Promise<CatalogProduct[] | null> {
  if (typeof fetch === 'undefined') return null;
  try {
    const res = await fetch('/api/products', { cache: 'no-store' });
    if (res.status === 503) return null;
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Nu am putut citi produsele (${res.status}).`);
    }
    const data = await res.json() as { items?: CatalogProduct[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    if (err instanceof TypeError) return null; /* network / offline */
    throw err;
  }
}

async function saveProductViaApi(product: CatalogProduct): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...adminAuthHeaders(),
      },
      body: JSON.stringify(product),
    });
    if (res.status === 503) return false;
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Salvare eșuată (${res.status}).`);
    }
    return true;
  } catch (err) {
    if (err instanceof TypeError) return false;
    throw err;
  }
}

async function deleteProductViaApi(id: string): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { ...adminAuthHeaders() },
    });
    if (res.status === 503) return false;
    if (!res.ok && res.status !== 404) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Ștergere eșuată (${res.status}).`);
    }
    return true;
  } catch (err) {
    if (err instanceof TypeError) return false;
    throw err;
  }
}

async function fetchCatalogsFromApi(): Promise<Catalog[] | null> {
  if (typeof fetch === 'undefined') return null;
  try {
    const res = await fetch('/api/catalogs', { cache: 'no-store' });
    if (res.status === 503) return null;
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Nu am putut citi revistele (${res.status}).`);
    }
    const data = await res.json() as { items?: Catalog[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    if (err instanceof TypeError) return null;
    throw err;
  }
}

async function saveCatalogViaApi(catalog: Catalog): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  try {
    const res = await fetch('/api/catalogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify(catalog),
    });
    if (res.status === 503) return false;
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Salvare revistă eșuată (${res.status}).`);
    }
    return true;
  } catch (err) {
    if (err instanceof TypeError) return false;
    throw err;
  }
}

async function deleteCatalogViaApi(id: string): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  try {
    const res = await fetch(`/api/catalogs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { ...adminAuthHeaders() },
    });
    if (res.status === 503) return false;
    if (!res.ok && res.status !== 404) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Ștergere revistă eșuată (${res.status}).`);
    }
    return true;
  } catch (err) {
    if (err instanceof TypeError) return false;
    throw err;
  }
}

async function fetchStoresFromApi(): Promise<StoreLocation[] | null> {
  if (typeof fetch === 'undefined') return null;
  try {
    const res = await fetch('/api/stores', { cache: 'no-store' });
    if (res.status === 503) return null;
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Nu am putut citi magazinele (${res.status}).`);
    }
    const data = await res.json() as { items?: StoreLocation[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    if (err instanceof TypeError) return null;
    throw err;
  }
}

async function saveStoreViaApi(store: StoreLocation): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  try {
    const res = await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify(store),
    });
    if (res.status === 503) return false;
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Salvare magazin eșuată (${res.status}).`);
    }
    return true;
  } catch (err) {
    if (err instanceof TypeError) return false;
    throw err;
  }
}

async function deleteStoreViaApi(id: string): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  try {
    const res = await fetch(`/api/stores/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { ...adminAuthHeaders() },
    });
    if (res.status === 503) return false;
    if (!res.ok && res.status !== 404) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Ștergere magazin eșuată (${res.status}).`);
    }
    return true;
  } catch (err) {
    if (err instanceof TypeError) return false;
    throw err;
  }
}

async function fetchSettingsFromApi(): Promise<PublicContactSettings | null> {
  if (typeof fetch === 'undefined') return null;
  try {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (res.status === 503) return null;
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Nu am putut citi setările (${res.status}).`);
    }
    const data = await res.json() as { item?: PublicContactSettings };
    return data.item || null;
  } catch (err) {
    if (err instanceof TypeError) return null;
    throw err;
  }
}

async function saveSettingsViaApi(settings: PublicContactSettings): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify(settings),
    });
    if (res.status === 503) return false;
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error || `Salvare setări eșuată (${res.status}).`);
    }
    return true;
  } catch (err) {
    if (err instanceof TypeError) return false;
    throw err;
  }
}

export class LocalStorageRepository implements CatalogRepository {
  private ready: Promise<void> | null = null;

  private ensure(): Promise<void> {
    if (!this.ready) this.ready = this.bootstrap();
    return this.ready;
  }

  private async bootstrap(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    /* Fără seed demo — produsele/revistele vin din baza de date. Doar stores/settings locale ca fallback. */
    const stores = readJson<StoreLocation[]>(CATALOG_STORES_KEY, []);
    if (!stores.length) {
      writeJson(CATALOG_STORES_KEY, [clone(DEMO_PRIMARY_STORE)]);
    }
    if (!localStorage.getItem(CATALOG_SETTINGS_KEY)) {
      writeJson(CATALOG_SETTINGS_KEY, DEFAULT_CONTACT_SETTINGS);
    }
  }

  async listProducts(): Promise<CatalogProduct[]> {
    const fromApi = await fetchProductsFromApi();
    if (fromApi) {
      clearLocalCatalogCaches();
      return fromApi;
    }
    await this.ensure();
    return clone(readJson<CatalogProduct[]>(CATALOG_PRODUCTS_KEY, []));
  }

  async saveProduct(product: CatalogProduct): Promise<void> {
    const viaApi = await saveProductViaApi(product);
    if (viaApi) {
      try { localStorage.removeItem(CATALOG_PRODUCTS_KEY); } catch { /* */ }
      return;
    }
    await this.ensure();
    const list = readJson<CatalogProduct[]>(CATALOG_PRODUCTS_KEY, []);
    const i = list.findIndex((p) => p.id === product.id);
    if (i >= 0) list[i] = clone(product);
    else list.push(clone(product));
    writeJson(CATALOG_PRODUCTS_KEY, list);
  }

  async deleteProduct(id: string): Promise<void> {
    const viaApi = await deleteProductViaApi(id);
    if (viaApi) {
      try { localStorage.removeItem(CATALOG_PRODUCTS_KEY); } catch { /* */ }
      return;
    }
    await this.ensure();
    const list = readJson<CatalogProduct[]>(CATALOG_PRODUCTS_KEY, []).filter((p) => p.id !== id);
    writeJson(CATALOG_PRODUCTS_KEY, list);
  }

  async listCatalogs(): Promise<Catalog[]> {
    const fromApi = await fetchCatalogsFromApi();
    if (fromApi) {
      try {
        localStorage.removeItem(CATALOG_LIST_KEY);
        localStorage.removeItem(CATALOG_ACTIVE_KEY);
      } catch { /* */ }
      return fromApi;
    }
    await this.ensure();
    return clone(readJson<Catalog[]>(CATALOG_LIST_KEY, []));
  }

  async getCatalog(id: string): Promise<Catalog | null> {
    const fromApi = await fetchCatalogsFromApi();
    if (fromApi) return fromApi.find((c) => c.id === id) || null;
    await this.ensure();
    const list = readJson<Catalog[]>(CATALOG_LIST_KEY, []);
    const hit = list.find((c) => c.id === id);
    return hit ? clone(hit) : null;
  }

  async saveCatalog(catalog: Catalog): Promise<void> {
    const viaApi = await saveCatalogViaApi(catalog);
    if (viaApi) return;
    await this.ensure();
    const list = readJson<Catalog[]>(CATALOG_LIST_KEY, []);
    const i = list.findIndex((c) => c.id === catalog.id);
    const next = clone(catalog);
    next.updatedAt = new Date().toISOString();
    if (i >= 0) list[i] = next;
    else list.push(next);
    /* Un singur published pe tip; celelalte published pe tip → archived. */
    if (next.status === 'published') {
      const nextKind = next.kind === 'special' ? 'special' : 'weekend';
      list.forEach((c) => {
        if (c.id === next.id || c.status !== 'published') return;
        const ck = c.kind === 'special' ? 'special' : 'weekend';
        if (ck === nextKind) {
          c.status = 'archived';
          c.permanent = false;
        }
      });
    }
    writeJson(CATALOG_LIST_KEY, list);
  }

  async duplicateCatalog(id: string): Promise<Catalog> {
    const src = await this.getCatalog(id);
    if (!src) throw new Error('Revista nu există');
    const copy: Catalog = {
      ...clone(src),
      id: uid('cat'),
      title: src.title + ' (copie)',
      status: 'draft',
      pages: src.pages.map((p) => ({
        ...clone(p),
        id: uid('page'),
        items: p.items.map((it) => ({ ...clone(it), id: uid('item') })),
      })),
    };
    await this.saveCatalog(copy);
    return copy;
  }

  async deleteCatalog(id: string): Promise<void> {
    const viaApi = await deleteCatalogViaApi(id);
    if (viaApi) {
      try { localStorage.removeItem(CATALOG_LIST_KEY); } catch { /* */ }
      return;
    }
    await this.ensure();
    const list = readJson<Catalog[]>(CATALOG_LIST_KEY, []).filter((c) => c.id !== id);
    writeJson(CATALOG_LIST_KEY, list);
    const active = readJson<string | null>(CATALOG_ACTIVE_KEY, null);
    if (active === id) writeJson(CATALOG_ACTIVE_KEY, null);
  }

  async getActiveCatalogId(): Promise<string | null> {
    await this.ensure();
    return readJson<string | null>(CATALOG_ACTIVE_KEY, null);
  }

  async setActiveCatalogId(id: string): Promise<void> {
    await this.ensure();
    writeJson(CATALOG_ACTIVE_KEY, id);
  }

  async getPublishedCatalog(): Promise<Catalog | null> {
    const list = await this.listCatalogs();
    return list.find((c) => c.status === 'published') || null;
  }

  async getPublishedByKind(kind: MagazineKind): Promise<Catalog | null> {
    const slots = await this.getHomeMagazines();
    const hit = slots.find((s) => s.kind === kind);
    return hit?.catalog ? clone(hit.catalog) : null;
  }

  async getOtherActiveMagazine(
    kind: MagazineKind,
    now = new Date(),
  ): Promise<HomeMagazineSlot | null> {
    const other: MagazineKind = kind === 'weekend' ? 'special' : 'weekend';
    const slots = await this.getHomeMagazines(now);
    const hit = slots.find((s) => s.kind === other && s.active && !!s.catalog);
    return hit ? clone(hit) : null;
  }

  async getHomeMagazines(now = new Date()): Promise<HomeMagazineSlot[]> {
    const [products, list] = await Promise.all([this.listProducts(), this.listCatalogs()]);
    const byKind = new Map<MagazineKind, Catalog>();

    for (const c of list) {
      if (c.status !== 'published') continue;
      const k: MagazineKind = c.kind === 'special' ? 'special' : 'weekend';
      if (!byKind.has(k)) byKind.set(k, clone(c));
    }

    return MAGAZINE_KINDS.map((kind) => {
      const catalog = byKind.get(kind) || null;
      const active = catalog ? isCatalogActive(catalog, now) : false;
      const withGrids = catalog
        ? {
            ...catalog,
            pages: catalog.pages.map((page) => (
              page.grid ? page : { ...page, grid: { ...(catalog.grid || DEFAULT_GRID) } }
            )),
          }
        : null;
      return {
        kind,
        label: withGrids?.title?.trim() || magazineKindLabel(kind),
        catalog: withGrids,
        active,
        coverSrc: withGrids ? resolveCatalogCover(withGrids, products) : null,
      };
    });
  }

  async getStores(): Promise<StoreLocation[]> {
    const fromApi = await fetchStoresFromApi();
    if (fromApi) {
      return clone(fromApi).sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      });
    }
    await this.ensure();
    const list = readJson<StoreLocation[]>(CATALOG_STORES_KEY, []);
    return clone(list).sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
  }

  async saveStore(store: StoreLocation): Promise<void> {
    const viaApi = await saveStoreViaApi(store);
    if (viaApi) return;
    await this.ensure();
    const list = readJson<StoreLocation[]>(CATALOG_STORES_KEY, []);
    const next = clone(store);
    if (next.isPrimary) {
      list.forEach((s) => { s.isPrimary = s.id === next.id; });
    }
    const i = list.findIndex((s) => s.id === next.id);
    if (i >= 0) list[i] = next;
    else list.push(next);
    if (!list.some((s) => s.isPrimary) && list.length) list[0].isPrimary = true;
    writeJson(CATALOG_STORES_KEY, list);
  }

  async deleteStore(id: string): Promise<void> {
    const viaApi = await deleteStoreViaApi(id);
    if (viaApi) return;
    await this.ensure();
    let list = readJson<StoreLocation[]>(CATALOG_STORES_KEY, []).filter((s) => s.id !== id);
    if (list.length && !list.some((s) => s.isPrimary)) list[0].isPrimary = true;
    writeJson(CATALOG_STORES_KEY, list);
  }

  async getSettings(): Promise<PublicContactSettings> {
    const fromApi = await fetchSettingsFromApi();
    if (fromApi) return { ...DEFAULT_CONTACT_SETTINGS, ...fromApi };
    await this.ensure();
    return {
      ...DEFAULT_CONTACT_SETTINGS,
      ...readJson<Partial<PublicContactSettings>>(CATALOG_SETTINGS_KEY, {}),
    };
  }

  async saveSettings(settings: PublicContactSettings): Promise<void> {
    const viaApi = await saveSettingsViaApi(settings);
    if (viaApi) return;
    await this.ensure();
    writeJson(CATALOG_SETTINGS_KEY, clone(settings));
  }
}

let repo: CatalogRepository = new LocalStorageRepository();

/** Înlocuiește implementarea (ex. DbRepository) fără a schimba componentele. */
export function setCatalogRepository(next: CatalogRepository): void {
  repo = next;
}

export function getCatalogRepository(): CatalogRepository {
  return repo;
}

export const listProducts = () => repo.listProducts();
export const saveProduct = (p: CatalogProduct) => repo.saveProduct(p);
export const deleteProduct = (id: string) => repo.deleteProduct(id);
export const listCatalogs = () => repo.listCatalogs();
export const getCatalog = (id: string) => repo.getCatalog(id);
export const saveCatalog = (c: Catalog) => repo.saveCatalog(c);
export const duplicateCatalog = (id: string) => repo.duplicateCatalog(id);
export const deleteCatalog = (id: string) => repo.deleteCatalog(id);

/** Publică / arhivează pe Postgres (PATCH). Fallback: saveCatalog local. */
export async function publishCatalog(id: string): Promise<void> {
  if (typeof fetch !== 'undefined') {
    try {
      const res = await fetch(`/api/catalogs/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
        body: JSON.stringify({ action: 'publish' }),
      });
      if (res.status !== 503) {
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error || `Publicare eșuată (${res.status}).`);
        }
        return;
      }
    } catch (err) {
      if (!(err instanceof TypeError)) throw err;
    }
  }
  const cat = await getCatalog(id);
  if (!cat) throw new Error('Revista nu există');
  await saveCatalog({ ...cat, status: 'published' });
}

export async function archiveCatalog(id: string): Promise<void> {
  if (typeof fetch !== 'undefined') {
    try {
      const res = await fetch(`/api/catalogs/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
        body: JSON.stringify({ action: 'archive' }),
      });
      if (res.status !== 503) {
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error || `Arhivare eșuată (${res.status}).`);
        }
        return;
      }
    } catch (err) {
      if (!(err instanceof TypeError)) throw err;
    }
  }
  const cat = await getCatalog(id);
  if (!cat) throw new Error('Revista nu există');
  await saveCatalog({ ...cat, status: 'archived', permanent: false });
}
export const getActiveCatalogId = () => repo.getActiveCatalogId();
export const setActiveCatalogId = (id: string) => repo.setActiveCatalogId(id);
export const getPublishedCatalog = () => repo.getPublishedCatalog();
export const getPublishedByKind = (kind: MagazineKind) => repo.getPublishedByKind(kind);
export const getHomeMagazines = (now?: Date) => repo.getHomeMagazines(now);
export const getOtherActiveMagazine = (kind: MagazineKind, now?: Date) =>
  repo.getOtherActiveMagazine(kind, now);
export const getStores = () => repo.getStores();
export const saveStore = (s: StoreLocation) => repo.saveStore(s);
export const deleteStore = (id: string) => repo.deleteStore(id);
export const getSettings = () => repo.getSettings();
export const saveSettings = (s: PublicContactSettings) => repo.saveSettings(s);

/** Interpretează YYYY-MM-DD ca zi locală. */
export function parseCatalogDay(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return new Date(iso);
  return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0);
}

/** Momentan: publicat = vizibil. Fereastra start/end e dezactivată (revine ulterior). */
export function isCatalogActive(_catalog: Catalog, _now = new Date()): boolean {
  return true;
}

/** Prima poză utilă de pe foile catalogului (copertă). */
export function resolveCatalogCover(
  catalog: Catalog,
  products: CatalogProduct[],
): string | null {
  if (catalog.coverSrc) return catalog.coverSrc;
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const page of catalog.pages) {
    for (const it of page.items) {
      if (it.display?.images?.[0]) return it.display.images[0];
      if (it.productId) {
        const prod = byId.get(it.productId);
        const src = prod?.images?.[0]?.src;
        if (src) return src;
      }
    }
  }
  return null;
}

/** Text urgență: „Oferte valabile 20–25 oct · mai sunt X zile” / „Ultima zi!”. */
export function urgencyBannerText(
  start: Date,
  end: Date,
  now = new Date(),
): { range: string; suffix: string; lastDay: boolean } {
  const months = [
    'ian', 'feb', 'mar', 'apr', 'mai', 'iun',
    'iul', 'aug', 'sept', 'oct', 'nov', 'dec',
  ];
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const range = sameMonth
    ? `${start.getDate()}–${end.getDate()} ${months[end.getMonth()]}`
    : `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]}`;

  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const days = Math.round((startOfEnd.getTime() - startOfToday.getTime()) / 86400000);
  const lastDay = days <= 0 && now.getTime() <= endDay.getTime();
  if (lastDay || days === 0) {
    return { range, suffix: 'Ultima zi!', lastDay: true };
  }
  if (days === 1) return { range, suffix: 'mai este 1 zi', lastDay: false };
  return { range, suffix: `mai sunt ${days} zile`, lastDay: false };
}

/** Salvare catalog cu debounce ~500 ms. */
export function createDebouncedCatalogSaver(delayMs = 500) {
  let t: ReturnType<typeof setTimeout> | undefined;
  let pending: Catalog | null = null;
  return {
    schedule(catalog: Catalog) {
      pending = catalog;
      clearTimeout(t);
      t = setTimeout(() => {
        if (pending) void saveCatalog(pending);
        pending = null;
      }, delayMs);
    },
    flush() {
      clearTimeout(t);
      if (pending) {
        const c = pending;
        pending = null;
        return saveCatalog(c);
      }
      return Promise.resolve();
    },
  };
}

export function validateForPublish(
  catalog: Catalog,
  products: CatalogProduct[],
): PublishIssue[] {
  const issues: PublishIssue[] = [];
  const byId = new Map(products.map((p) => [p.id, p]));

  catalog.pages.forEach((page, pi) => {
    if (!page.items.length) {
      issues.push({
        code: 'empty-page',
        message: `Pagina ${pi + 1} este goală.`,
        pageId: page.id,
      });
    }
    page.items.forEach((it) => {
      if (it.type === 'product') {
        const prod = it.productId ? byId.get(it.productId) : undefined;
        if (!prod) {
          issues.push({
            code: 'no-image',
            message: `Căsuță fără produs pe pagina ${pi + 1}.`,
            pageId: page.id,
            itemId: it.id,
          });
          return;
        }
        if (!(it.promoPrice != null && it.promoPrice > 0)) {
          issues.push({
            code: 'no-promo',
            message: `${prod.brand}: lipsește prețul promoțional.`,
            pageId: page.id,
            itemId: it.id,
            productId: prod.id,
          });
        }
        if (!prod.images.length || !it.media.length) {
          issues.push({
            code: 'no-image',
            message: `${prod.brand}: lipsește poza.`,
            pageId: page.id,
            itemId: it.id,
            productId: prod.id,
          });
        }
      }
      if ((it.type === 'text' || it.type === 'heading') && (it.text || '').trim().length > 280) {
        issues.push({
          code: 'text-overflow',
          message: `Text prea lung pe pagina ${pi + 1}.`,
          pageId: page.id,
          itemId: it.id,
        });
      }
    });
  });

  return issues;
}

export function catalogStatusLabel(s: CatalogStatus): string {
  if (s === 'published') return 'Publicată';
  if (s === 'archived') return 'Arhivă';
  return 'Ciornă';
}
