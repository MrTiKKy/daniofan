'use client';
/* Shell public: BottomNav + panouri Program / Locații (identic pe home și viewer). */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getSettings, getStores } from '@/lib/catalogStore';
import type { PublicContactSettings, StoreLocation } from '@/lib/storeTypes';
import { DEFAULT_CONTACT_SETTINGS } from '@/lib/storeTypes';
import BottomNav, { type BottomNavId } from './BottomNav';
import LocationsSheet from './LocationsSheet';
import ProgramSheet from './ProgramSheet';

interface ChromeApi {
  openLocations: () => void;
  openProgram: () => void;
}

const ChromeCtx = createContext<ChromeApi | null>(null);

export function usePublicChrome(): ChromeApi {
  const ctx = useContext(ChromeCtx);
  if (!ctx) {
    return {
      openLocations: () => {},
      openProgram: () => {},
    };
  }
  return ctx;
}

interface Props {
  activeNav: 'reviste' | 'program' | 'locatii';
  children: React.ReactNode;
}

export default function PublicChrome({ activeNav, children }: Props) {
  const [sheet, setSheet] = useState<'program' | 'locatii' | null>(null);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [settings, setSettings] = useState<PublicContactSettings>(DEFAULT_CONTACT_SETTINGS);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [s, conf] = await Promise.all([getStores(), getSettings()]);
      if (!alive) return;
      setStores(s);
      setSettings(conf);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('has-bottom-nav');
    return () => document.documentElement.classList.remove('has-bottom-nav');
  }, []);

  const closeSheet = useCallback(() => setSheet(null), []);
  const openLocations = useCallback(() => setSheet('locatii'), []);
  const openProgram = useCallback(() => setSheet('program'), []);

  const api = useMemo(
    () => ({ openLocations, openProgram }),
    [openLocations, openProgram],
  );

  const navActive: BottomNavId =
    sheet === 'program' ? 'program'
      : sheet === 'locatii' ? 'locatii'
        : activeNav;

  return (
    <ChromeCtx.Provider value={api}>
      <div className="public-chrome">
        <div className="public-chrome__body">{children}</div>
        <BottomNav
          active={navActive}
          whatsappNumber={settings.whatsappNumber}
          whatsappMessage={settings.whatsappMessage}
          onProgram={openProgram}
          onLocations={openLocations}
        />
        <ProgramSheet
          open={sheet === 'program'}
          onClose={closeSheet}
          stores={stores}
          now={now ?? undefined}
        />
        <LocationsSheet
          open={sheet === 'locatii'}
          onClose={closeSheet}
          stores={stores}
          now={now ?? undefined}
        />
      </div>
    </ChromeCtx.Provider>
  );
}
