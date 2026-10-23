/* Utilitare program magazine — fus Europe/Bucharest. */
import type {
  DayHours,
  HoursException,
  StoreLocation,
  WeekdayKey,
  WeeklyHours,
} from './storeTypes';
import { WEEKDAY_KEYS } from './storeTypes';

const TZ = 'Europe/Bucharest';

export interface BucharestParts {
  /** 0 = luni … 6 = duminică (ordine comercială) */
  weekdayIndex: number;
  weekday: WeekdayKey;
  /** minute de la 00:00 */
  minutes: number;
  /** YYYY-MM-DD */
  dateStr: string;
  hour: number;
  minute: number;
}

const WEEKDAY_FROM_SHORT: Record<string, WeekdayKey> = {
  Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun',
};

export function getBucharestParts(now: Date = new Date()): BucharestParts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const weekday = WEEKDAY_FROM_SHORT[parts.weekday] || 'mon';
  const hour = parts.hour === '24' ? 0 : parseInt(parts.hour, 10);
  const minute = parseInt(parts.minute, 10);
  return {
    weekday,
    weekdayIndex: WEEKDAY_KEYS.indexOf(weekday),
    minutes: hour * 60 + minute,
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute,
  };
}

export function parseHm(hm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return NaN;
  const h = +m[1];
  const min = +m[2];
  if (h < 0 || h > 23 || min < 0 || min > 59) return NaN;
  return h * 60 + min;
}

export function formatHm(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function exceptionForDate(
  exceptions: HoursException[],
  dateStr: string,
): HoursException | undefined {
  return exceptions.find((e) => e.date === dateStr);
}

/** Program efectiv pentru o dată (excepțiile au prioritate). */
export function scheduleForDate(
  hours: WeeklyHours,
  exceptions: HoursException[],
  dateStr: string,
  weekday: WeekdayKey,
): DayHours {
  const ex = exceptionForDate(exceptions, dateStr);
  if (ex) {
    if (ex.closed) return { open: false, openTime: '00:00', closeTime: '00:00' };
    return {
      open: true,
      openTime: ex.openTime || '07:00',
      closeTime: ex.closeTime || '21:00',
    };
  }
  return { ...hours[weekday] };
}

export function todaySchedule(store: StoreLocation, now: Date = new Date()): DayHours & {
  dateStr: string;
  weekday: WeekdayKey;
  exceptionLabel?: string;
} {
  const p = getBucharestParts(now);
  const day = scheduleForDate(store.hours, store.exceptions, p.dateStr, p.weekday);
  const ex = exceptionForDate(store.exceptions, p.dateStr);
  return {
    ...day,
    dateStr: p.dateStr,
    weekday: p.weekday,
    exceptionLabel: ex?.label,
  };
}

export interface OpenStatus {
  open: boolean;
  /** text scurt: „până la 21:00” / „se deschide mâine la 07:00” */
  untilLabel: string;
  closeTime?: string;
  nextOpenLabel?: string;
}

export function isOpenNow(store: StoreLocation, now: Date = new Date()): OpenStatus {
  const p = getBucharestParts(now);
  const today = scheduleForDate(store.hours, store.exceptions, p.dateStr, p.weekday);

  if (today.open) {
    const openM = parseHm(today.openTime);
    const closeM = parseHm(today.closeTime);
    if (Number.isFinite(openM) && Number.isFinite(closeM) && p.minutes >= openM && p.minutes < closeM) {
      return {
        open: true,
        untilLabel: `până la ${today.closeTime}`,
        closeTime: today.closeTime,
      };
    }
  }

  const next = nextOpening(store, now);
  return {
    open: false,
    untilLabel: next ? `se deschide ${next.whenLabel} la ${next.openTime}` : 'program indisponibil',
    nextOpenLabel: next ? `${next.whenLabel} la ${next.openTime}` : undefined,
  };
}

export interface NextOpening {
  openTime: string;
  whenLabel: string; /* „azi” | „mâine” | „luni” … */
  dateStr: string;
}

export function nextOpening(store: StoreLocation, now: Date = new Date()): NextOpening | null {
  const p = getBucharestParts(now);

  for (let offset = 0; offset < 14; offset++) {
    const probe = new Date(now.getTime() + offset * 86400000);
    /* avansează pe calendarul Bucharest prin format pe probe + offset zile din dateStr e greu;
       construim data din p.dateStr + offset */
    const base = parseYmd(p.dateStr);
    base.setDate(base.getDate() + offset);
    const dateStr = toYmd(base);
    const weekday = WEEKDAY_KEYS[(p.weekdayIndex + offset) % 7];
    const day = scheduleForDate(store.hours, store.exceptions, dateStr, weekday);
    if (!day.open) continue;
    const openM = parseHm(day.openTime);
    if (!Number.isFinite(openM)) continue;
    if (offset === 0 && p.minutes >= openM) {
      /* azi, dar suntem înainte de open? deja trecut open — dacă suntem după close, skip */
      const closeM = parseHm(day.closeTime);
      if (p.minutes >= closeM) continue;
      /* între open și close — deja deschis; next opening e după close → zi următoare */
      continue;
    }
    if (offset === 0 && p.minutes < openM) {
      return { openTime: day.openTime, whenLabel: 'azi', dateStr };
    }
    if (offset === 1) {
      return { openTime: day.openTime, whenLabel: 'mâine', dateStr };
    }
    const labels: Record<WeekdayKey, string> = {
      mon: 'luni', tue: 'marți', wed: 'miercuri', thu: 'joi',
      fri: 'vineri', sat: 'sâmbătă', sun: 'duminică',
    };
    return { openTime: day.openTime, whenLabel: labels[weekday], dateStr };
  }
  return null;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Extrage lat/lng din URL Google Maps (dir, place, @lat,lng, q=lat,lng). */
export function parseMapsLatLng(url: string): { lat: number; lng: number } | null {
  const at = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/.exec(url);
  if (at) return { lat: +at[1], lng: +at[2] };
  const q = /[?&](?:q|query|destination)=(-?\d+\.?\d*),(-?\d+\.?\d*)/.exec(url);
  if (q) return { lat: +q[1], lng: +q[2] };
  const dest = /destination=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/i.exec(url)
    || /destination=(-?\d+\.?\d*),(-?\d+\.?\d*)/i.exec(url);
  if (dest) return { lat: +dest[1], lng: +dest[2] };
  return null;
}

export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function whatsappUrl(number: string, message: string): string {
  const n = number.replace(/\D/g, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

/** Validare telefon RO simplă: 07xxxxxxxx / +407… / 02/03 landline. */
export function isValidRoPhone(raw: string): boolean {
  const d = raw.replace(/[\s.-]/g, '');
  return /^(\+4|0)(7\d{8}|2\d{8}|3\d{8})$/.test(d);
}

export function isValidHm(hm: string): boolean {
  return Number.isFinite(parseHm(hm));
}
