'use client';
/* Layer forme + text pe foaie — mereu în spatele produselor; editare în mod forme/text. */
import { useEffect, useRef } from 'react';
import type { PageDecorItem } from '@/lib/catalogTypes';
import { clampDecorBox, decorFontCss, decorFontMeta, isDecorText } from '@/lib/pageDecor';
import PageShapeSvg from './PageShapeSvg';

interface Props {
  items: PageDecorItem[];
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (id: string, patch: Partial<PageDecorItem>) => void;
}

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';
type DragMode = 'move' | ResizeCorner;

const RESIZE_CORNERS: ResizeCorner[] = ['nw', 'ne', 'sw', 'se'];

export default function PageDecorLayer({
  items,
  editable = false,
  selectedId = null,
  onSelect,
  onChange,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    mode: DragMode;
    pointerId: number;
    startX: number;
    startY: number;
    orig: PageDecorItem;
    areaW: number;
    areaH: number;
  } | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!editable) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const patch = onChangeRef.current;
      if (!patch) return;
      const dxPct = ((e.clientX - d.startX) / d.areaW) * 100;
      const dyPct = ((e.clientY - d.startY) / d.areaH) * 100;
      const { x, y, w, h } = d.orig;
      if (d.mode === 'move') {
        const box = clampDecorBox(x + dxPct, y + dyPct, w, h);
        patch(d.id, { x: box.x, y: box.y });
        return;
      }
      let nx = x;
      let ny = y;
      let nw = w;
      let nh = h;
      if (d.mode === 'se') {
        nw = w + dxPct;
        nh = h + dyPct;
      } else if (d.mode === 'sw') {
        nx = x + dxPct;
        nw = w - dxPct;
        nh = h + dyPct;
      } else if (d.mode === 'ne') {
        ny = y + dyPct;
        nw = w + dxPct;
        nh = h - dyPct;
      } else {
        nx = x + dxPct;
        ny = y + dyPct;
        nw = w - dxPct;
        nh = h - dyPct;
      }
      const box = clampDecorBox(nx, ny, nw, nh);
      patch(d.id, { x: box.x, y: box.y, w: box.w, h: box.h });
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
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
  }, [editable]);

  if (!items.length && !editable) return null;

  const begin = (
    e: React.PointerEvent,
    item: PageDecorItem,
    mode: DragMode,
  ) => {
    if (!editable || !onChange) return;
    e.stopPropagation();
    e.preventDefault();
    const layer = layerRef.current;
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    onSelect?.(item.id);
    dragRef.current = {
      id: item.id,
      mode,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...item },
      areaW: Math.max(1, rect.width),
      areaH: Math.max(1, rect.height),
    };
  };

  return (
    <div
      ref={layerRef}
      className={'page-decor' + (editable ? ' is-edit' : '')}
      aria-hidden={editable ? undefined : true}
      onClick={editable ? (e) => {
        if (e.target === e.currentTarget) onSelect?.(null);
      } : undefined}
    >
      {items.map((item) => {
        const selected = editable && selectedId === item.id;
        const isText = isDecorText(item);
        const fontMeta = isText ? decorFontMeta(item.fontFamily) : null;
        return (
          <div
            key={item.id}
            className={
              'page-decor__item'
              + (selected ? ' is-on' : '')
              + (isText ? ' is-text' : '')
            }
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.w}%`,
              height: `${item.h}%`,
              opacity: item.opacity ?? 1,
              transform: item.rotate ? `rotate(${item.rotate}deg)` : undefined,
            }}
            onPointerDown={editable ? (e) => begin(e, item, 'move') : undefined}
          >
            {isText ? (
              <p
                className="page-decor__text"
                style={{
                  color: item.fill,
                  fontFamily: decorFontCss(item.fontFamily),
                  fontWeight: item.fontWeight ?? fontMeta?.weight ?? 800,
                  fontStyle: (item.italic ?? fontMeta?.italic) ? 'italic' : 'normal',
                  textTransform: item.uppercase === false ? 'none' : 'uppercase',
                }}
              >
                {item.text || 'Text'}
              </p>
            ) : (
              <svg className="page-decor__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <PageShapeSvg shape={item.shape} fill={item.fill} />
              </svg>
            )}
            {selected ? RESIZE_CORNERS.map((corner) => (
              <button
                key={corner}
                type="button"
                className={`page-decor__handle page-decor__handle--${corner}`}
                aria-label={`Redimensionează din colțul ${corner.toUpperCase()}`}
                onPointerDown={(e) => begin(e, item, corner)}
              />
            )) : null}
          </div>
        );
      })}
    </div>
  );
}
