/* Schema Postgres (Supabase) — products + catalogs/pages + stores + settings. */
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type {
  CatalogGrid,
  CatalogStatus,
  MagazineKind,
  PageChrome,
  PageDecorItem,
  PageItem,
  ThemeKey,
} from '@/lib/catalogTypes';
import type { DayHours, WeekdayKey } from '@/lib/storeTypes';

/** Imagine pe produs: { src, w?, h? } */
export type ProductImageRow = {
  src: string;
  w?: number;
  h?: number;
};

/**
 * CatalogProduct pe Postgres.
 * normal_price = preț vechi / de raft; promo_price = preț redus.
 * PageItem.promoPrice poate încă override pe casuța din revistă.
 */
export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    brand: text('brand').notNull().default(''),
    name: text('name').notNull(),
    details: text('details').notNull().default(''),
    unit: text('unit').notNull().default(''),
    unitQty: real('unit_qty'),
    normalPrice: numeric('normal_price', { precision: 10, scale: 2 }).notNull(),
    /** Preț redus pe produs (0 = fără promo stocat). */
    promoPrice: numeric('promo_price', { precision: 10, scale: 2 }).notNull().default('0'),
    images: jsonb('images').$type<ProductImageRow[]>().notNull().default([]),
    /** 'test' = date de test; 'live' = produs real */
    kind: text('kind').notNull().default('live'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('products_name_lower_idx').on(sql`lower(${t.name})`),
    index('products_brand_lower_idx').on(sql`lower(${t.brand})`),
    index('products_kind_idx').on(t.kind),
  ],
);

/** Revistă (meta) — foile stau în catalog_pages (design per pagină). */
export const catalogs = pgTable(
  'catalogs',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull().default(''),
    kind: text('kind').$type<MagazineKind>().notNull().default('weekend'),
    status: text('status').$type<CatalogStatus>().notNull().default('draft'),
    theme: text('theme').$type<ThemeKey>().notNull().default('standard'),
    startDate: text('start_date').notNull().default(''),
    endDate: text('end_date').notNull().default(''),
    permanent: boolean('permanent').notNull().default(false),
    coverSrc: text('cover_src'),
    /** Grilă implicită (paginile pot override). */
    grid: jsonb('grid').$type<CatalogGrid>().notNull().default({ cols: 4, rows: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('catalogs_kind_status_idx').on(t.kind, t.status),
    index('catalogs_updated_idx').on(t.updatedAt),
  ],
);

/**
 * O foaie din revistă — design propriu (grid + chrome) + casuțe (items).
 * items = PageItem[] (promo, layout, display pe casuță).
 */
export const catalogPages = pgTable(
  'catalog_pages',
  {
    id: text('id').primaryKey(),
    catalogId: text('catalog_id')
      .notNull()
      .references(() => catalogs.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    grid: jsonb('grid').$type<CatalogGrid>(),
    chrome: jsonb('chrome').$type<PageChrome>(),
    decor: jsonb('decor').$type<PageDecorItem[]>(),
    items: jsonb('items').$type<PageItem[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('catalog_pages_catalog_sort_idx').on(t.catalogId, t.sortOrder),
  ],
);

/** Pointer draft constructor: un draft activ pe tip (weekend / special). */
export const magazineDrafts = pgTable('magazine_drafts', {
  kind: text('kind').$type<MagazineKind>().primaryKey(),
  catalogId: text('catalog_id').references(() => catalogs.id, { onDelete: 'set null' }),
  activeIndex: integer('active_index').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Magazin fizic. */
export const stores = pgTable(
  'stores',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    address: text('address').notNull().default(''),
    phone: text('phone').notNull().default(''),
    whatsapp: text('whatsapp').notNull().default(''),
    lat: real('lat').notNull().default(0),
    lng: real('lng').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('stores_sort_idx').on(t.sortOrder)],
);

/** Program pe zi (mon…sun) — design separat de magazin. */
export const storeHours = pgTable(
  'store_hours',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    day: text('day').$type<WeekdayKey>().notNull(),
    open: boolean('open').notNull().default(true),
    openTime: text('open_time').notNull().default('07:00'),
    closeTime: text('close_time').notNull().default('21:00'),
  },
  (t) => [index('store_hours_store_day_idx').on(t.storeId, t.day)],
);

/** Excepții program (sărbători). */
export const storeExceptions = pgTable(
  'store_exceptions',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    closed: boolean('closed').notNull().default(true),
    openTime: text('open_time'),
    closeTime: text('close_time'),
    label: text('label'),
  },
  (t) => [index('store_exceptions_store_date_idx').on(t.storeId, t.date)],
);

/** Setări site (WhatsApp etc.) — key/value jsonb. */
export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type StoreHoursRow = DayHours & { day: WeekdayKey };
