'use client';
/* Pagina de pornire publică — reviste, vitrină vedetă, bandă magazin. */
import { useEffect, useMemo, useState } from 'react';
import {
  getHomeMagazines,
  parseCatalogDay,
  type HomeMagazineSlot,
} from '@/lib/catalogStore';
import { getFeaturedSlots, type FeaturedSlot } from '@/lib/featured';
import * as DF from '@/lib/store';
import type { OfferData } from '@/lib/types';
import PublicChrome from '@/components/public/PublicChrome';
import FeaturedCarousel from './FeaturedCarousel';
import HomeHeader from './HomeHeader';
import MagazineCard from './MagazineCard';
import NearestStoreBar from './NearestStoreBar';
import NoOfferCard from './NoOfferCard';
import UrgencyBanner from './UrgencyBanner';

export default function HomePage() {
  const [slots, setSlots] = useState<HomeMagazineSlot[] | null>(null);
  const [offerData, setOfferData] = useState<OfferData | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    if (!now) return;
    let alive = true;
    void (async () => {
      const [home, data] = await Promise.all([getHomeMagazines(now), DF.load()]);
      if (!alive) return;
      setSlots(home);
      setOfferData(data);
      const theme = home.find((s) => s.active)?.catalog?.theme
        || data.offer.theme
        || 'standard';
      document.body.dataset.theme = theme;
    })();
    return () => { alive = false; };
  }, [now]);

  useEffect(() => {
    try {
      const y = sessionStorage.getItem('daniofan.home.scroll');
      if (y != null) {
        sessionStorage.removeItem('daniofan.home.scroll');
        const top = Number(y);
        if (Number.isFinite(top)) {
          requestAnimationFrame(() => window.scrollTo(0, top));
        }
      }
    } catch { /* */ }
  }, []);

  const activeSlots = useMemo(
    () => (slots || []).filter((s) => s.active && s.catalog),
    [slots],
  );

  const featured: FeaturedSlot[] = useMemo(() => {
    if (!now || !offerData || !activeSlots.length) return [];
    const sources = activeSlots
      .filter((s) => s.catalog)
      .map((s) => ({
        kind: s.kind,
        label: s.label,
        catalog: s.catalog!,
      }));
    return getFeaturedSlots(sources, offerData.products, { now, limit: 8 });
  }, [activeSlots, offerData, now]);

  const urgency = useMemo(() => {
    if (!now) return null;
    if (activeSlots.length) {
      const c = activeSlots[0].catalog!;
      return { start: parseCatalogDay(c.start), end: parseCatalogDay(c.end) };
    }
    if (offerData) {
      const o = DF.resolveOffer(offerData, now);
      return { start: o.start, end: o.end };
    }
    return null;
  }, [activeSlots, offerData, now]);

  const phone = offerData?.store.phone || '';
  const phoneLabel = offerData?.store.phoneLabel || phone;
  const noneActive = slots != null && activeSlots.length === 0;
  const loading = slots == null || now == null;

  return (
    <PublicChrome activeNav="reviste">
      <div className="home">
        <HomeHeader phone={phone} phoneLabel={phoneLabel} />
        <NearestStoreBar now={now ?? undefined} />
        {urgency && now ? <UrgencyBanner start={urgency.start} end={urgency.end} now={now} /> : null}

        <main className="home__main">
          {loading ? (
            <p className="home__loading">Se încarcă ofertele…</p>
          ) : noneActive ? (
            <NoOfferCard large />
          ) : (
            <>
              <div className="home__grid">
                {(slots || []).map((slot, i) => {
                  if (!slot.active || !slot.catalog) {
                    return (
                      <div key={slot.kind} className="home__slot">
                        <NoOfferCard />
                      </div>
                    );
                  }
                  const c = slot.catalog;
                  const first = c.pages[0]
                    ? (c.pages[0].grid ? c.pages[0] : { ...c.pages[0], grid: c.grid })
                    : null;
                  return (
                    <div key={slot.kind} className="home__slot">
                      <MagazineCard
                        kind={slot.kind}
                        title={slot.label}
                        start={parseCatalogDay(c.start)}
                        end={parseCatalogDay(c.end)}
                        coverPage={first}
                        products={offerData?.products || []}
                        priority={i === 0}
                        tilt={i === 0 ? 'left' : 'right'}
                      />
                    </div>
                  );
                })}
              </div>
              <FeaturedCarousel slots={featured} />
            </>
          )}
        </main>
      </div>
    </PublicChrome>
  );
}
