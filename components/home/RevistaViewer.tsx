'use client';
/* Intrare viewer /revista/[tip] — chrome + foaie + swipe + BottomNav. */
import { useEffect, useMemo, useState } from 'react';
import { getPublishedByKind, parseCatalogDay } from '@/lib/catalogStore';
import type { CatalogPage, MagazineKind } from '@/lib/catalogTypes';
import * as DF from '@/lib/store';
import type { OfferData } from '@/lib/types';
import Magazine from '@/components/magazine/Magazine';
import PublicChrome from '@/components/public/PublicChrome';

interface Props {
  tip: MagazineKind;
}

export default function RevistaViewer({ tip }: Props) {
  const [data, setData] = useState<OfferData | null>(null);
  const [pages, setPages] = useState<CatalogPage[] | null>(null);
  const [title, setTitle] = useState('Revista');
  const [period, setPeriod] = useState('');
  const [offerEnd, setOfferEnd] = useState<Date | null>(null);
  const [ready, setReady] = useState(false);
  const [at, setAt] = useState<Date | null>(null);
  const [highlightSlotId, setHighlightSlotId] = useState<string | null>(null);
  const [boot, setBoot] = useState(false);

  useEffect(() => {
    setAt(new Date());
    const produs = new URLSearchParams(window.location.search).get('produs');
    if (produs) setHighlightSlotId(produs);
    setBoot(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('has-viewer');
    return () => {
      root.classList.remove('has-viewer');
      root.classList.remove('cover-intro-active', 'cover-intro-page', 'cover-intro-chrome');
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [offer, catalog] = await Promise.all([DF.load(), getPublishedByKind(tip)]);
      if (!alive) return;
      setData(offer);
      setPages(catalog?.pages?.length ? catalog.pages : []);
      if (catalog) {
        setTitle(catalog.title?.trim() || 'Revista');
        const start = parseCatalogDay(catalog.start);
        const end = parseCatalogDay(catalog.end);
        setPeriod(DF.fmtRange(start, end));
        setOfferEnd(end);
      } else {
        const o = DF.resolveOffer(offer, new Date());
        setTitle(o.title);
        setPeriod(DF.fmtRange(o.start, o.end));
        setOfferEnd(o.end);
      }
      document.body.dataset.theme = catalog?.theme || offer.offer.theme || 'standard';
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [tip]);

  const chromeTitle = useMemo(() => title, [title]);

  if (!ready || !data || !at || !boot) {
    return (
      <PublicChrome activeNav="reviste">
        <div className="home__loading revista-loading">Se deschide revista…</div>
      </PublicChrome>
    );
  }

  return (
    <PublicChrome activeNav="reviste">
      <main className="revista" aria-label="Revista">
        <Magazine
          key={highlightSlotId ? `hl-${highlightSlotId}` : `mag-${tip}`}
          data={data}
          at={at}
          catalogPages={pages}
          initialHighlightId={highlightSlotId}
          showChrome
          title={chromeTitle}
          period={period}
          kind={tip}
          offerEnd={offerEnd}
        />
      </main>
    </PublicChrome>
  );
}
