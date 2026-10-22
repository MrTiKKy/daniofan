'use client';
/* Bloc mesaj — fundal colorat, colțuri, text liber (mutare + scroll mărime în gesturi). */
import { useEffect, useRef, useState } from 'react';
import type { BoxPos, PageItem } from '@/lib/catalogTypes';
import { clampBoxPos } from '@/lib/pageItemDisplay';
import {
  buildMessageEdgeMask,
  messageFontCss,
  messageFontMeta,
  resolveMessageDesign,
} from '@/lib/messageBlock';

const DRAG_THRESHOLD = 5;

export default function MessageBlock({
  item,
  gestureEdit = false,
  onTextPos,
}: {
  item: PageItem;
  gestureEdit?: boolean;
  onTextPos?: (pos: BoxPos) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  activeRef.current = active;

  const d = resolveMessageDesign(item);
  const text = (item.text || '').trim() || 'Mesaj pe pagină';
  const tPos = d.textPos || { x: 10, y: 28, scale: 1 };
  const tPosRef = useRef(tPos);
  tPosRef.current = tPos;
  const onTextPosRef = useRef(onTextPos);
  onTextPosRef.current = onTextPos;
  const fontMeta = messageFontMeta(d.fontFamily);

  const pendingRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    canDrag: boolean;
  } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    boxOrig: BoxPos;
    areaW: number;
    areaH: number;
    boxWPct: number;
    boxHPct: number;
  } | null>(null);

  useEffect(() => {
    if (!gestureEdit) {
      setActive(false);
      pendingRef.current = null;
      dragRef.current = null;
    }
  }, [gestureEdit]);

  /* scroll = mărime text */
  useEffect(() => {
    if (!gestureEdit) return;
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!activeRef.current || !onTextPosRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const pixels = -e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const step = pixels * 0.0012;
      const orig = tPosRef.current;
      const prevS = Math.max(0.45, orig.scale ?? 1);
      const scale = Math.min(2.4, Math.max(0.45, prevS + step));
      const cell = rootRef.current?.getBoundingClientRect();
      const box = textRef.current?.getBoundingClientRect();
      const visW = box && cell ? (box.width / cell.width) * 100 : 50;
      const visH = box && cell ? (box.height / cell.height) * 100 : 20;
      const factor = scale / prevS;
      onTextPosRef.current(clampBoxPos(orig.x, orig.y, visW * factor, visH * factor, scale));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gestureEdit]);

  useEffect(() => {
    if (!gestureEdit) return;
    const endDrag = (pointerId: number) => {
      const pend = pendingRef.current;
      if (pend && pend.pointerId === pointerId) {
        setActive(true);
        pendingRef.current = null;
      }
      if (dragRef.current?.pointerId === pointerId) dragRef.current = null;
    };
    const onMove = (e: PointerEvent) => {
      const pend = pendingRef.current;
      if (pend && e.pointerId === pend.pointerId) {
        const dist = Math.hypot(e.clientX - pend.startX, e.clientY - pend.startY);
        if (dist < DRAG_THRESHOLD) return;
        if (!pend.canDrag) {
          pendingRef.current = null;
          return;
        }
        const cell = rootRef.current?.getBoundingClientRect();
        const box = textRef.current?.getBoundingClientRect();
        dragRef.current = {
          pointerId: pend.pointerId,
          startX: pend.startX,
          startY: pend.startY,
          boxOrig: { ...tPosRef.current },
          areaW: cell?.width || 1,
          areaH: cell?.height || 1,
          boxWPct: box && cell ? (box.width / cell.width) * 100 : 50,
          boxHPct: box && cell ? (box.height / cell.height) * 100 : 20,
        };
        pendingRef.current = null;
      }
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId || !onTextPosRef.current) return;
      const dx = ((e.clientX - drag.startX) / drag.areaW) * 100;
      const dy = ((e.clientY - drag.startY) / drag.areaH) * 100;
      onTextPosRef.current(clampBoxPos(
        drag.boxOrig.x + dx,
        drag.boxOrig.y + dy,
        drag.boxWPct,
        drag.boxHPct,
        drag.boxOrig.scale ?? 1,
      ));
    };
    const onUp = (e: PointerEvent) => endDrag(e.pointerId);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [gestureEdit]);

  const onTextPointerDown = (e: React.PointerEvent) => {
    if (!gestureEdit || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const already = activeRef.current;
    setActive(true);
    pendingRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      canDrag: already,
    };
    dragRef.current = null;
  };

  const radius = d.radius ?? 18;
  const edgeFade = d.edgeFade ?? 0;
  const edgeMask = buildMessageEdgeMask(edgeFade, radius);

  return (
    <div
      ref={rootRef}
      className={'mag-msg' + (gestureEdit ? ' is-gesture' : '') + (edgeFade > 0 ? ' has-fade' : '')}
      style={{
        background: d.background,
        color: d.color,
        borderRadius: edgeMask ? 0 : `${radius}%`,
        ...(edgeMask ? {
          WebkitMaskImage: edgeMask,
          maskImage: edgeMask,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        } : {}),
      }}
    >
      <p
        ref={textRef}
        className={
          'mag-msg__text'
          + (gestureEdit ? ' is-gesture-target' : '')
          + (active ? ' is-active' : '')
        }
        style={{
          left: `${tPos.x}%`,
          top: `${tPos.y}%`,
          ['--box-zoom' as string]: String(tPos.scale ?? 1),
          fontSize: `${d.fontSize ?? 2.6}cqw`,
          fontFamily: messageFontCss(d.fontFamily),
          fontWeight: d.fontWeight ?? fontMeta.weight ?? 800,
          fontStyle: fontMeta.italic ? 'italic' : 'normal',
          textTransform: d.uppercase === false ? 'none' : 'uppercase',
          textAlign: d.align || 'center',
        }}
        onPointerDown={gestureEdit ? onTextPointerDown : undefined}
      >
        {text}
      </p>
    </div>
  );
}
