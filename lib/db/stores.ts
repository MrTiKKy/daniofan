/* CRUD magazine + program + excepții pe Postgres. Server-only. */
import { asc, eq } from 'drizzle-orm';
import type {
  DayHours,
  HoursException,
  PublicContactSettings,
  StoreLocation,
  WeekdayKey,
  WeeklyHours,
} from '@/lib/storeTypes';
import {
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_WEEKLY_HOURS,
  WEEKDAY_KEYS,
} from '@/lib/storeTypes';
import { getDb } from './index';
import { siteSettings, storeExceptions, storeHours, stores } from './schema';

export { isDatabaseConfigured } from './products';

const SETTINGS_KEY = 'public_contact';

function emptyHours(): WeeklyHours {
  return structuredClone(DEFAULT_WEEKLY_HOURS);
}

async function loadHours(storeId: string): Promise<WeeklyHours> {
  const db = getDb();
  const rows = await db.select().from(storeHours).where(eq(storeHours.storeId, storeId));
  const hours = emptyHours();
  for (const r of rows) {
    const day = r.day as WeekdayKey;
    if (!WEEKDAY_KEYS.includes(day)) continue;
    hours[day] = {
      open: !!r.open,
      openTime: r.openTime || '07:00',
      closeTime: r.closeTime || '21:00',
    };
  }
  return hours;
}

async function loadExceptions(storeId: string): Promise<HoursException[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(storeExceptions)
    .where(eq(storeExceptions.storeId, storeId))
    .orderBy(asc(storeExceptions.date));
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    closed: !!r.closed,
    ...(r.openTime ? { openTime: r.openTime } : {}),
    ...(r.closeTime ? { closeTime: r.closeTime } : {}),
    ...(r.label ? { label: r.label } : {}),
  }));
}

function rowToStore(
  row: typeof stores.$inferSelect,
  hours: WeeklyHours,
  exceptions: HoursException[],
): StoreLocation {
  return {
    id: row.id,
    name: row.name,
    address: row.address || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    lat: Number(row.lat) || 0,
    lng: Number(row.lng) || 0,
    sortOrder: row.sortOrder ?? 0,
    isPrimary: !!row.isPrimary,
    hours,
    exceptions,
  };
}

export async function listStoresDb(): Promise<StoreLocation[]> {
  const db = getDb();
  const rows = await db.select().from(stores).orderBy(asc(stores.sortOrder));
  const out: StoreLocation[] = [];
  for (const row of rows) {
    out.push(rowToStore(row, await loadHours(row.id), await loadExceptions(row.id)));
  }
  return out;
}

async function replaceHours(storeId: string, hours: WeeklyHours): Promise<void> {
  const db = getDb();
  await db.delete(storeHours).where(eq(storeHours.storeId, storeId));
  await db.insert(storeHours).values(
    WEEKDAY_KEYS.map((day) => {
      const h: DayHours = hours[day] || DEFAULT_WEEKLY_HOURS[day];
      return {
        id: `${storeId}-${day}`,
        storeId,
        day,
        open: !!h.open,
        openTime: h.openTime || '07:00',
        closeTime: h.closeTime || '21:00',
      };
    }),
  );
}

async function replaceExceptions(storeId: string, exceptions: HoursException[]): Promise<void> {
  const db = getDb();
  await db.delete(storeExceptions).where(eq(storeExceptions.storeId, storeId));
  if (!exceptions.length) return;
  await db.insert(storeExceptions).values(
    exceptions.map((ex) => ({
      id: ex.id,
      storeId,
      date: ex.date,
      closed: !!ex.closed,
      openTime: ex.openTime || null,
      closeTime: ex.closeTime || null,
      label: ex.label || null,
    })),
  );
}

export async function upsertStoreDb(store: StoreLocation): Promise<StoreLocation> {
  const db = getDb();
  const now = new Date();
  const values = {
    id: store.id,
    name: store.name.trim(),
    address: store.address || '',
    phone: store.phone || '',
    whatsapp: store.whatsapp || '',
    lat: store.lat || 0,
    lng: store.lng || 0,
    sortOrder: store.sortOrder ?? 0,
    isPrimary: !!store.isPrimary,
    updatedAt: now,
  };

  if (values.isPrimary) {
    await db.update(stores).set({ isPrimary: false, updatedAt: now });
  }

  await db
    .insert(stores)
    .values({ ...values, createdAt: now })
    .onConflictDoUpdate({
      target: stores.id,
      set: {
        name: values.name,
        address: values.address,
        phone: values.phone,
        whatsapp: values.whatsapp,
        lat: values.lat,
        lng: values.lng,
        sortOrder: values.sortOrder,
        isPrimary: values.isPrimary,
        updatedAt: now,
      },
    });

  await replaceHours(store.id, store.hours || emptyHours());
  await replaceExceptions(store.id, store.exceptions || []);

  const rows = await db.select().from(stores).where(eq(stores.id, store.id)).limit(1);
  return rowToStore(rows[0]!, await loadHours(store.id), await loadExceptions(store.id));
}

export async function deleteStoreDb(id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db.delete(stores).where(eq(stores.id, id)).returning({ id: stores.id });
  return deleted.length > 0;
}

export async function getSettingsDb(): Promise<PublicContactSettings> {
  const db = getDb();
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, SETTINGS_KEY)).limit(1);
  if (!rows[0]?.value || typeof rows[0].value !== 'object') {
    return { ...DEFAULT_CONTACT_SETTINGS };
  }
  const v = rows[0].value as Partial<PublicContactSettings>;
  return {
    whatsappNumber: String(v.whatsappNumber || DEFAULT_CONTACT_SETTINGS.whatsappNumber),
    whatsappMessage: String(v.whatsappMessage || DEFAULT_CONTACT_SETTINGS.whatsappMessage),
  };
}

export async function saveSettingsDb(settings: PublicContactSettings): Promise<PublicContactSettings> {
  const db = getDb();
  const now = new Date();
  const value = {
    whatsappNumber: settings.whatsappNumber || '',
    whatsappMessage: settings.whatsappMessage || '',
  };
  await db
    .insert(siteSettings)
    .values({ key: SETTINGS_KEY, value, updatedAt: now })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedAt: now },
    });
  return getSettingsDb();
}
