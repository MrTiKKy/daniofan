/* Căsuță produs Lidl — aceeași în pliant și în constructor. */
'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BoxPos, ImageLayout, MagazineKind } from '@/lib/catalogTypes';
import {
  DEFAULT_HEART_POS,
  DEFAULT_IMAGE_LAYOUT,
  DEFAULT_PRICE_POS,
  DEFAULT_PRICE_POS_LEFT,
  DEFAULT_TEXT_POS,
  DEFAULT_TEXT_POS_LEFT,
} from '@/lib/catalogTypes';
import { clampBoxPos } from '@/lib/pageItemDisplay';
import * as DF from '@/lib/store';
import type { Product } from '@/lib/types';
import HeartStepper from '@/components/list/HeartStepper';

export type MagCellVariant = 'hero' | 'std' | 'sm';

export type ImageLayoutChange = {
  index: number;
  layout: ImageLayout;
};

export type BoxKind = 'text' | 'price' | 'heart';

/** țintă activă în modul gesturi */
export type GestureTarget =
  | { kind: 'img'; index: number }
  | { kind: 'text' }
  | { kind: 'price' }
  | { kind: 'heart' };

function HeartGlyph({ filled }: { filled?: boolean }) {
  return (
    <svg className="heart-btn__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      {filled ? (
        <path
          fill="currentColor"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          d="M12.1 18.55l-.1.1-.11-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"
        />
      )}
    </svg>
  );
}

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
  textPos, pricePos, heartPos,
  gestureEdit = false, onImageLayout, onBoxPos,
  showHeart = false, heartEdit = false, slotId, magazineType,
  autoFocusHeart = false, onHeartFocused,
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
  heartPos?: BoxPos;
  gestureEdit?: boolean;
  onImageLayout?: (change: ImageLayoutChange) => void;
  onBoxPos?: (kind: BoxKind, pos: BoxPos) => void;
  /** Interactivă — doar în revista publicată */
  showHeart?: boolean;
  /** Vizibilă în constructor (mutabilă în mod gesturi) */
  heartEdit?: boolean;
  slotId?: string;
  magazineType?: MagazineKind;
  /** Constructor: după dublu-click pe inimă, selectează inima în gesturi */
  autoFocusHeart?: boolean;
  onHeartFocused?: () => void;
}) {
  const cellRef = useRef<HTMLElement>(null);
  const brandRef = useRef<HTMLParagraphElement>(null);
  const imgAreaRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const heartRef = useRef<HTMLDivElement>(null);
  const tapRef = useRef({ t: 0, x: 0, y: 0 });
  const hPosRef = useRef<BoxPos>(DEFAULT_HEART_POS);
  /** după click pe inimă → enterGesture: primul drag mută imediat */
  const heartDragReadyRef = useRef(false);

  const [active, setActive] = useState<GestureTarget | null>(null);
  const activeRef = useRef<GestureTarget | null>(null);
  activeRef.current = active;

  /** pending: click = select; drag doar dacă era deja activ înainte de pointerdown */
  const pendingRef = useRef<{
    target: GestureTarget;
    pointerId: number;
    startX: number;
    startY: number;
    mode: 'pan' | 'box';
    canDrag: boolean;
  } | null>(null);

  const dragRef = useRef<{
    mode: 'pan' | 'box';
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

  const tPos = textPos || (priceLeft ? { ...DEFAULT_TEXT_POS_LEFT } : { ...DEFAULT_TEXT_POS });
  const pPos = pricePos || (priceLeft ? { ...DEFAULT_PRICE_POS_LEFT } : { ...DEFAULT_PRICE_POS });
  const hPos = heartPos || { ...DEFAULT_HEART_POS };
  tPosRef.current = tPos;
  pPosRef.current = pPos;
  hPosRef.current = hPos;

  const heartLive = !!showHeart && !!slotId && !!magazineType && !gestureEdit;
  const heartVisible = heartLive || heartEdit || gestureEdit;

  useLayoutEffect(() => { fitBrand(brandRef.current); }, [brand, title, variant, tPos.x, tPos.y]);

  /* reset selecție la ieșirea din mod gesturi */
  useEffect(() => {
    if (!gestureEdit) {
      setActive(null);
      pendingRef.current = null;
      dragRef.current = null;
      heartDragReadyRef.current = false;
    }
  }, [gestureEdit]);

  /* Click pe inimă din constructor → după enterGesture, selectează inima */
  useEffect(() => {
    if (!gestureEdit || !autoFocusHeart) return;
    setActive({ kind: 'heart' });
    activeRef.current = { kind: 'heart' };
    heartDragReadyRef.current = true;
    onHeartFocused?.();
  }, [gestureEdit, autoFocusHeart, onHeartFocused]);

  /* scroll = mărime; Shift+scroll pe poză = tilt */
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
      const step = pixels * 0.0012;

      if (cur.kind === 'img') {
        const cb = onImageLayoutRef.current;
        if (!cb) return;
        const orig = layoutsRef.current[cur.index] || { ...DEFAULT_IMAGE_LAYOUT };
        if (e.shiftKey) {
          const rotate = Math.min(35, Math.max(-35, (orig.rotate || 0) + pixels * 0.045));
          cb({
            index: cur.index,
            layout: { ...orig, rotate: Math.round(rotate * 10) / 10 },
          });
          return;
        }
        const scale = Math.min(2.6, Math.max(0.35, orig.scale + step));
        cb({
          index: cur.index,
          layout: { ...orig, scale: Math.round(scale * 100) / 100 },
        });
        return;
      }

      const boxCb = onBoxPosRef.current;
      if (!boxCb) return;
      if (cur.kind !== 'text' && cur.kind !== 'price' && cur.kind !== 'heart') return;
      const orig = cur.kind === 'text'
        ? tPosRef.current
        : cur.kind === 'price'
          ? pPosRef.current
          : hPosRef.current;
      const prevS = Math.max(0.45, orig.scale ?? 1);
      const scale = Math.min(2.4, Math.max(0.45, prevS + step));
      const cell = cellRef.current?.getBoundingClientRect();
      const boxEl = cur.kind === 'text'
        ? textRef.current
        : cur.kind === 'price'
          ? priceRef.current
          : heartRef.current;
      const box = boxEl?.getBoundingClientRect();
      const visW = box && cell ? (box.width / cell.width) * 100 : (cur.kind === 'heart' ? 18 : 40);
      const visH = box && cell ? (box.height / cell.height) * 100 : (cur.kind === 'heart' ? 18 : 20);
      const factor = scale / prevS;
      boxCb(cur.kind, clampBoxPos(orig.x, orig.y, visW * factor, visH * factor, scale));
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
            : pend.target.kind === 'heart'
              ? heartRef.current
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
        } else if (
          pend.mode === 'box'
          && (pend.target.kind === 'text' || pend.target.kind === 'price' || pend.target.kind === 'heart')
        ) {
          const orig = pend.target.kind === 'text'
            ? { ...tPosRef.current }
            : pend.target.kind === 'price'
              ? { ...pPosRef.current }
              : { ...hPosRef.current };
          const boxWPct = box && cell
            ? (box.width / cell.width) * 100
            : (pend.target.kind === 'heart' ? 18 : 40);
          const boxHPct = box && cell
            ? (box.height / cell.height) * 100
            : (pend.target.kind === 'heart' ? 18 : 20);
          dragRef.current = {
            mode: 'box',
            target: pend.target,
            pointerId: pend.pointerId,
            startX: pend.startX,
            startY: pend.startY,
            boxOrig: orig,
            areaW: cell?.width || 1,
            areaH: cell?.height || 1,
            boxWPct,
            boxHPct,
          };
        }
        pendingRef.current = null;
      }

      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      if (drag.mode === 'pan' && drag.target.kind === 'img' && drag.imgOrig && onImageLayoutRef.current) {
        const dx = ((e.clientX - drag.startX) / drag.areaW) * 100;
        const dy = ((e.clientY - drag.startY) / drag.areaH) * 100;
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

      if (drag.mode === 'box' && drag.boxOrig && onBoxPosRef.current) {
        const kind = drag.target.kind;
        if (kind !== 'text' && kind !== 'price' && kind !== 'heart') return;
        const dx = (e.clientX - drag.startX) / drag.areaW * 100;
        const dy = (e.clientY - drag.startY) / drag.areaH * 100;
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
    mode: 'pan' | 'box',
    e: React.PointerEvent,
  ) => {
    if (!gestureEdit || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const alreadyActive = sameTarget(activeRef.current, target);
    const heartReady = target.kind === 'heart' && heartDragReadyRef.current;
    if (heartReady) heartDragReadyRef.current = false;
    setActive(target);
    activeRef.current = target;
    pendingRef.current = {
      target,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      mode,
      canDrag: alreadyActive || heartReady,
    };
    dragRef.current = null;
  };

  const isImgActive = (i: number) => active?.kind === 'img' && active.index === i;
  const isTextActive = active?.kind === 'text';
  const isPriceActive = active?.kind === 'price';
  const isHeartActive = active?.kind === 'heart';

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
        ['--box-zoom' as string]: String(tPos.scale ?? 1),
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
        ['--box-zoom' as string]: String(pPos.scale ?? 1),
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
              </div>
            );
          })}
      </div>
      {textBlock}
      {priceBlock}
      {heartVisible ? (
        <div
          ref={heartRef}
          className={
            'mag-cell__heart'
            + (gestureEdit ? ' is-gesture-target' : ' is-live')
            + (isHeartActive ? ' is-active' : '')
            + (gestureEdit && active && !isHeartActive ? ' is-idle' : '')
          }
          style={{
            left: `${hPos.x}%`,
            top: `${hPos.y}%`,
            ['--box-zoom' as string]: String(hPos.scale ?? 1),
          }}
          onPointerDown={gestureEdit
            ? (e) => beginPending({ kind: 'heart' }, 'box', e)
            : undefined}
        >
          {heartLive ? (
            <HeartStepper
              slotId={slotId!}
              magazineType={magazineType!}
              product={p}
              imageSrc={imgs[0] || p.image}
              autoExpand={!!highlight}
            />
          ) : (
            <span className="heart-btn heart-btn--static" aria-hidden>
              <span className="heart-btn__hit">
                <span className="heart-btn__circle">
                  <HeartGlyph />
                </span>
              </span>
            </span>
          )}
        </div>
      ) : null}
    </article>
  );
}
