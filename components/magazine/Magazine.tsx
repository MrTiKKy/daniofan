/* Vizualizator revistă tip Lidl — design Daniofan. */
'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as DF from '@/lib/store';
import type { OfferData, Product } from '@/lib/types';
import ProductModal from './ProductModal';
import SearchPanel from './SearchPanel';
import Spread from './Spread';
import TocPanel from './TocPanel';
import { buildMagazinePages, pageProductIds } from './PageLayouts';
import { useFlip } from './useFlip';
import { useZoom } from './useZoom';

interface Props {
  data: OfferData;
  at: Date;
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {dir === 'left'
        ? <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

function pageLink(page1: number): string {
  const url = new URL(window.location.href);
  url.searchParams.set('pagina', String(page1));
  return url.toString();
}

export default function Magazine({ data, at }: Props) {
  const pages = useMemo(() => buildMagazinePages(data, at), [data, at]);
  const offer = useMemo(() => DF.resolveOffer(data, at), [data, at]);
  const flip = useFlip(pages.length);
  const zoom = useZoom(flip.setZoomBlocked);

  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const tracked = useRef(new Set<string>());
  const highlightT = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);

  /* reset zoom la răsfoire */
  useEffect(() => {
    zoom.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flip.viewIndex]);

  /* tracking vizualizări */
  useEffect(() => {
    const ids: string[] = [];
    flip.view?.pages.forEach((p) => ids.push(...pageProductIds(pages[p - 1])));
    const t = window.setTimeout(() => {
      ids.forEach((id) => {
        if (tracked.current.has(id)) return;
        tracked.current.add(id);
        DF.track('view', id);
      });
    }, 1000);
    return () => window.clearTimeout(t);
  }, [flip.view, pages]);

  const onProduct = useCallback((p: Product) => {
    if (zoom.active) return;
    setModalProduct(p);
  }, [zoom.active]);

  const jumpHighlight = useCallback((page1: number, productId?: string) => {
    flip.jumpToPage(page1);
    if (productId) {
      setHighlightId(productId);
      window.clearTimeout(highlightT.current);
      highlightT.current = window.setTimeout(() => setHighlightId(null), 2000);
    }
  }, [flip]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  const sharePage = flip.view?.pages[0] ?? 1;
  const shareUrl = typeof window !== 'undefined' ? pageLink(sharePage) : '';

  const doShare = async (kind: 'native' | 'wa' | 'fb' | 'copy') => {
    const url = pageLink(sharePage);
    const title = `${offer.title} — Daniofan Market`;
    setShareOpen(false);
    if (kind === 'native' && typeof navigator.share === 'function') {
      try { await navigator.share({ title, url }); } catch { /* anulat */ }
      return;
    }
    if (kind === 'wa') {
      window.open('https://wa.me/?text=' + encodeURIComponent(title + ' ' + url), '_blank', 'noopener');
      return;
    }
    if (kind === 'fb') {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copiat');
    } catch {
      showToast('Nu s-a putut copia');
    }
  };

  const openShare = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      void doShare('native');
      return;
    }
    setShareOpen((v) => !v);
  };

  /* pointer: flip pe zonă goală; zoom pe dublu-tap (useZoom) — combinăm fără conflict pe drag */
  const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom.active) zoom.handlers.onPointerDown(e);
    else flip.handlers.onPointerDown(e);
  };
  const onStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom.active) zoom.handlers.onPointerMove(e);
    else flip.handlers.onPointerMove(e);
  };
  const onStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom.active) zoom.handlers.onPointerUp(e);
    else {
      flip.handlers.onPointerUp();
      zoom.handlers.onPointerUp(e);
    }
  };

  const tocWide = tocOpen;

  return (
    <section className={'mag' + (tocWide ? ' mag--toc-open' : '')} aria-label="Revista ofertelor">
      <div className="mag__bar" role="toolbar" aria-label="Controale revistă">
        <div className="mag__bar-in">
          <span className="mag__bar-spacer" aria-hidden />
          <button type="button" className="mag__counter" onClick={() => { setTocOpen(true); setSearchOpen(false); }}>
            {flip.label || '…'}
          </button>
          <div className="mag__bar-actions">
            <button type="button" className="mag__tool" onClick={() => { setSearchOpen(true); setTocOpen(false); }}>Caută</button>
            <button type="button" className="mag__tool" onClick={() => { setTocOpen(true); setSearchOpen(false); }}>Cuprins</button>
            <div className="mag__share-wrap">
              <button type="button" className="mag__tool" onClick={openShare} aria-expanded={shareOpen}>Distribuie</button>
              {shareOpen ? (
                <div className="mag__share-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => void doShare('fb')}>Facebook</button>
                  <button type="button" role="menuitem" onClick={() => void doShare('wa')}>WhatsApp</button>
                  <button type="button" role="menuitem" onClick={() => void doShare('copy')}>Copiază link</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mag__progress" aria-hidden>
          <div className="mag__progress-fill" style={{ width: `${Math.round(flip.progress * 100)}%` }} />
        </div>
      </div>

      <div className="mag__workspace">
        <div className="mag__viewport">
          <button
            type="button"
            className="mag__nav mag__nav--prev"
            aria-label="Pagina anterioară"
            disabled={flip.viewIndex <= 0 || zoom.active}
            onClick={flip.prev}
          >
            <Chevron dir="left" />
          </button>

          <div
            className={'mag__stage' + (zoom.active ? ' is-zoomed' : '')}
            ref={stageRef}
            style={zoom.style}
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
            onPointerUp={onStagePointerUp}
            onPointerCancel={() => { flip.handlers.onPointerCancel(); zoom.handlers.onPointerCancel(); }}
            onTouchStart={zoom.handlers.onTouchStart}
            onTouchMove={zoom.handlers.onTouchMove}
            onTouchEnd={zoom.handlers.onTouchEnd}
          >
            {flip.view ? (
              <Spread
                pages={pages}
                view={flip.view}
                views={flip.views}
                viewIndex={flip.viewIndex}
                dragProgress={flip.dragProgress}
                flipping={flip.flipping}
                flipMs={flip.flipMs}
                reduced={flip.reduced}
                handlers={{ onProduct, highlightId }}
              />
            ) : null}
          </div>

          <button
            type="button"
            className="mag__nav mag__nav--next"
            aria-label="Pagina următoare"
            disabled={flip.viewIndex >= flip.viewCount - 1 || zoom.active}
            onClick={flip.next}
          >
            <Chevron dir="right" />
          </button>
        </div>

        {zoom.active ? (
          <button type="button" className="mag__zoom-close" onClick={zoom.reset}>Închide zoom</button>
        ) : null}
      </div>

      <TocPanel
        open={tocOpen}
        pages={pages}
        views={flip.views}
        viewIndex={flip.viewIndex}
        onClose={() => setTocOpen(false)}
        onJump={(p) => jumpHighlight(p)}
      />
      <SearchPanel
        open={searchOpen}
        pages={pages}
        onClose={() => setSearchOpen(false)}
        onJump={(p, id) => jumpHighlight(p, id)}
      />

      {modalProduct ? (
        <ProductModal
          product={modalProduct}
          data={data}
          offer={offer}
          pageUrl={shareUrl || pageLink(findPageOf(pages, modalProduct.id))}
          onClose={() => setModalProduct(null)}
        />
      ) : null}

      {toast ? <div className="mag__toast" role="status">{toast}</div> : null}
    </section>
  );
}

function findPageOf(pages: ReturnType<typeof buildMagazinePages>, id: string): number {
  const i = pages.findIndex((p) => pageProductIds(p).includes(id));
  return i < 0 ? 1 : i + 1;
}
