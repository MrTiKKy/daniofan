'use client';
/* Bandă subțire: magazin principal / preferat + stare program. */
import { useCallback, useEffect, useState } from 'react';
import { getStores } from '@/lib/catalogStore';
import { isOpenNow, mapsDirectionsUrl } from '@/lib/storeHours';
import {
  NEAREST_STORE_EVENT,
  resolveDisplayStore,
} from '@/lib/nearestStore';
import type { StoreLocation } from '@/lib/storeTypes';
import { usePublicChrome } from '@/components/public/PublicChrome';

interface Props {
  now?: Date;
}

export default function NearestStoreBar({ now: nowProp }: Props) {
  const { openLocations } = usePublicChrome();
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [store, setStore] = useState<StoreLocation | null>(null);
  const [tick, setTick] = useState<Date | null>(null);

  const refreshStore = useCallback((list: StoreLocation[]) => {
    setStore(resolveDisplayStore(list));
  }, []);

  useEffect(() => {
    setTick(nowProp || new Date());
  }, [nowProp]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const list = await getStores();
      if (!alive) return;
      setStores(list);
      refreshStore(list);
    })();
    return () => { alive = false; };
  }, [refreshStore]);

  useEffect(() => {
    const onPref = () => refreshStore(stores);
    window.addEventListener(NEAREST_STORE_EVENT, onPref);
    window.addEventListener('storage', onPref);
    return () => {
      window.removeEventListener(NEAREST_STORE_EVENT, onPref);
      window.removeEventListener('storage', onPref);
    };
  }, [stores, refreshStore]);

  /* actualizare stare la fiecare minut */
  useEffect(() => {
    const id = window.setInterval(() => setTick(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!store || !tick) return null;

  const status = isOpenNow(store, tick);
  const street = (store.address || '').split(',')[0]?.trim() || '';
  const streetShort = street
    .replace(/^(Șos\.|Sos\.|Str\.|Bd\.)\s*/i, '')
    .trim();
  const shortName = streetShort
    ? `Daniofan ${streetShort}`
    : (store.name.replace(/\s*\(exemplu\)\s*/i, '').trim() || store.name);
  const maps = mapsDirectionsUrl(store.lat, store.lng);

  return (
    <div className="nearest">
      <button
        type="button"
        className="nearest__main"
        onClick={openLocations}
        aria-label="Deschide locațiile magazinelor"
      >
        <span className="nearest__pin" aria-hidden>📍</span>
        <span className="nearest__text">
          <span className="nearest__name">{shortName}</span>
          <span className="nearest__sep" aria-hidden>·</span>
          <span className={'nearest__status' + (status.open ? ' is-open' : ' is-closed')}>
            <span aria-hidden>●</span>
            {status.open
              ? `Deschis ${status.untilLabel}`
              : status.untilLabel.replace(/^se deschide\s*/i, 'Se deschide ')}
          </span>
        </span>
      </button>
      <a
        className="nearest__maps"
        href={maps}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        Cum ajung
      </a>
    </div>
  );
}
