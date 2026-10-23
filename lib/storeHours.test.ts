/* Teste storeHours — rulează: npx tsx --test lib/storeHours.test.ts */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBucharestParts,
  isOpenNow,
  nextOpening,
  scheduleForDate,
  todaySchedule,
} from './storeHours';
import { DEMO_PRIMARY_STORE, DEFAULT_WEEKLY_HOURS } from './storeTypes';
import type { StoreLocation } from './storeTypes';

/** Construiește un Date care, în Europe/Bucharest, cade pe ymd + HH:MM. */
function bucharestLocal(ymd: string, hm: string): Date {
  const [y, mo, d] = ymd.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  /* aproximare: formatăm până găsim UTC care mapează corect */
  for (let utcH = 0; utcH < 24; utcH++) {
    const probe = new Date(Date.UTC(y, mo - 1, d, utcH, mi, 0));
    const p = getBucharestParts(probe);
    if (p.dateStr === ymd && p.hour === h && p.minute === mi) return probe;
  }
  /* fallback: tratează ca local host TZ — testele folosesc ymd aliniat */
  return new Date(y, mo - 1, d, h, mi, 0);
}

const store: StoreLocation = {
  ...DEMO_PRIMARY_STORE,
  hours: { ...DEFAULT_WEEKLY_HOURS },
  exceptions: [
    { id: 'xmas', date: '2026-12-25', closed: true, label: 'Crăciun' },
  ],
};

describe('storeHours', () => {
  it('azi deschis — în interval', () => {
    /* Luni 2026-03-16 e o zi lucrătoare tipică */
    const now = bucharestLocal('2026-03-16', '10:30');
    const st = isOpenNow(store, now);
    assert.equal(st.open, true);
    assert.match(st.untilLabel, /21:00/);
  });

  it('azi închis — zi fără program (forțat)', () => {
    const closedSun: StoreLocation = {
      ...store,
      hours: {
        ...DEFAULT_WEEKLY_HOURS,
        sun: { open: false, openTime: '00:00', closeTime: '00:00' },
      },
      exceptions: [],
    };
    const now = bucharestLocal('2026-03-15', '12:00'); /* duminică */
    const st = isOpenNow(closedSun, now);
    assert.equal(st.open, false);
  });

  it('după închidere — next opening mâine', () => {
    const now = bucharestLocal('2026-03-16', '21:30');
    const st = isOpenNow(store, now);
    assert.equal(st.open, false);
    const next = nextOpening(store, now);
    assert.ok(next);
    assert.equal(next!.whenLabel, 'mâine');
    assert.equal(next!.openTime, '07:00');
  });

  it('zi de sărbătoare — închis', () => {
    const now = bucharestLocal('2026-12-25', '11:00');
    const day = todaySchedule(store, now);
    assert.equal(day.open, false);
    assert.equal(day.exceptionLabel, 'Crăciun');
    const st = isOpenNow(store, now);
    assert.equal(st.open, false);
  });

  it('înainte de deschidere — next azi', () => {
    const now = bucharestLocal('2026-03-16', '06:00');
    const st = isOpenNow(store, now);
    assert.equal(st.open, false);
    const next = nextOpening(store, now);
    assert.ok(next);
    assert.equal(next!.whenLabel, 'azi');
    assert.equal(next!.openTime, '07:00');
  });

  it('miezul nopții — după 00:00, înainte de open', () => {
    const now = bucharestLocal('2026-03-16', '00:15');
    const st = isOpenNow(store, now);
    assert.equal(st.open, false);
    const next = nextOpening(store, now);
    assert.ok(next);
    assert.equal(next!.whenLabel, 'azi');
  });

  it('scheduleForDate respectă excepția', () => {
    const day = scheduleForDate(store.hours, store.exceptions, '2026-12-25', 'fri');
    assert.equal(day.open, false);
  });
});
