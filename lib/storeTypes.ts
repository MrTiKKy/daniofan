/* Magazine fizice + setări contact (Faza 2) — pregătit pentru Neon. */

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAY_KEYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: 'Luni',
  tue: 'Marți',
  wed: 'Miercuri',
  thu: 'Joi',
  fri: 'Vineri',
  sat: 'Sâmbătă',
  sun: 'Duminică',
};

/** Program pe o zi: închis sau interval HH:MM–HH:MM. */
export interface DayHours {
  open: boolean;
  openTime: string; /* "07:00" */
  closeTime: string; /* "21:00" */
}

export type WeeklyHours = Record<WeekdayKey, DayHours>;

/** Excepție: sărbătoare / program special pe o dată YYYY-MM-DD. */
export interface HoursException {
  id: string;
  date: string;
  closed: boolean;
  openTime?: string;
  closeTime?: string;
  label?: string; /* ex. „Crăciun” */
}

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  lat: number;
  lng: number;
  sortOrder: number;
  isPrimary: boolean;
  hours: WeeklyHours;
  exceptions: HoursException[];
}

export interface PublicContactSettings {
  /** WhatsApp global (fără +); mesajul e codat la click. */
  whatsappNumber: string;
  whatsappMessage: string;
}

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  mon: { open: true, openTime: '07:00', closeTime: '21:00' },
  tue: { open: true, openTime: '07:00', closeTime: '21:00' },
  wed: { open: true, openTime: '07:00', closeTime: '21:00' },
  thu: { open: true, openTime: '07:00', closeTime: '21:00' },
  fri: { open: true, openTime: '07:00', closeTime: '21:00' },
  sat: { open: true, openTime: '07:00', closeTime: '21:00' },
  sun: { open: true, openTime: '08:00', closeTime: '14:00' },
};

export const DEFAULT_CONTACT_SETTINGS: PublicContactSettings = {
  whatsappNumber: '40700000000',
  whatsappMessage: 'Bună ziua! Am o întrebare despre oferta Daniofan.',
};

/**
 * Magazin demo — Șos. Râmnicu Sărat 74, Brăila.
 * Marcat clar ca exemplu; înlocuit din admin când există date reale.
 */
export const DEMO_PRIMARY_STORE: StoreLocation = {
  id: 'demo-ramnicu-sarat-74',
  name: 'Daniofan Market (exemplu)',
  address: 'Șos. Râmnicu Sărat 74, Brăila',
  phone: '0700000000',
  whatsapp: '40700000000',
  /* aproximativ — exemplu pentru „Cum ajung” */
  lat: 45.2692,
  lng: 27.9575,
  sortOrder: 0,
  isPrimary: true,
  hours: { ...DEFAULT_WEEKLY_HOURS },
  exceptions: [
    {
      id: 'demo-craciun',
      date: '2026-12-25',
      closed: true,
      label: 'Crăciun',
    },
  ],
};
