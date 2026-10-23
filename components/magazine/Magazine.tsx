/* Viewer: foaie + swipe + chrome + cuprins + EndPage + CoverIntro. */
'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getOtherActiveMagazine,
  type HomeMagazineSlot,
} from '@/lib/catalogStore';
import {
  loadPublishedMagazine,
  MAGAZINE_PUBLISHED_EVENT,
  MAGAZINE_PUBLISHED_KEY,
} from '@/lib/magazineBuilderStore';
import type { CatalogPage, MagazineKind } from '@/lib/catalogTypes';
import type { OfferData } from '@/lib/types';
import { collapseAllSteppers } from '@/components/list/ActiveStepperContext';
import CoverIntro, { urlHasExplicitPagina } from './CoverIntro';
import PagesSheet from './PagesSheet';
import Spread from './Spread';
import SwipeHint from './SwipeHint';
import ViewerTopBar from './ViewerTopBar';
import { buildCatalogMagazinePages, buildMagazinePages } from './PageLayouts';
import { usePageSwipe } from './usePageSwipe';

interface Props {
  data: OfferData;
  at: Date;
  catalogPages?: CatalogPage[] | null;
  initialHighlightId?: string | null;
  title?: string;
  period?: string;
  showChrome?: boolean;
  /** Tipul revistei — pentru intro session + cealaltă revistă */
  kind?: MagazineKind;
  /** Sfârșitul ofertei (pentru banda „Mai sunt X zile”) */
  offerEnd?: Date | null;
}

const JUMP_FADE_MS = 200;

function daysLeftInclusive(end: Date, now: Date): number {
  const e = new Date(end);
  e.setHours(23, 59, 59, 999);
  const n = new Date(now);
  n.setHours(0, 0, 0, 0);
  const startOfEnd = new Date(e);
  startOfEnd.setHours(0, 0, 0, 0);
  return Math.round((startOfEnd.getTime() - n.getTime()) / 86400000);
}

type JumpTarget = number | 'final';

export default function Magazine({
  data, at, catalogPages, initialHighlightId,
  title, period, showChrome, kind, offerEnd,
}: Props) {
  const [publishedPages, setPublishedPages] = useState<CatalogPage[] | null>(null);
  const [peeking, setPeeking] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [jumpFade, setJumpFade] = useState(false);
  const [otherMag, setOtherMag] = useState<HomeMagazineSlot | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [introDone, setIntroDone] = useState(false);
  const [introEnabled] = useState(() => {
    if (!showChrome || !kind) return false;
    if (typeof window === 'undefined') return false;
    return !urlHasExplicitPagina();
  });
  const fadeTimer = useRef(0);
  const pendingJump = useRef<JumpTarget | null>(null);
  const useOverride = catalogPages !== undefined;
  const chrome = !!showChrome;

  useEffect(() => {
    if (useOverride) return;
    const refresh = () => {
      const pub = loadPublishedMagazine();
      setPublishedPages(pub?.pages?.length ? pub.pages : null);
    };
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === MAGAZINE_PUBLISHED_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(MAGAZINE_PUBLISHED_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(MAGAZINE_PUBLISHED_EVENT, refresh);
    };
  }, [useOverride]);

  useEffect(() => () => window.clearTimeout(fadeTimer.current), []);

  useEffect(() => {
    if (!chrome || !kind) return;
    let alive = true;
    void (async () => {
      const other = await getOtherActiveMagazine(kind, at);
      if (alive) setOtherMag(other);
    })();
    setShareUrl(`${window.location.origin}/revista/${kind}`);
    return () => { alive = false; };
  }, [chrome, kind, at]);

  const pages = useMemo(() => {
    if (useOverride) {
      if (catalogPages?.length) {
        return buildCatalogMagazinePages(catalogPages, data.products);
      }
      return buildMagazinePages(data, at);
    }
    if (publishedPages?.length) {
      return buildCatalogMagazinePages(publishedPages, data.products);
    }
    return buildMagazinePages(data, at);
  }, [useOverride, catalogPages, publishedPages, data, at]);

  const swipe = usePageSwipe(pages.length, chrome);
  const { goToPage, goToEnd, reduced, isEnd, pageCount } = swipe;

  const daysLeft = useMemo(() => {
    if (!offerEnd) return null;
    return daysLeftInclusive(offerEnd, at);
  }, [offerEnd, at]);

  const onUserGesture = swipe.onUserGesture;
  const dismissHint = useCallback(() => {}, []);
  const openPages = useCallback(() => {
    collapseAllSteppers();
    setPagesOpen(true);
  }, []);
  const closePages = useCallback(() => setPagesOpen(false), []);

  /* swipe / schimbare pagină → strânge HeartStepper */
  useEffect(() => {
    return onUserGesture(() => collapseAllSteppers());
  }, [onUserGesture]);

  const jumpTo = useCallback((target: JumpTarget) => {
    pendingJump.current = target;
    setPagesOpen(false);
  }, []);

  const jumpToPage = useCallback((page1: number) => jumpTo(page1), [jumpTo]);
  const jumpToEnd = useCallback(() => jumpTo('final'), [jumpTo]);

  useEffect(() => {
    if (pagesOpen) return;
    if (pendingJump.current == null) return;

    let applied = false;
    const apply = () => {
      if (applied) return;
      const target = pendingJump.current;
      if (target == null) return;
      applied = true;
      pendingJump.current = null;
      if (target === 'final') goToEnd();
      else goToPage(target);
      if (reduced) return;
      setJumpFade(true);
      window.clearTimeout(fadeTimer.current);
      fadeTimer.current = window.setTimeout(() => setJumpFade(false), JUMP_FADE_MS);
    };

    const onPop = () => { queueMicrotask(apply); };
    window.addEventListener('popstate', onPop);
    const fallback = window.setTimeout(apply, 100);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.clearTimeout(fallback);
    };
  }, [pagesOpen, goToPage, goToEnd, reduced]);

  const backToFirst = useCallback(() => {
    goToPage(1);
    if (reduced) return;
    setJumpFade(true);
    window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => setJumpFade(false), JUMP_FADE_MS);
  }, [goToPage, reduced]);

  const onIntroDone = useCallback(() => setIntroDone(true), []);

  /* Dacă intro-ul e dezactivat, consideră-l gata imediat */
  useEffect(() => {
    if (!introEnabled) setIntroDone(true);
  }, [introEnabled]);

  const hintActive = chrome && pageCount > 1 && !isEnd && introDone;

  const stage = (
    <div
      className={
        'mag__stage'
        + (peeking && !reduced ? ' is-peek' : '')
        + (swipe.dragProgress !== 0 || swipe.flipping ? ' is-dragging' : '')
        + (jumpFade ? ' is-jump-fade' : '')
      }
      onPointerDown={swipe.handlers.onPointerDown}
      onPointerMove={swipe.handlers.onPointerMove}
      onPointerUp={swipe.handlers.onPointerUp}
      onPointerCancel={swipe.handlers.onPointerCancel}
    >
      {swipe.view ? (
        <Spread
          pages={pages}
          views={swipe.views}
          viewIndex={swipe.viewIndex}
          dragProgress={swipe.dragProgress}
          flipping={swipe.flipping}
          flipMs={swipe.flipMs}
          reduced={reduced}
          handlers={{
            highlightId: initialHighlightId ?? null,
            showHeart: chrome && !!kind,
            magazineType: kind,
          }}
          allProducts={data.products}
          endPage={chrome ? {
            title: title || 'Revista',
            period: period || '',
            daysLeft,
            otherMagazine: otherMag,
            shareUrl,
            onBackToFirst: backToFirst,
          } : null}
        />
      ) : null}

      {chrome ? (
        <SwipeHint
          active={hintActive}
          reducedMotion={reduced}
          onDismiss={dismissHint}
          onPeekChange={setPeeking}
          registerGesture={onUserGesture}
        />
      ) : null}
    </div>
  );

  return (
    <section
      className={'mag' + (chrome ? ' mag--chrome' : '')}
      aria-label="Revista ofertelor"
      data-highlight={initialHighlightId || undefined}
    >
      {chrome ? (
        <ViewerTopBar
          title={title || 'Revista'}
          period={period || ''}
          page={isEnd ? pageCount : swipe.page}
          pageCount={pageCount}
          isEnd={isEnd}
          onGoToPage={goToPage}
          onOpenPages={openPages}
        />
      ) : null}

      {chrome && kind && introEnabled ? (
        <CoverIntro
          kind={kind}
          enabled={introEnabled}
          reducedMotion={reduced}
          onDone={onIntroDone}
        >
          {stage}
        </CoverIntro>
      ) : stage}

      {chrome ? (
        <PagesSheet
          open={pagesOpen}
          onClose={closePages}
          title={title || 'Revista'}
          pages={pages}
          currentPage={isEnd ? pageCount : swipe.page}
          isOnEnd={isEnd}
          allProducts={data.products}
          onSelectPage={jumpToPage}
          onSelectEnd={jumpToEnd}
        />
      ) : null}
    </section>
  );
}
