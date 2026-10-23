/* Gesturi swipe + tap pe margini + taste + ?pagina=N|final (replaceState). */
'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const EDGE_FRAC = 0.2;
const THRESHOLD_FRAC = 0.25;
const VELOCITY = 0.5; /* px/ms */
const SLIDE_MS = 300;
const RUBBER = 0.35;
const TAP_MAX_MOVE = 12;

export type MagView = {
  /** 1-based; gol pe slide-ul final */
  pages: number[];
  end?: boolean;
};

export function buildViews(pageCount: number, includeEnd = false): MagView[] {
  if (pageCount <= 0) return [];
  const views: MagView[] = Array.from({ length: pageCount }, (_, i) => ({
    pages: [i + 1],
  }));
  if (includeEnd) views.push({ pages: [], end: true });
  return views;
}

type UrlTarget = { type: 'unset' } | { type: 'page'; n: number } | { type: 'final' };

function readPageFromUrl(): UrlTarget {
  if (typeof window === 'undefined') return { type: 'unset' };
  if (!new URLSearchParams(window.location.search).has('pagina')) {
    return { type: 'unset' };
  }
  const raw = new URLSearchParams(window.location.search).get('pagina');
  if (raw === 'final') return { type: 'final' };
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1) return { type: 'page', n: Math.floor(n) };
  return { type: 'unset' };
}

function writePageUrl(target: number | 'final') {
  const url = new URL(window.location.href);
  url.searchParams.set('pagina', target === 'final' ? 'final' : String(target));
  const href = url.pathname + url.search + url.hash;
  history.replaceState({ pagina: target }, '', href);
}

function urlToIndex(target: UrlTarget, pageCount: number, includeEnd: boolean): number {
  if (pageCount <= 0) return 0;
  if (target.type === 'final' && includeEnd) return pageCount; /* indexul slide-ului end */
  if (target.type === 'page') {
    return Math.min(Math.max(target.n, 1), pageCount) - 1;
  }
  return 0;
}

export interface PageSwipeApi {
  views: MagView[];
  view: MagView | undefined;
  viewIndex: number;
  /** Doar paginile revistei (fără EndPage) */
  pageCount: number;
  /** Pagina 1-based; pe EndPage = pageCount (pentru progres plin) */
  page: number;
  isEnd: boolean;
  dragProgress: number;
  flipping: 'next' | 'prev' | null;
  flipMs: number;
  reduced: boolean;
  next: () => void;
  prev: () => void;
  goToPage: (page1: number) => void;
  goToEnd: () => void;
  onUserGesture: (cb: () => void) => () => void;
  handlers: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  };
}

export function usePageSwipe(pageCount: number, includeEnd = false): PageSwipeApi {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [viewIndex, setViewIndex] = useState(0);
  const [dragProgress, setDragProgress] = useState(0);
  const [flipping, setFlipping] = useState<'next' | 'prev' | null>(null);

  const views = useMemo(
    () => buildViews(pageCount, includeEnd),
    [pageCount, includeEnd],
  );
  const viewCount = views.length;
  const safeIndex = Math.min(viewIndex, Math.max(0, viewCount - 1));
  const view = views[safeIndex];
  const isEnd = !!view?.end;
  const page = isEnd
    ? pageCount
    : (view?.pages[0] ?? 1);

  const dragRef = useRef({
    active: false,
    x0: 0,
    y0: 0,
    t0: 0,
    dx: 0,
    axis: null as null | 'x' | 'y',
    width: 320,
  });
  const flipTimer = useRef(0);
  const gestureListeners = useRef(new Set<() => void>());

  const notifyGesture = useCallback(() => {
    gestureListeners.current.forEach((cb) => cb());
  }, []);

  const onUserGesture = useCallback((cb: () => void) => {
    gestureListeners.current.add(cb);
    return () => { gestureListeners.current.delete(cb); };
  }, []);

  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onRm = () => setReduced(rm.matches);
    rm.addEventListener('change', onRm);
    return () => rm.removeEventListener('change', onRm);
  }, []);

  useEffect(() => {
    if (!pageCount) return;
    const fromUrl = readPageFromUrl();
    const idx = urlToIndex(fromUrl, pageCount, includeEnd);
    queueMicrotask(() => {
      setViewIndex(idx);
      const v = buildViews(pageCount, includeEnd)[idx];
      if (v?.end) writePageUrl('final');
      else if (v?.pages[0]) writePageUrl(v.pages[0]);
    });

    const onPop = () => {
      const next = readPageFromUrl();
      setViewIndex(urlToIndex(next, pageCount, includeEnd));
      setDragProgress(0);
      setFlipping(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [pageCount, includeEnd]);

  const goToView = useCallback((idx: number) => {
    const next = Math.max(0, Math.min(viewCount - 1, idx));
    window.clearTimeout(flipTimer.current);
    setFlipping(null);
    setDragProgress(0);
    setViewIndex(next);
    const v = views[next];
    if (v?.end) writePageUrl('final');
    else if (v?.pages[0]) writePageUrl(v.pages[0]);
  }, [viewCount, views]);

  const goToPage = useCallback((page1: number) => {
    const p = Math.min(Math.max(page1, 1), pageCount);
    goToView(p - 1);
    notifyGesture();
  }, [goToView, pageCount, notifyGesture]);

  const goToEnd = useCallback(() => {
    if (!includeEnd || pageCount <= 0) return;
    goToView(pageCount);
    notifyGesture();
  }, [includeEnd, pageCount, goToView, notifyGesture]);

  const animateTo = useCallback((dir: 'next' | 'prev') => {
    if (flipping) return;
    const target = dir === 'next' ? safeIndex + 1 : safeIndex - 1;
    if (target < 0 || target >= viewCount) {
      setDragProgress(0);
      return;
    }
    notifyGesture();
    if (reduced) {
      goToView(target);
      return;
    }
    setFlipping(dir);
    setDragProgress(dir === 'next' ? -1 : 1);
    window.clearTimeout(flipTimer.current);
    flipTimer.current = window.setTimeout(() => {
      goToView(target);
      setFlipping(null);
    }, SLIDE_MS);
  }, [flipping, reduced, safeIndex, viewCount, goToView, notifyGesture]);

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

  const rubberProgress = useCallback((dx: number, width: number, index: number, count: number) => {
    let raw = dx / width;
    if ((index <= 0 && raw > 0) || (index >= count - 1 && raw < 0)) {
      raw *= RUBBER;
    }
    return Math.max(-1.15, Math.min(1.15, raw));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('a, button, input, textarea, [data-viewer-chrome]')) return;
    dragRef.current = {
      active: true,
      x0: e.clientX,
      y0: e.clientY,
      t0: performance.now(),
      dx: 0,
      axis: null,
      width: e.currentTarget.clientWidth || 320,
    };
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
    setDragProgress(rubberProgress(dx, d.width, safeIndex, viewCount));
  }, [flipping, rubberProgress, safeIndex, viewCount]);

  const endPointer = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    const dx = d.dx;
    const abs = Math.abs(dx);
    const dt = Math.max(1, performance.now() - d.t0);
    const vel = dx / dt;
    const w = d.width;

    if (d.axis === 'x') {
      const crossed = abs >= w * THRESHOLD_FRAC || Math.abs(vel) > VELOCITY;
      if (crossed && (dx < 0 || vel < -VELOCITY)) animateTo('next');
      else if (crossed && (dx > 0 || vel > VELOCITY)) animateTo('prev');
      else setDragProgress(0);
    } else if (d.axis === null && abs < TAP_MAX_MOVE && Math.abs(e.clientY - d.y0) < TAP_MAX_MOVE) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const edge = rect.width * EDGE_FRAC;
      if (x <= edge) prev();
      else if (x >= rect.width - edge) next();
      else notifyGesture();
    } else {
      setDragProgress(0);
    }
    d.dx = 0;
    d.axis = null;
  }, [animateTo, next, prev, notifyGesture]);

  return {
    views,
    view,
    viewIndex: safeIndex,
    pageCount,
    page,
    isEnd,
    dragProgress,
    flipping,
    flipMs: SLIDE_MS,
    reduced,
    next,
    prev,
    goToPage,
    goToEnd,
    onUserGesture,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
    },
  };
}
