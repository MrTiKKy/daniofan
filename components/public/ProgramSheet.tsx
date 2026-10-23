'use client';
import { useMemo } from 'react';
import { getBucharestParts, isOpenNow, scheduleForDate } from '@/lib/storeHours';
import type { StoreLocation, WeekdayKey } from '@/lib/storeTypes';
import { WEEKDAY_KEYS, WEEKDAY_LABELS } from '@/lib/storeTypes';
import BottomSheet from './BottomSheet';

interface Props {
  open: boolean;
  onClose: () => void;
  stores: StoreLocation[];
  now?: Date;
}

function WeekTable({ store, now }: { store: StoreLocation; now: Date }) {
  const parts = getBucharestParts(now);
  const [y, m, d] = parts.dateStr.split('-').map(Number);
  return (
    <ul className="prog-week">
      {WEEKDAY_KEYS.map((key: WeekdayKey, i) => {
        /* L–D din săptămâna curentă (offset semnat față de azi) */
        const offset = i - parts.weekdayIndex;
        const dt = new Date(y, m - 1, d + offset);
        const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        const isToday = key === parts.weekday;
        const day = scheduleForDate(store.hours, store.exceptions, dateStr, key);
        const ex = store.exceptions.find((e) => e.date === dateStr);
        let hoursLabel: string;
        if (!day.open) {
          hoursLabel = ex?.label ? `Închis (${ex.label})` : 'Închis';
        } else {
          hoursLabel = `${day.openTime} – ${day.closeTime}`;
          if (ex?.label) hoursLabel += ` · ${ex.label}`;
        }
        return (
          <li key={key} className={'prog-week__row' + (isToday ? ' is-today' : '')}>
            <span className="prog-week__day">{WEEKDAY_LABELS[key]}</span>
            <span className="prog-week__hours">{hoursLabel}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function ProgramSheet({ open, onClose, stores, now }: Props) {
  const primary = useMemo(
    () => stores.find((s) => s.isPrimary) || stores[0] || null,
    [stores],
  );
  const status = primary && now ? isOpenNow(primary, now) : null;
  const multi = stores.length > 1;

  return (
    <BottomSheet open={open} title="Program" onClose={onClose}>
      {!primary || !now ? (
        <p className="prog-empty">Programul magazinelor apare aici.</p>
      ) : (
        <>
          <p className={'prog-now' + (status?.open ? ' is-open' : ' is-closed')} role="status">
            <span aria-hidden>●</span>
            {status?.open
              ? `Deschis acum · ${status.untilLabel}`
              : `Închis · ${status?.untilLabel}`}
          </p>
          {multi ? (
            stores.map((s) => (
              <section key={s.id} className="prog-block">
                <h3 className="prog-block__name">{s.name}</h3>
                <WeekTable store={s} now={now} />
              </section>
            ))
          ) : (
            <WeekTable store={primary} now={now} />
          )}
        </>
      )}
    </BottomSheet>
  );
}
