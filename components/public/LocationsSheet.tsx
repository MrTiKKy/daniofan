'use client';
import { useMemo, useState } from 'react';
import {
  haversineKm,
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

function geoErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Locația e blocată. În browser: lacătul de lângă adresă → Permisiuni → Locație → Permite, apoi încearcă din nou.';
    case err.POSITION_UNAVAILABLE:
      return 'Nu am putut determina poziția (GPS/rețea indisponibilă). Încearcă din nou afară sau cu Wi‑Fi.';
    case err.TIMEOUT:
      return 'Localizarea a durat prea mult. Încearcă din nou.';
    default:
      return 'Localizarea a eșuat. Verifică că ai permis accesul la locație pentru acest site.';
  }
}

export default function LocationsSheet({ open, onClose, stores, now }: Props) {
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [nearestId, setNearestId] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  const ordered = useMemo(() => {
    if (!userPos) return stores;
    return [...stores].sort(
      (a, b) =>
        haversineKm(userPos.lat, userPos.lng, a.lat, a.lng)
        - haversineKm(userPos.lat, userPos.lng, b.lat, b.lng),
    );
  }, [stores, userPos]);

  const askNearest = () => {
    if (!stores.length) return;
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setGeoMsg('Localizarea merge doar pe HTTPS (sau localhost).');
      return;
    }
    if (!navigator.geolocation) {
      setGeoMsg('Dispozitivul nu suportă localizarea.');
      return;
    }
    setGeoBusy(true);
    setGeoMsg('Se cere poziția…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const found = nearestStore(stores, lat, lng);
        setGeoBusy(false);
        if (!found) {
          setGeoMsg('Nu am găsit un magazin.');
          return;
        }
        const km = haversineKm(lat, lng, found.lat, found.lng);
        setPreferredStoreId(found.id);
        setNearestId(found.id);
        setUserPos({ lat, lng });
        setGeoMsg(
          km < 0.1
            ? `Cel mai apropiat: ${found.name}`
            : `Cel mai apropiat: ${found.name} (~${km < 10 ? km.toFixed(1) : Math.round(km)} km)`,
        );
      },
      (err) => {
        setGeoBusy(false);
        setGeoMsg(geoErrorMessage(err));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
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
          {ordered.map((s) => (
            <div
              key={s.id}
              className={nearestId === s.id ? 'loc-card is-nearest' : 'loc-card'}
            >
              <StoreCard store={s} now={now} />
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
