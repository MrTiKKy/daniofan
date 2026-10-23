/* Preferință „cel mai apropiat magazin” + haversine. */
import type { StoreLocation } from './storeTypes';

export const NEAREST_STORE_KEY = 'daniofan.nearestStoreId';
export const NEAREST_STORE_EVENT = 'daniofan:nearest-store';

const R_KM = 6371;

/** Distanță haversine în km. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function nearestStore(
  stores: StoreLocation[],
  lat: number,
  lng: number,
): StoreLocation | null {
  if (!stores.length) return null;
  let best = stores[0];
  let bestD = haversineKm(lat, lng, best.lat, best.lng);
  for (let i = 1; i < stores.length; i++) {
    const d = haversineKm(lat, lng, stores[i].lat, stores[i].lng);
    if (d < bestD) {
      best = stores[i];
      bestD = d;
    }
  }
  return best;
}

export function getPreferredStoreId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(NEAREST_STORE_KEY);
  } catch {
    return null;
  }
}

export function setPreferredStoreId(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(NEAREST_STORE_KEY, id);
    window.dispatchEvent(new CustomEvent(NEAREST_STORE_EVENT, { detail: { id } }));
  } catch { /* */ }
}

/** Magazin afișat pe bandă: preferat din LS, altfel principal, altfel primul. */
export function resolveDisplayStore(stores: StoreLocation[]): StoreLocation | null {
  if (!stores.length) return null;
  const pref = getPreferredStoreId();
  if (pref) {
    const found = stores.find((s) => s.id === pref);
    if (found) return found;
  }
  return stores.find((s) => s.isPrimary) || stores[0];
}
