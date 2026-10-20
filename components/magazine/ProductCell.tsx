/* Căsuță produs Lidl — aceeași în pliant și în constructor. */
'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BoxPos, ImageLayout } from '@/lib/catalogTypes';
import { DEFAULT_IMAGE_LAYOUT, DEFAULT_PRICE_POS, DEFAULT_TEXT_POS } from '@/lib/catalogTypes';
import { clampBoxPos } from '@/lib/pageItemDisplay';
import * as DF from '@/lib/store';
import type { Product } from '@/lib/types';

export type MagCellVariant = 'hero' | 'std' | 'sm';

export type ImageLayoutChange = {
  index: number;
  layout: ImageLayout;
};

export type BoxKind = 'text' | 'price';

/** țintă activă în modul gesturi */
export type GestureTarget =
  | { kind: 'img'; index: number }
  | { kind: 'text' }
  | { kind: 'price' };

/** 2:1 — mișcări și zoom mai fine în modul gesturi */
const FINE_RATIO = 2;
const DRAG_THRESHOLD = 5;

function fitBrand(el: HTMLElement | null) {
  if (!el) return;
  el.style.fontSize = '';
  const max = parseFloat(getComputedStyle(el).fontSize);
  let size = max;
  while ((el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && size > max * 0.62) {
    size -= 0.4;
    el.style.fontSize = size + 'px';
  }
}

function sameTarget(a: GestureTarget | null, b: GestureTarget | null): boolean {
  if (!a || !b) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'img' && b.kind === 'img') return a.index === b.index;
  return true;
}

export default function ProductCell({
  p, variant = 'std', eager, onProduct, highlight, interactive = true,
  images, priceLeft = false, imageLayouts, overflow = false,
  textPos, pricePos,
  gestureEdit = false, onImageLayout, onBoxPos,
}: {
  p: Product;
  variant?: MagCellVariant;
  eager?: boolean;
  onProduct?: (p: Product) => void;
  highlight?: boolean;
  interactive?: boolean;
  images?: string[];
  priceLeft?: boolean;
  imageLayouts?: ImageLayout[];
  overflow?: boolean;
  textPos?: BoxPos;
  pricePos?: BoxPos;
  gestureEdit?: boolean;
  onImageLayout?: (change: ImageLayoutChange) => void;
  onBoxPos?: (kind: BoxKind, pos: BoxPos) => void;
}) {
  const cellRef = useRef<HTMLElement>(null);
  const brandRef = useRef<HTMLParagraphElement>(null);
  const imgAreaRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const tapRef = useRef({ t: 0, x: 0, y: 0 });

  const [active, setActive] = useState<GestureTarget | null>(null);
  const activeRef = useRef<GestureTarget | null>(null);
  activeRef.current = active;

  /** pending: click = select; drag doar dacă era deja activ înainte de pointerdown */
  const pendingRef = useRef<{
    target: GestureTarget;
    pointerId: number;
    startX: number;
    startY: number;
    mode: 'pan' | 'tilt' | 'box';
    canDrag: boolean;
  } | null>(null);

  const dragRef = useRef<{
    mode: 'pan' | 'tilt' | 'box';
    target: GestureTarget;
    pointerId: number;
    startX: number;
    startY: number;
    imgOrig?: ImageLayout;
    boxOrig?: BoxPos;
    areaW: number;
    areaH: number;
    boxWPct: number;
    boxHPct: number;
  } | null>(null);

  const layoutsRef = useRef<ImageLayout[]>([]);
  const onImageLayoutRef = useRef(onImageLayout);
  const onBoxPosRef = useRef(onBoxPos);
  const tPosRef = useRef<BoxPos>(DEFAULT_TEXT_POS);
  const pPosRef = useRef<BoxPos>(DEFAULT_PRICE_POS);

  const { brand, title } = DF.productBrandTitle(p);
  const d = DF.discountPct(p.oldPrice, p.newPrice);
  const unitLine = DF.unitPriceLine(p);
  const [lei, ban] = DF.fmtPriceRo(p.newPrice).split(',');
  const special = (p.specialLabel || '').trim();
  const canTap = interactive && !!onProduct && !gestureEdit;
  const imgs = (images && images.length ? images : (p.image ? [p.image] : [])).slice(0, 2);
  const layouts = imgs.map((_, i) => ({
    ...DEFAULT_IMAGE_LAYOUT,
    ...(imageLayouts?.[i] || {}),
  }));
  layoutsRef.current = layouts;
  onImageLayoutRef.current = onImageLayout;
  onBoxPosRef.current = onBoxPos;

  const tPos = textPos || (priceLeft ? { x: 42, y: 70 } : { ...DEFAULT_TEXT_POS });
  const pPos = pricePos || (priceLeft ? { x: 3, y: 64 } : { ...DEFAULT_PRICE_POS });
  tPosRef.current = tPos;
  pPosRef.current = pPos;

  useLayoutEffect(() => { fitBrand(brandRef.current); }, [brand, title, variant, tPos.x, tPos.y]);

  /* reset selecție la ieșirea din mod gesturi */
  useEffect(() => {
    if (!gestureEdit) {
      setActive(null);
      pendingRef.current = null;
      dragRef.current = null;
    }
  }, [gestureEdit]);

  /* scroll = resize pe elementul activ (poză / text / preț), raport 2:1 */
  useEffect(() => {
    if (!gestureEdit) return;
    const el = cellRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const cur = activeRef.current;
      if (!cur) return;
      e.preventDefault();
      e.stopPropagation();
      const pixels = -e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const step = (pixels * 0.0012) / FINE_RATIO;

      if (cur.kind === 'img') {
        const cb = onImageLayoutRef.current;
        if (!cb) return;
        const orig = layoutsRef.current[cur.index] || { ...DEFAULT_IMAGE_LAYOUT };
        const scale = Math.min(2.6, Math.max(0.35, orig.scale + step));
        cb({
          index: cur.index,
          layout: { ...orig, scale: Math.round(scale * 100) / 100 },
        });
        return;
      }

      const boxCb = onBoxPosRef.current;
      if (!boxCb) return;
      const orig = cur.kind === 'text' ? tPosRef.current : pPosRef.current;
      const scale = Math.min(2.4, Math.max(0.45, (orig.scale ?? 1) + step));
      boxCb(cur.kind, {
        ...orig,
        scale: Math.round(scale * 100) / 100,
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gestureEdit]);

  /* listeneri globali — oprește drag-ul la pointerup chiar dacă React re-renderează */
  useEffect(() => {
    if (!gestureEdit) return;

    const endDrag = (pointerId: number) => {
      const pend = pendingRef.current;
      if (pend && pend.pointerId === pointerId) {
        /* click scurt fără drag → doar selectează */
        setActive(pend.target);
        pendingRef.current = null;
      }
      if (dragRef.current?.pointerId === pointerId) {
        dragRef.current = null;
      }
    };

    const onMove = (e: PointerEvent) => {
      const pend = pendingRef.current;
      if (pend && e.pointerId === pend.pointerId) {
        const dist = Math.hypot(e.clientX - pend.startX, e.clientY - pend.startY);
        if (dist < DRAG_THRESHOLD) return;
        /* prima selectare: nu trage — doar rămâne selectat la pointerup */
        if (!pend.canDrag) {
          pendingRef.current = null;
          return;
        }

        const cell = cellRef.current?.getBoundingClientRect();
        const area = imgAreaRef.current?.getBoundingClientRect();
        const boxEl = pend.target.kind === 'text'
          ? textRef.current
          : pend.target.kind === 'price'
            ? priceRef.current
            : null;
        const box = boxEl?.getBoundingClientRect();

        if (pend.mode === 'pan' && pend.target.kind === 'img') {
          const orig = { ...(layoutsRef.current[pend.target.index] || DEFAULT_IMAGE_LAYOUT) };
          dragRef.current = {
            mode: 'pan',
            target: pend.target,
            pointerId: pend.pointerId,
            startX: pend.startX,
            startY: pend.startY,
            imgOrig: orig,
            areaW: area?.width || 1,
            areaH: area?.height || 1,
            boxWPct: 0,
            boxHPct: 0,
          };
        } else if (pend.mode === 'tilt' && pend.target.kind === 'img') {
          const orig = { ...(layoutsRef.current[pend.target.index] || DEFAULT_IMAGE_LAYOUT) };
          dragRef.current = {
            mode: 'tilt',
            target: pend.target,
            pointerId: pend.pointerId,
            startX: pend.startX,
            startY: pend.startY,
            imgOrig: orig,
            areaW: 1,
            areaH: 1,
            boxWPct: 0,
            boxHPct: 0,
          };
        } else if (pend.mode === 'box' && (pend.target.kind === 'text' || pend.target.kind === 'price')) {
          const orig = pend.target.kind === 'text'
            ? { ...tPosRef.current }
            : { ...pPosRef.current };
          dragRef.current = {
            mode: 'box',
            target: pend.target,
            pointerId: pend.pointerId,
            startX: pend.startX,
            startY: pend.startY,
            boxOrig: orig,
            areaW: cell?.width || 1,
            areaH: cell?.height || 1,
            boxWPct: box && cell ? (box.width / cell.width) * 100 : 40,
            boxHPct: box && cell ? (box.height / cell.height) * 100 : 20,
          };
        }
        pendingRef.current = null;
      }

      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      if (drag.mode === 'pan' && drag.target.kind === 'img' && drag.imgOrig && onImageLayoutRef.current) {
        const dx = (((e.clientX - drag.startX) / drag.areaW) * 100) / FINE_RATIO;
        const dy = (((e.clientY - drag.startY) / drag.areaH) * 100) / FINE_RATIO;
        onImageLayoutRef.current({
          index: drag.target.index,
          layout: {
            ...drag.imgOrig,
            x: Math.round((drag.imgOrig.x + dx) * 10) / 10,
            y: Math.round((drag.imgOrig.y + dy) * 10) / 10,
          },
        });
        return;
      }

      if (drag.mode === 'tilt' && drag.target.kind === 'img' && drag.imgOrig && onImageLayoutRef.current) {
        const delta = ((e.clientX - drag.startX) + (e.clientY - drag.startY) * 0.35) / FINE_RATIO;
        const rotate = Math.min(35, Math.max(-35, (drag.imgOrig.rotate || 0) + delta * 0.18));
        onImageLayoutRef.current({
          index: drag.target.index,
          layout: { ...drag.imgOrig, rotate: Math.round(rotate * 10) / 10 },
        });
        return;
      }

      if (drag.mode === 'box' && drag.boxOrig && onBoxPosRef.current) {
        const kind = drag.target.kind === 'text' ? 'text' : 'price';
        if (kind !== 'text' && kind !== 'price') return;
        const dx = ((e.clientX - drag.startX) / drag.areaW * 100) / FINE_RATIO;
        const dy = ((e.clientY - drag.startY) / drag.areaH * 100) / FINE_RATIO;
        onBoxPosRef.current(kind, clampBoxPos(
          drag.boxOrig.x + dx,
          drag.boxOrig.y + dy,
          drag.boxWPct,
          drag.boxHPct,
          drag.boxOrig.scale ?? 1,
        ));
      }
    };

    const onUp = (e: PointerEvent) => {
      endDrag(e.pointerId);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      pendingRef.current = null;
      dragRef.current = null;
    };
  }, [gestureEdit]);

  const onProductPointerDown = (e: React.PointerEvent) => {
    tapRef.current = { t: performance.now(), x: e.clientX, y: e.clientY };
  };
  const onProductPointerUp = (e: React.PointerEvent) => {
    if (!onProduct) return;
    const moved = Math.hypot(e.clientX - tapRef.current.x, e.clientY - tapRef.current.y);
    if (moved > 12) return;
    window.setTimeout(() => onProduct(p), 0);
  };

  const beginPending = (
    target: GestureTarget,
    mode: 'pan' | 'tilt' | 'box',
    e: React.PointerEvent,
  ) => {
    if (!gestureEdit || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const alreadyActive = sameTarget(activeRef.current, target);
    setActive(target);
    activeRef.current = target;
    pendingRef.current = {
      target,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      mode,
      canDrag: alreadyActive || mode === 'tilt',
    };
    dragRef.current = null;
  };

  const isImgActive = (i: number) => active?.kind === 'img' && active.index === i;
  const isTextActive = active?.kind === 'text';
  const isPriceActive = active?.kind === 'price';

  const textBlock = (
    <div
      ref={textRef}
      className={
        'mag-cell__text'
        + (gestureEdit ? ' is-gesture-target' : '')
        + (isTextActive ? ' is-active' : '')
        + (gestureEdit && active && !isTextActive ? ' is-idle' : '')
      }
      style={{
        left: `${tPos.x}%`,
        top: `${tPos.y}%`,
        transform: `scale(${tPos.scale ?? 1})`,
        transformOrigin: 'top left',
      }}
      onPointerDown={gestureEdit ? (e) => beginPending({ kind: 'text' }, 'box', e) : undefined}
    >
      <p className="mag-cell__brand" ref={brandRef}>{brand}</p>
      {title ? <p className="mag-cell__title">{title}</p> : null}
      {p.size ? <p className="mag-cell__detail">{p.size}</p> : null}
      {p.variants ? <p className="mag-cell__detail">{p.variants}</p> : null}
      {unitLine ? <p className="mag-cell__detail mag-cell__detail--unit">{unitLine}</p> : null}
    </div>
  );

  const priceBlock = (
    <div
      ref={priceRef}
      className={
        'mag-cell__price'
        + (gestureEdit ? ' is-gesture-target' : '')
        + (isPriceActive ? ' is-active' : '')
        + (gestureEdit && active && !isPriceActive ? ' is-idle' : '')
      }
      style={{
        left: `${pPos.x}%`,
        top: `${pPos.y}%`,
        transform: `scale(${pPos.scale ?? 1})`,
        transformOrigin: priceLeft ? 'top left' : 'top right',
      }}
      onPointerDown={gestureEdit ? (e) => beginPending({ kind: 'price' }, 'box', e) : undefined}
    >
      <div className="mag-cell__badge-row">
        {special
          ? <span className="mag-cell__badge mag-cell__badge--special">{special}</span>
          : d ? <span className="mag-cell__badge">{`-${d}%`}</span> : null}
        {+p.oldPrice > 0 ? <span className="mag-cell__was">{DF.fmtPriceRo(p.oldPrice)}</span> : null}
      </div>
      <div className="mag-cell__now" aria-label={`${lei},${ban} lei`}>
        <span className="mag-cell__lei">{lei}</span>
        <span className="mag-cell__ban">,{ban}</span>
      </div>
    </div>
  );

  return (
    <article
      ref={cellRef}
      className={
        `mag-cell mag-cell--${variant}`
        + (highlight ? ' is-highlight' : '')
        + (priceLeft ? ' mag-cell--price-left' : '')
        + (overflow ? ' is-overflow' : '')
        + (gestureEdit ? ' is-gesture' : '')
      }
      data-id={p.id}
      id={interactive ? 'p-' + p.id : undefined}
      role={canTap ? 'button' : undefined}
      tabIndex={canTap ? 0 : undefined}
      onPointerDown={canTap ? onProductPointerDown : undefined}
      onPointerUp={canTap ? onProductPointerUp : undefined}
      onKeyDown={canTap ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onProduct?.(p); } } : undefined}
    >
      <div
        ref={imgAreaRef}
        className={'mag-cell__img' + (imgs.length > 1 ? ' mag-cell__img--duo' : '') + (gestureEdit ? ' is-gesture' : '')}
      >
        {imgs.length === 0
          ? <span className="mag-cell__noimg">Fără poză</span>
          : imgs.map((src, i) => {
            const lay = layouts[i];
            const imgOn = isImgActive(i);
            return (
              <div
                key={i}
                className={
                  'mag-cell__img-slot'
                  + (gestureEdit ? ' is-selectable' : '')
                  + (imgOn ? ' is-active' : '')
                  + (gestureEdit && active && !imgOn ? ' is-idle' : '')
                }
                style={{
                  transform: `translate(${lay.x}%, ${lay.y}%) scale(${lay.scale}) rotate(${lay.rotate || 0}deg)`,
                }}
                onPointerDown={gestureEdit ? (e) => beginPending({ kind: 'img', index: i }, 'pan', e) : undefined}
              >
                <img
                  src={DF.assetUrl(src)}
                  alt=""
                  loading={eager ? 'eager' : 'lazy'}
                  decoding="async"
                  width={400}
                  height={400}
                  draggable={false}
                />
                {gestureEdit && imgOn ? (
                  <button
                    type="button"
                    className="mag-cell__img-handle"
                    aria-label="Înclină poza"
                    title="Tilt"
                    onPointerDown={(e) => beginPending({ kind: 'img', index: i }, 'tilt', e)}
                  />
                ) : null}
              </div>
            );
          })}
      </div>
      {textBlock}
      {priceBlock}
    </article>
  );
}
