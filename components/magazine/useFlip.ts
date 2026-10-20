/* Navigare pe spread-uri: swipe/slide orizontal, taste, URL ?pagina=N. */
'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const SWIPE_PX = 40;
const FLIP_MS = 320; /* slide orizontal */
const VELOCITY = 0.45; /* px/ms */
const SPREAD_MQ = '(min-width: 900px), (orientation: landscape) and (min-width: 700px)';

export type MagView = { pages: number[] }; /* 1-based */

export function buildViews(pageCount: number, spread: boolean): MagView[] {
  if (pageCount <= 0) return [];
  if (!spread) {
    return Array.from({ length: pageCount }, (_, i) => ({ pages: [i + 1] }));
  }
  const views: MagView[] = [{ pages: [1] }];
  for (let p = 2; p <= pageCount; p += 2) {
    if (p + 1 <= pageCount) views.push({ pages: [p, p + 1] });
    else views.push({ pages: [p] });
  }
  return views;
}

export function viewIndexForPage(views: MagView[], page1: number): number {
  const i = views.findIndex((v) => v.pages.includes(page1));
  return i < 0 ? 0 : i;
}

export function counterLabel(view: MagView | undefined, total: number): string {
  if (!view?.pages.length || !total) return '';
  if (view.pages.length === 2) return `${view.pages[0]}-${view.pages[1]} / ${total}`;
  return `${view.pages[0]} / ${total}`;
}

function readPageFromUrl(): number | null {
  if (typeof window === 'undefined') return null;
  const n = Number(new URLSearchParams(window.location.search).get('pagina'));
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

function writePageUrl(page1: number, mode: 'replace' | 'push') {
  const url = new URL(window.location.href);
  url.searchParams.set('pagina', String(page1));
  const href = url.pathname + url.search + url.hash;
  if (mode === 'push') history.pushState({ pagina: page1 }, '', href);
  else history.replaceState({ pagina: page1 }, '', href);
}

export function useFlip(pageCount: number) {
  const [spread, setSpread] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(SPREAD_MQ).matches,
  );
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [viewIndex, setViewIndex] = useState(0);
  const [dragProgress, setDragProgress] = useState(0); /* -1..1 */
  const [flipping, setFlipping] = useState<'next' | 'prev' | null>(null);

  const views = useMemo(() => buildViews(pageCount, spread), [pageCount, spread]);
  const viewCount = views.length;
  const safeIndex = Math.min(viewIndex, Math.max(0, viewCount - 1));
  const view = views[safeIndex];
  const currentPage = view?.pages[view.pages.length - 1] ?? 1;

  const dragRef = useRef({
    active: false, x0: 0, y0: 0, t0: 0, dx: 0, axis: null as null | 'x' | 'y',
  });
  const flipTimer = useRef(0);
  const skipUrl = useRef(false);
  const zoomBlock = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(SPREAD_MQ);
    const onMq = () => setSpread(mq.matches);
    mq.addEventListener('change', onMq);
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onRm = () => setReduced(rm.matches);
    rm.addEventListener('change', onRm);
    return () => { mq.removeEventListener('change', onMq); rm.removeEventListener('change', onRm); };
  }, []);

  /* URL inițial + Back/Forward (setState în microtask ca să nu fie sync-in-effect) */
  useEffect(() => {
    if (!pageCount) return;
    const fromUrl = readPageFromUrl();
    const page = Math.min(Math.max(fromUrl || 1, 1), pageCount);
    const idx = viewIndexForPage(views, page);
    skipUrl.current = true;
    queueMicrotask(() => {
      setViewIndex(idx);
      if (!fromUrl) writePageUrl(views[idx]?.pages[0] ?? 1, 'replace');
    });

    const onPop = () => {
      const p = readPageFromUrl() || 1;
      skipUrl.current = true;
      setViewIndex(viewIndexForPage(buildViews(pageCount, spread), Math.min(p, pageCount)));
      setDragProgress(0);
      setFlipping(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount, spread]);

  const goToView = useCallback((idx: number, opts?: { url?: 'push' | 'replace' | 'none' }) => {
    const next = Math.max(0, Math.min(viewCount - 1, idx));
    const mode = opts?.url ?? 'push';
    window.clearTimeout(flipTimer.current);
    setFlipping(null);
    setDragProgress(0);
    skipUrl.current = true;
    setViewIndex(next);
    const p = views[next]?.pages[0];
    if (p && mode !== 'none') writePageUrl(p, mode === 'replace' ? 'replace' : 'push');
  }, [viewCount, views]);

  /** Salt direct (cuprins / căutare) — fără animație. page1 = 1-based */
  const jumpToPage = useCallback((page1: number) => {
    const p = Math.min(Math.max(page1, 1), pageCount);
    goToView(viewIndexForPage(views, p), { url: 'push' });
  }, [goToView, pageCount, views]);

  const animateTo = useCallback((dir: 'next' | 'prev') => {
    if (flipping || zoomBlock.current) return;
    const target = dir === 'next' ? safeIndex + 1 : safeIndex - 1;
    if (target < 0 || target >= viewCount) { setDragProgress(0); return; }

    if (reduced) {
      goToView(target, { url: 'push' });
      return;
    }

    setFlipping(dir);
    setDragProgress(dir === 'next' ? -1 : 1);
    window.clearTimeout(flipTimer.current);
    flipTimer.current = window.setTimeout(() => {
      goToView(target, { url: 'push' });
      setFlipping(null);
    }, FLIP_MS);
  }, [flipping, reduced, safeIndex, viewCount, goToView]);

  const next = useCallback(() => animateTo('next'), [animateTo]);
  const prev = useCallback(() => animateTo('prev'), [animateTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const setZoomBlocked = useCallback((v: boolean) => { zoomBlock.current = v; }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (zoomBlock.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('a, button, input, textarea')) return;
    dragRef.current = { active: true, x0: e.clientX, y0: e.clientY, t0: performance.now(), dx: 0, axis: null };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d.active || flipping) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }
    if (d.axis !== 'x') return;
    d.dx = dx;
    const w = e.currentTarget.clientWidth || 320;
    setDragProgress(Math.max(-1, Math.min(1, dx / (w * 0.55))));
  }, [flipping]);

  const endDrag = useCallback(() => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    if (d.axis === 'x') {
      const dt = Math.max(1, performance.now() - d.t0);
      const vel = d.dx / dt;
      if (d.dx <= -SWIPE_PX || vel < -VELOCITY) animateTo('next');
      else if (d.dx >= SWIPE_PX || vel > VELOCITY) animateTo('prev');
      else setDragProgress(0);
    } else setDragProgress(0);
    d.dx = 0;
    d.axis = null;
  }, [animateTo]);

  const visiblePageSet = useMemo(() => {
    const set = new Set<number>();
    const add = (v?: MagView) => v?.pages.forEach((p) => set.add(p));
    add(views[safeIndex]);
    add(views[safeIndex - 1]);
    add(views[safeIndex + 1]);
    return set;
  }, [views, safeIndex]);

  return {
    spread,
    reduced,
    views,
    view,
    viewIndex: safeIndex,
    viewCount,
    pageCount,
    currentPage,
    dragProgress,
    flipping,
    flipMs: FLIP_MS,
    label: counterLabel(view, pageCount),
    progress: pageCount ? currentPage / pageCount : 0,
    visiblePageSet,
    next,
    prev,
    jumpToPage,
    goToView,
    setZoomBlocked,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
