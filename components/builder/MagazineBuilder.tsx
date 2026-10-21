'use client';
/* Constructor revistă — panou produse, drag pe grilă, resize, zoom, bandă pagini. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canPlace } from '@/lib/collision';
import type { CatalogGrid, CatalogPage, ImageLayout, PageItem, PageItemDisplay } from '@/lib/catalogTypes';
import {
  loadMagazineBuilderDraft,
  saveMagazineBuilderDraft,
} from '@/lib/magazineBuilderStore';
import {
  displayAsProduct,
  displayImages,
  layoutLooksOverflow,
  normalizeImageLayouts,
  resolvePricePos,
  resolveTextPos,
  snapshotDisplay,
} from '@/lib/pageItemDisplay';
import * as DF from '@/lib/store';
import type { Product, ResolvedOffer } from '@/lib/types';
import ProductCell from '@/components/magazine/ProductCell';
import BuilderInspectorPanel from './BuilderInspectorPanel';
import BuilderProductPanel from './BuilderProductPanel';
import GridPickerModal from './GridPickerModal';
import MagazinePageStrip, { createEmptyPage, productCount } from './MagazinePageStrip';

interface Props {
  products: Product[];
  offer: ResolvedOffer | null;
}

const ZOOM_MIN = 0.55;
const ZOOM_MAX = 2.8;
const ZOOM_STEP = 0.0012;

type DragState = {
  product: Product;
  x: number;
  y: number;
  pointerId: number;
};

type HoverCell = { col: number; row: number; ok: boolean };

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

type ResizeState = {
  itemId: string;
  pointerId: number;
  corner: ResizeCorner;
  originCol: number;
  originRow: number;
  originW: number;
  originH: number;
  col: number;
  row: number;
  w: number;
  h: number;
  ok: boolean;
};

const RESIZE_CORNERS: ResizeCorner[] = ['nw', 'ne', 'sw', 'se'];

/** Calculează noul rect în funcție de colțul tras. */
function computeCornerResize(
  corner: ResizeCorner,
  origin: { col: number; row: number; w: number; h: number },
  endCol: number,
  endRow: number,
  grid: CatalogGrid,
): { col: number; row: number; w: number; h: number } {
  const left0 = origin.col;
  const top0 = origin.row;
  const right0 = origin.col + origin.w - 1;
  const bottom0 = origin.row + origin.h - 1;

  let left = left0;
  let top = top0;
  let right = right0;
  let bottom = bottom0;

  const ec = Math.max(0, Math.min(endCol, grid.cols - 1));
  const er = Math.max(0, Math.min(endRow, grid.rows - 1));

  if (corner === 'se') {
    right = Math.max(left0, ec);
    bottom = Math.max(top0, er);
  } else if (corner === 'sw') {
    left = Math.min(right0, ec);
    bottom = Math.max(top0, er);
  } else if (corner === 'ne') {
    right = Math.max(left0, ec);
    top = Math.min(bottom0, er);
  } else {
    left = Math.min(right0, ec);
    top = Math.min(bottom0, er);
  }

  return {
    col: left,
    row: top,
    w: Math.max(1, right - left + 1),
    h: Math.max(1, bottom - top + 1),
  };
}

/** Mutare produs deja pe pagină */
type MoveState = {
  itemId: string;
  product: Product;
  pointerId: number;
  w: number;
  h: number;
  col: number;
  row: number;
  ok: boolean;
  x: number;
  y: number;
  overTrash: boolean;
};

function pointInRect(x: number, y: number, r: DOMRect, pad = 0) {
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}

function makePageProductItem(p: Product, col: number, row: number): PageItem {
  const d = DF.discountPct(p.oldPrice, p.newPrice);
  const display = snapshotDisplay(p);
  return {
    id: `item-${crypto.randomUUID().slice(0, 8)}`,
    type: 'product',
    productId: p.id,
    col,
    row,
    w: 1,
    h: 1,
    promoPrice: +p.newPrice || undefined,
    label: d ? `-${d}%` : (p.specialLabel || undefined),
    media: p.image ? [{ imageIndex: 0, x: 0, y: 0, scale: 1 }] : [],
    mediaLayout: 'single',
    display,
  };
}

/** Celula cea mai apropiată de pointer, doar dacă e peste foaia paginii. */
function nearestCell(
  clientX: number,
  clientY: number,
  pageEl: HTMLElement,
  gridEl: HTMLElement,
  cols: number,
  rows: number,
): { col: number; row: number } | null {
  const page = pageEl.getBoundingClientRect();
  if (
    clientX < page.left || clientX > page.right
    || clientY < page.top || clientY > page.bottom
  ) {
    return null;
  }
  const r = gridEl.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  const cellW = r.width / cols;
  const cellH = r.height / rows;
  const col = Math.max(0, Math.min(cols - 1, Math.floor((clientX - r.left) / cellW)));
  const row = Math.max(0, Math.min(rows - 1, Math.floor((clientY - r.top) / cellH)));
  return { col, row };
}

export default function MagazineBuilder({ products, offer }: Props) {
  const [pages, setPages] = useState<CatalogPage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [gridPickerOpen, setGridPickerOpen] = useState(true);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<HoverCell | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [move, setMove] = useState<MoveState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** dublu-click pe casuță → mod gesturi (poze / text↔preț) */
  const [gestureId, setGestureId] = useState<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const pendingSelectRef = useRef<{
    itemId: string;
    product: Product;
    item: PageItem;
    x: number;
    y: number;
    pointerId: number;
  } | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const moveRef = useRef<MoveState | null>(null);
  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const panPosRef = useRef(pan);
  const pagesRef = useRef(pages);
  const activeIndexRef = useRef(activeIndex);

  pagesRef.current = pages;
  activeIndexRef.current = activeIndex;
  dragRef.current = drag;
  resizeRef.current = resize;
  moveRef.current = move;
  panPosRef.current = pan;

  /* hidratează din localStorage (doar pe client) */
  useEffect(() => {
    const draft = loadMagazineBuilderDraft();
    if (draft && draft.pages.length > 0) {
      setPages(draft.pages);
      setActiveIndex(draft.activeIndex);
      setGridPickerOpen(false);
    }
    setReady(true);
  }, []);

  /* persistă layout-ul în localStorage (debounce) */
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => {
      saveMagazineBuilderDraft(pages, activeIndex);
    }, 250);
    return () => window.clearTimeout(t);
  }, [pages, activeIndex, ready]);

  const usedIds = useMemo(() => {
    const s = new Set<string>();
    for (const page of pages) {
      for (const it of page.items) {
        if (it.type === 'product' && it.productId) s.add(it.productId);
      }
    }
    return s;
  }, [pages]);

  const productsById = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const openGridPicker = useCallback(() => setGridPickerOpen(true), []);

  const confirmGrid = useCallback((grid: CatalogGrid) => {
    setPages((prev) => {
      const next = [...prev, createEmptyPage(grid)];
      setActiveIndex(next.length - 1);
      return next;
    });
    setGridPickerOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const beginPagePan = useCallback((e: React.PointerEvent) => {
    if (dragRef.current || resizeRef.current || moveRef.current || panDragRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    pendingSelectRef.current = null;
    const cur = panPosRef.current;
    panDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: cur.x,
      origY: cur.y,
    };
    setPanning(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const cancelGridPicker = useCallback(() => {
    if (pages.length === 0) return;
    setGridPickerOpen(false);
  }, [pages.length]);

  const deletePage = useCallback((index: number) => {
    if (pages.length <= 1) return;
    const page = pages[index];
    const n = productCount(page);
    if (n > 0) {
      const ok = window.confirm(
        `Ștergeți pagina ${index + 1}? Conține ${n} ${n === 1 ? 'produs' : 'produse'}.`,
      );
      if (!ok) return;
    }
    const next = pages.filter((_, i) => i !== index);
    setPages(next);
    setActiveIndex((cur) => {
      if (index < cur) return cur - 1;
      if (index === cur) return Math.min(cur, next.length - 1);
      return cur;
    });
  }, [pages]);

  const updateHover = useCallback((clientX: number, clientY: number) => {
    const pageEl = pageRef.current;
    const gridEl = gridRef.current;
    const page = pagesRef.current[activeIndexRef.current];
    const g = page?.grid;
    if (!pageEl || !gridEl || !g || !page) {
      setHover(null);
      return;
    }
    const cell = nearestCell(clientX, clientY, pageEl, gridEl, g.cols, g.rows);
    if (!cell) {
      setHover(null);
      return;
    }
    const ok = canPlace({ col: cell.col, row: cell.row, w: 1, h: 1 }, g, page.items);
    setHover({ ...cell, ok });
  }, []);

  const placeProduct = useCallback((product: Product, col: number, row: number) => {
    const idx = activeIndexRef.current;
    setPages((prev) => {
      const page = prev[idx];
      if (!page?.grid) return prev;
      if (!canPlace({ col, row, w: 1, h: 1 }, page.grid, page.items)) return prev;
      if (prev.some((pg) => pg.items.some((it) => it.productId === product.id))) return prev;
      const item = makePageProductItem(product, col, row);
      return prev.map((pg, i) => (i === idx ? { ...pg, items: [...pg.items, item] } : pg));
    });
  }, []);

  const applyResize = useCallback((itemId: string, col: number, row: number, w: number, h: number) => {
    const idx = activeIndexRef.current;
    setPages((prev) => {
      const page = prev[idx];
      if (!page?.grid) return prev;
      if (!canPlace({ col, row, w, h }, page.grid, page.items, itemId)) return prev;
      return prev.map((pg, i) => (
        i === idx
          ? { ...pg, items: pg.items.map((it) => (it.id === itemId ? { ...it, col, row, w, h } : it)) }
          : pg
      ));
    });
  }, []);

  const applyMove = useCallback((itemId: string, col: number, row: number) => {
    const idx = activeIndexRef.current;
    setPages((prev) => {
      const page = prev[idx];
      if (!page?.grid) return prev;
      const item = page.items.find((it) => it.id === itemId);
      if (!item) return prev;
      if (!canPlace({ col, row, w: item.w, h: item.h }, page.grid, page.items, itemId)) return prev;
      return prev.map((pg, i) => (
        i === idx
          ? { ...pg, items: pg.items.map((it) => (it.id === itemId ? { ...it, col, row } : it)) }
          : pg
      ));
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    const idx = activeIndexRef.current;
    setPages((prev) => prev.map((pg, i) => (
      i === idx ? { ...pg, items: pg.items.filter((it) => it.id !== itemId) } : pg
    )));
    setSelectedId((cur) => (cur === itemId ? null : cur));
    setGestureId((cur) => (cur === itemId ? null : cur));
  }, []);

  const exitGesture = useCallback(() => setGestureId(null), []);

  const enterGesture = useCallback((itemId: string) => {
    pendingSelectRef.current = null;
    setSelectedId(itemId);
    setGestureId(itemId);
  }, []);

  const onDragStart = useCallback((product: Product, e: React.PointerEvent) => {
    if (e.button !== 0 || resizeRef.current || moveRef.current) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const next: DragState = {
      product,
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
    };
    setDrag(next);
    dragRef.current = next;
    updateHover(e.clientX, e.clientY);
  }, [updateHover]);

  const beginMove = useCallback((item: PageItem, product: Product, pointerId: number, x: number, y: number) => {
    const next: MoveState = {
      itemId: item.id,
      product,
      pointerId,
      w: item.w,
      h: item.h,
      col: item.col,
      row: item.row,
      ok: true,
      x,
      y,
      overTrash: false,
    };
    setMove(next);
    moveRef.current = next;
    setHover(null);
  }, []);

  const onBlockPointerDown = useCallback((item: PageItem, product: Product, e: React.PointerEvent) => {
    if (e.button !== 0 || dragRef.current || resizeRef.current || moveRef.current) return;
    /* în mod gesturi pe această casuță — lasă evenimentele la ProductCell */
    if (gestureId === item.id) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(item.id);
    if (!item.display) {
      const idx = activeIndexRef.current;
      const snap = snapshotDisplay(product);
      setPages((prev) => prev.map((pg, i) => (
        i === idx
          ? { ...pg, items: pg.items.map((it) => (it.id === item.id ? { ...it, display: snap } : it)) }
          : pg
      )));
    }
    pendingSelectRef.current = {
      itemId: item.id,
      product,
      item,
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [gestureId]);

  const patchDisplay = useCallback((itemId: string, patch: Partial<PageItemDisplay>) => {
    const idx = activeIndexRef.current;
    setPages((prev) => {
      const page = prev[idx];
      if (!page) return prev;
      return prev.map((pg, i) => {
        if (i !== idx) return pg;
        return {
          ...pg,
          items: pg.items.map((it) => {
            if (it.id !== itemId) return it;
            const src = it.productId
              ? products.find((p) => p.id === it.productId)
              : null;
            const base = it.display || (src ? snapshotDisplay(src) : snapshotDisplay({
              id: '', name: '', size: '', oldPrice: 0, newPrice: 0, category: '', hero: false, sgr: true, image: '', validUntil: '',
            }));
            const display = { ...base, ...patch };
            const d = DF.discountPct(display.oldPrice, display.newPrice);
            return {
              ...it,
              display,
              promoPrice: display.newPrice || undefined,
              label: display.specialLabel.trim()
                ? display.specialLabel
                : (d ? `-${d}%` : undefined),
              mediaLayout: display.images.length >= 2 ? 'side' : 'single',
            };
          }),
        };
      });
    });
  }, [products]);

  /* click = select; drag după prag = mutare (oprit în mod gesturi) */
  useEffect(() => {
    if (gestureId) return;
    const onMove = (e: PointerEvent) => {
      const pend = pendingSelectRef.current;
      if (!pend || e.pointerId !== pend.pointerId) return;
      if (Math.hypot(e.clientX - pend.x, e.clientY - pend.y) < 8) return;
      pendingSelectRef.current = null;
      beginMove(pend.item, pend.product, pend.pointerId, e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      const pend = pendingSelectRef.current;
      if (!pend || e.pointerId !== pend.pointerId) return;
      pendingSelectRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [beginMove, gestureId]);

  /* Escape iese din mod gesturi */
  useEffect(() => {
    if (!gestureId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        exitGesture();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gestureId, exitGesture]);

  const patchImageLayout = useCallback((itemId: string, index: number, layout: ImageLayout) => {
    const idx = activeIndexRef.current;
    setPages((prev) => {
      const page = prev[idx];
      if (!page) return prev;
      return prev.map((pg, i) => {
        if (i !== idx) return pg;
        return {
          ...pg,
          items: pg.items.map((it) => {
            if (it.id !== itemId) return it;
            const src = it.productId ? products.find((p) => p.id === it.productId) : null;
            const base = it.display || (src ? snapshotDisplay(src) : null);
            if (!base) return it;
            const layouts = normalizeImageLayouts(base.images, base.imageLayouts);
            while (layouts.length <= index) layouts.push({ x: 0, y: 0, scale: 1, rotate: 0 });
            layouts[index] = layout;
            const overflow = layouts.some(layoutLooksOverflow);
            return {
              ...it,
              overflow,
              display: { ...base, imageLayouts: layouts, overflow },
            };
          }),
        };
      });
    });
  }, [products]);

  const onResizeStart = useCallback((item: PageItem, corner: ResizeCorner, e: React.PointerEvent) => {
    if (e.button !== 0 || dragRef.current || moveRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const next: ResizeState = {
      itemId: item.id,
      pointerId: e.pointerId,
      corner,
      originCol: item.col,
      originRow: item.row,
      originW: item.w,
      originH: item.h,
      col: item.col,
      row: item.row,
      w: item.w,
      h: item.h,
      ok: true,
    };
    setResize(next);
    resizeRef.current = next;
  }, []);

  /* pointer global — drop produs din sertar */
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      setDrag({ ...d, x: e.clientX, y: e.clientY });
      updateHover(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const pageEl = pageRef.current;
      const gridEl = gridRef.current;
      const page = pagesRef.current[activeIndexRef.current];
      const g = page?.grid;
      if (pageEl && gridEl && g) {
        const cell = nearestCell(e.clientX, e.clientY, pageEl, gridEl, g.cols, g.rows);
        if (cell && canPlace({ col: cell.col, row: cell.row, w: 1, h: 1 }, g, page.items)) {
          placeProduct(d.product, cell.col, cell.row);
        }
      }
      setDrag(null);
      setHover(null);
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, updateHover, placeProduct]);

  /* pointer global — resize pe grilă din orice colț */
  useEffect(() => {
    if (!resize) return;
    const onMove = (e: PointerEvent) => {
      const r = resizeRef.current;
      if (!r || e.pointerId !== r.pointerId) return;
      const pageEl = pageRef.current;
      const gridEl = gridRef.current;
      const page = pagesRef.current[activeIndexRef.current];
      const g = page?.grid;
      if (!pageEl || !gridEl || !g || !page) return;

      const cell = nearestCell(e.clientX, e.clientY, pageEl, gridEl, g.cols, g.rows);
      const endCol = cell
        ? cell.col
        : (r.corner === 'nw' || r.corner === 'sw' ? r.originCol : r.originCol + r.originW - 1);
      const endRow = cell
        ? cell.row
        : (r.corner === 'nw' || r.corner === 'ne' ? r.originRow : r.originRow + r.originH - 1);
      const rect = computeCornerResize(
        r.corner,
        { col: r.originCol, row: r.originRow, w: r.originW, h: r.originH },
        endCol,
        endRow,
        g,
      );
      const ok = canPlace(rect, g, page.items, r.itemId);
      const next = { ...r, ...rect, ok };
      resizeRef.current = next;
      setResize(next);
    };
    const onUp = (e: PointerEvent) => {
      const r = resizeRef.current;
      if (!r || e.pointerId !== r.pointerId) return;
      if (r.ok) applyResize(r.itemId, r.col, r.row, r.w, r.h);
      setResize(null);
      resizeRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [resize, applyResize]);

  /* pointer global — mutare pe pagină / cos gunoi */
  useEffect(() => {
    if (!move) return;
    const onMove = (e: PointerEvent) => {
      const m = moveRef.current;
      if (!m || e.pointerId !== m.pointerId) return;
      const trashEl = trashRef.current;
      const overTrash = !!(trashEl && pointInRect(e.clientX, e.clientY, trashEl.getBoundingClientRect(), 8));
      const pageEl = pageRef.current;
      const gridEl = gridRef.current;
      const page = pagesRef.current[activeIndexRef.current];
      const g = page?.grid;
      let col = m.col;
      let row = m.row;
      let ok = false;
      if (!overTrash && pageEl && gridEl && g && page) {
        const cell = nearestCell(e.clientX, e.clientY, pageEl, gridEl, g.cols, g.rows);
        if (cell) {
          col = Math.max(0, Math.min(cell.col, g.cols - m.w));
          row = Math.max(0, Math.min(cell.row, g.rows - m.h));
          ok = canPlace({ col, row, w: m.w, h: m.h }, g, page.items, m.itemId);
        }
      }
      const next = { ...m, x: e.clientX, y: e.clientY, col, row, ok, overTrash };
      moveRef.current = next;
      setMove(next);
    };
    const onUp = (e: PointerEvent) => {
      const m = moveRef.current;
      if (!m || e.pointerId !== m.pointerId) return;
      if (m.overTrash) removeItem(m.itemId);
      else if (m.ok) applyMove(m.itemId, m.col, m.row);
      setMove(null);
      moveRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [move, applyMove, removeItem]);

  /* Roată = zoom pe pagină (oprit în timpul drag/resize/move) */
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragRef.current || resizeRef.current || moveRef.current || panDragRef.current) return;
      const delta = -e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta * ZOOM_STEP)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* Drag pe fundal / click mijloc = pan pagina */
  useEffect(() => {
    if (!panning) return;
    const onMove = (e: PointerEvent) => {
      const p = panDragRef.current;
      if (!p || e.pointerId !== p.pointerId) return;
      setPan({
        x: p.origX + (e.clientX - p.startX),
        y: p.origY + (e.clientY - p.startY),
      });
    };
    const onUp = (e: PointerEvent) => {
      const p = panDragRef.current;
      if (!p || e.pointerId !== p.pointerId) return;
      panDragRef.current = null;
      setPanning(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [panning]);

  const activePage = pages[activeIndex] || pages[0];
  const grid = activePage?.grid;

  const resizePreview = resize
    ? { col: resize.col, row: resize.row, w: resize.w, h: resize.h, ok: resize.ok, itemId: resize.itemId }
    : null;

  const movePreview = move
    ? { col: move.col, row: move.row, w: move.w, h: move.h, ok: move.ok, itemId: move.itemId }
    : null;

  const displayItems = useMemo(() => {
    if (!activePage) return [] as PageItem[];
    return activePage.items.map((it) => {
      if (resizePreview && it.id === resizePreview.itemId) {
        return {
          ...it,
          col: resizePreview.col,
          row: resizePreview.row,
          w: resizePreview.w,
          h: resizePreview.h,
        };
      }
      if (movePreview && it.id === movePreview.itemId) {
        return { ...it, col: movePreview.col, row: movePreview.row };
      }
      return it;
    });
  }, [activePage, resizePreview, movePreview]);

  const occupied = useMemo(() => {
    const m = new Map<string, PageItem>();
    for (const it of displayItems) {
      if (it.type !== 'product') continue;
      for (let r = it.row; r < it.row + it.h; r++) {
        for (let c = it.col; c < it.col + it.w; c++) {
          m.set(`${c},${r}`, it);
        }
      }
    }
    return m;
  }, [displayItems]);

  /* ghost doar la drop din panou; la mutare pe pagină se vede produsul pe grid */
  const ghost = drag
    ? { product: drag.product, x: drag.x, y: drag.y }
    : null;

  const busy = !!(drag || resize || move);
  const inGesture = !!gestureId;

  const onWorkspacePointerDown = (e: React.PointerEvent) => {
    const t = e.target as Element | null;
    /* click mijloc = pan mereu; click stânga pe fundal/gol = pan */
    const mid = e.button === 1;
    const onBlock = !!(t && t.closest('.mag-builder__block, .mag-builder__resize'));
    const empty = e.button === 0 && !onBlock && !inGesture;
    if (mid || empty) {
      if (e.target === e.currentTarget && !mid) setSelectedId(null);
      beginPagePan(e);
      return;
    }
    if (e.target === e.currentTarget) {
      if (gestureId) exitGesture();
      else setSelectedId(null);
    }
  };

  return (
    <div className={
      'mag-builder'
      + (busy ? ' is-dragging' : '')
      + (resize ? ' is-resizing' : '')
      + (move ? ' is-moving' : '')
      + (panning ? ' is-panning' : '')
      + (inGesture ? ' is-gesture-mode' : '')
    }>
      <BuilderProductPanel
        products={products}
        offer={offer}
        usedIds={usedIds}
        draggingId={drag?.product.id || null}
        onDragStart={onDragStart}
      />
      <div className="mag-builder__main">
        <div
          ref={workspaceRef}
          className="mag-builder__workspace"
          aria-label="Zona revistei"
          onPointerDown={onWorkspacePointerDown}
        >
          {activePage ? (
            <>
              <div className="mag-builder__page-meta" aria-hidden="true">
                Pagina {activeIndex + 1}{grid ? ` · ${grid.cols}×${grid.rows}` : ''} · {Math.round(zoom * 100)}%
                {inGesture ? ' · Gesturi' : ''}
              </div>
              {inGesture ? (
                <div className="mag-builder__gesture-hint" aria-live="polite">
                  Click = activează · trage / scroll = mărime · Shift+scroll pe poză = tilt · Esc = ieși
                </div>
              ) : null}
              {move ? (
                <div
                  ref={trashRef}
                  className={'mag-builder__trash' + (move.overTrash ? ' is-hot' : '')}
                  aria-label="Scoate produsul din pagină"
                >
                  <span className="mag-builder__trash-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12" />
                    </svg>
                  </span>
                  <span className="mag-builder__trash-label">Scoate din pagină</span>
                </div>
              ) : null}
              <div
                ref={pageRef}
                className={'mag-builder__page-preview mag-page' + (inGesture ? ' is-gesture-page' : '')}
                data-page={activePage.id}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
              >
                <div className={'mag-builder__page-inner mag-page__inner' + (inGesture ? ' is-gesture-inner' : '')}>
                  {grid ? (
                    <div
                      className="mag-builder__grid-wrap"
                      onPointerDown={(e) => {
                        if (!inGesture) return;
                        const t = e.target as HTMLElement;
                        if (t.closest('.mag-builder__block.is-gesture-focus')) return;
                        exitGesture();
                      }}
                    >
                      <div
                        ref={gridRef}
                        className="mag-builder__grid"
                        style={{
                          gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
                          gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
                        }}
                      >
                        {Array.from({ length: grid.cols * grid.rows }, (_, i) => {
                          const col = i % grid.cols;
                          const row = Math.floor(i / grid.cols);
                          const item = occupied.get(`${col},${row}`);
                          /* verde doar la plasare din panou (drag), nu la mutare/resize */
                          const isDropHover = !!drag && !inGesture && hover
                            && hover.col === col && hover.row === row;
                          const previewOk = isDropHover ? hover.ok : null;
                          return (
                            <div
                              key={i}
                              className={
                                'mag-builder__slot'
                                + (item ? ' is-filled' : '')
                                + (previewOk === true ? ' is-drop-ok' : '')
                                + (previewOk === false ? ' is-drop-bad' : '')
                              }
                              data-col={col}
                              data-row={row}
                            />
                          );
                        })}
                      </div>

                      <div
                        className="mag-builder__items"
                        style={{
                          gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
                          gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
                        }}
                      >
                        {displayItems.filter((it) => it.type === 'product').map((item) => {
                          const base = item.productId ? productsById.get(item.productId) : null;
                          if (!base) return null;
                          const view = displayAsProduct(base, item);
                          const imgs = displayImages(item, base);
                          const layouts = normalizeImageLayouts(imgs, item.display?.imageLayouts);
                          const cellOverflow = !!(item.display?.overflow || item.overflow);
                          const cellVariant = (item.w * item.h >= 4 || grid.cols <= 2) ? 'std' : 'sm';
                          const isResizing = resizePreview?.itemId === item.id;
                          const isMoving = movePreview?.itemId === item.id;
                          const isSelected = selectedId === item.id;
                          const isGesture = gestureId === item.id;
                          const textPos = resolveTextPos(item.display);
                          const pricePos = resolvePricePos(item.display);
                          return (
                            <div
                              key={item.id}
                              className={
                                'mag-builder__block'
                                + (isSelected ? ' is-selected' : '')
                                + (isGesture ? ' is-gesture-focus' : '')
                                + (inGesture && !isGesture ? ' is-gesture-dimmed' : '')
                                + (isResizing ? (resizePreview.ok ? ' is-resize-ok' : ' is-resize-bad') : '')
                                + (isMoving ? (movePreview.ok ? ' is-move-ok' : ' is-move-bad') : '')
                                + (isMoving ? ' is-moving-block' : '')
                              }
                              style={{
                                gridColumn: `${item.col + 1} / span ${item.w}`,
                                gridRow: `${item.row + 1} / span ${item.h}`,
                              }}
                              onPointerDown={(e) => onBlockPointerDown(item, base, e)}
                              onDoubleClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                pendingSelectRef.current = null;
                                if (isGesture) exitGesture();
                                else enterGesture(item.id);
                              }}
                            >
                              <ProductCell
                                p={view}
                                variant={cellVariant}
                                interactive={false}
                                eager
                                images={imgs}
                                imageLayouts={layouts}
                                overflow={isGesture ? cellOverflow : false}
                                priceLeft={!!item.display?.priceLeft}
                                textPos={textPos}
                                pricePos={pricePos}
                                gestureEdit={isGesture}
                                onImageLayout={isGesture
                                  ? ({ index, layout }) => patchImageLayout(item.id, index, layout)
                                  : undefined}
                                onBoxPos={isGesture
                                  ? (kind, pos) => patchDisplay(item.id, kind === 'text'
                                    ? { textPos: pos }
                                    : { pricePos: pos })
                                  : undefined}
                              />
                              {!isGesture ? RESIZE_CORNERS.map((corner) => (
                                <button
                                  key={corner}
                                  type="button"
                                  className={`mag-builder__resize mag-builder__resize--${corner}`}
                                  aria-label={`Redimensionează din colțul ${corner.toUpperCase()}`}
                                  onPointerDown={(e) => onResizeStart(item, corner, e)}
                                />
                              )) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <p className="mag-builder__empty">Alege o grilă pentru prima pagină</p>
          )}
        </div>
        <MagazinePageStrip
          pages={pages}
          activeIndex={activeIndex}
          products={products}
          onSelect={(i) => { setActiveIndex(i); setSelectedId(null); setGestureId(null); setPan({ x: 0, y: 0 }); }}
          onAdd={openGridPicker}
          onDelete={deletePage}
        />
      </div>

      {(() => {
        const sel = activePage?.items.find((it) => it.id === selectedId) || null;
        const base = sel?.productId ? productsById.get(sel.productId) || null : null;
        const display = sel
          ? (sel.display || (base ? snapshotDisplay(base) : null))
          : null;
        return (
          <BuilderInspectorPanel
            item={sel}
            baseProduct={base}
            display={display}
            onChange={(patch) => { if (sel) patchDisplay(sel.id, patch); }}
            onClose={() => setSelectedId(null)}
          />
        );
      })()}

      <GridPickerModal
        open={gridPickerOpen}
        allowCancel={pages.length > 0}
        onConfirm={confirmGrid}
        onCancel={cancelGridPicker}
      />

      {ghost ? (
        <div
          className="mag-drag-ghost"
          style={{ left: ghost.x, top: ghost.y }}
          aria-hidden="true"
        >
          <div className="mag-drag-ghost__img">
            {ghost.product.image
              ? <img src={DF.imageSrc(ghost.product.image)} alt="" />
              : <span className="mag-drag-ghost__noimg">Fără poză</span>}
          </div>
          <span className="mag-drag-ghost__name">
            {ghost.product.brand || ghost.product.name || 'Produs'}
          </span>
        </div>
      ) : null}
    </div>
  );
}
