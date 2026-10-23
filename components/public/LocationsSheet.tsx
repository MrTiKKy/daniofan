'use client';
import { useState } from 'react';
import {
  nearestStore,
  setPreferredStoreId,
} from '@/lib/nearestStore';
import type { StoreLocation } from '@/lib/storeTypes';
import BottomSheet from './BottomSheet';
import StoreCard from './StoreCard';

interface Props {
  open: boolean;
  onClose: () => void;
  stores: StoreLocation[];
  now?: Date;
}

export default function LocationsSheet({ open, onClose, stores, now }: Props) {
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);

  const askNearest = () => {
    if (!stores.length) return;
    if (!navigator.geolocation) {
      setGeoMsg('Dispozitivul nu suportă localizarea.');
      return;
    }
    setGeoBusy(true);
    setGeoMsg('Se cere poziția…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const found = nearestStore(stores, pos.coords.latitude, pos.coords.longitude);
        setGeoBusy(false);
        if (!found) {
          setGeoMsg('Nu am găsit un magazin.');
          return;
        }
        setPreferredStoreId(found.id);
        setGeoMsg(`Cel mai apropiat: ${found.name}`);
      },
      () => {
        setGeoBusy(false);
        setGeoMsg('Permisiunea a fost refuzată sau localizarea a eșuat.');
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 },
    );
  };

  return (
    <BottomSheet open={open} title="Locații" onClose={onClose}>
      {stores.length === 0 ? (
        <p className="prog-empty">Magazinele apar aici după ce le adaugi în admin.</p>
      ) : (
        <div className="loc-list">
          <button
            type="button"
            className="loc-nearest-btn"
            disabled={geoBusy}
            onClick={askNearest}
          >
            📍 Arată cel mai apropiat
          </button>
          {geoMsg ? <p className="loc-nearest-msg" role="status">{geoMsg}</p> : null}
          {stores.map((s) => (
            <StoreCard key={s.id} store={s} now={now} />
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
