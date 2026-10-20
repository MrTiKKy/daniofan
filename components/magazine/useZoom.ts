/* Zoom ~2.5x pe punct, pinch, pan în limite; Esc / Închide. */
'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

const ZOOM_LEVEL = 2.5;
const DBL_MS = 300;
const ANIM_MS = 300;

export type ZoomState = {
  active: boolean;
  scale: number;
  ox: number; /* origin % */
  oy: number;
  tx: number; /* pan px */
  ty: number;
};

const IDLE: ZoomState = { active: false, scale: 1, ox: 50, oy: 50, tx: 0, ty: 0 };

export function useZoom(onBlockChange?: (blocked: boolean) => void) {
  const [zoom, setZoom] = useState<ZoomState>(IDLE);
  const [dragging, setDragging] = useState(false);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const panRef = useRef({ active: false, x0: 0, y0: 0, tx0: 0, ty0: 0 });
  const pinchRef = useRef({ active: false, dist0: 1, scale0: 1, ox: 50, oy: 50 });
  const stageRef = useRef<HTMLElement | null>(null);

  const reset = useCallback(() => {
    setZoom(IDLE);
    onBlockChange?.(false);
  }, [onBlockChange]);

  useEffect(() => {
    onBlockChange?.(zoom.active);
  }, [zoom.active, onBlockChange]);

  useEffect(() => {
    if (!zoom.active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') reset(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom.active, reset]);

  const zoomAt = useCallback((clientX: number, clientY: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const ox = ((clientX - r.left) / r.width) * 100;
    const oy = ((clientY - r.top) / r.height) * 100;
    setZoom({ active: true, scale: ZOOM_LEVEL, ox, oy, tx: 0, ty: 0 });
  }, []);

  const clampPan = useCallback((tx: number, ty: number, scale: number, el: HTMLElement | null) => {
    if (!el || scale <= 1) return { tx: 0, ty: 0 };
    const r = el.getBoundingClientRect();
    const maxX = (r.width * (scale - 1)) / 2;
    const maxY = (r.height * (scale - 1)) / 2;
    return {
      tx: Math.max(-maxX, Math.min(maxX, tx)),
      ty: Math.max(-maxY, Math.min(maxY, ty)),
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    stageRef.current = e.currentTarget;
    if (zoom.active) {
      panRef.current = { active: true, x0: e.clientX, y0: e.clientY, tx0: zoom.tx, ty0: zoom.ty };
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
  }, [zoom]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!zoom.active || !panRef.current.active) return;
    const dx = e.clientX - panRef.current.x0;
    const dy = e.clientY - panRef.current.y0;
    const next = clampPan(panRef.current.tx0 + dx, panRef.current.ty0 + dy, zoom.scale, e.currentTarget);
    setZoom((z) => ({ ...z, ...next }));
  }, [zoom.active, zoom.scale, clampPan]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (panRef.current.active) {
      panRef.current.active = false;
      setDragging(false);
      return;
    }
    if (zoom.active) return;

    const now = performance.now();
    const dt = now - lastTap.current.t;
    const dist = Math.hypot(e.clientX - lastTap.current.x, e.clientY - lastTap.current.y);
    if (dt < DBL_MS && dist < 28) {
      zoomAt(e.clientX, e.clientY, e.currentTarget);
      lastTap.current.t = 0;
    } else {
      lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    }
  }, [zoom.active, zoomAt]);

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length === 2) {
      const a = e.touches[0], b = e.touches[1];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
      const r = e.currentTarget.getBoundingClientRect();
      const mx = (a.clientX + b.clientX) / 2;
      const my = (a.clientY + b.clientY) / 2;
      pinchRef.current = {
        active: true,
        dist0: dist,
        scale0: zoom.active ? zoom.scale : 1,
        ox: ((mx - r.left) / r.width) * 100,
        oy: ((my - r.top) / r.height) * 100,
      };
      panRef.current.active = false;
      setDragging(true);
    }
  }, [zoom]);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (!pinchRef.current.active || e.touches.length !== 2) return;
    e.preventDefault();
    const a = e.touches[0], b = e.touches[1];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    const scale = Math.max(1, Math.min(3.2, pinchRef.current.scale0 * (dist / pinchRef.current.dist0)));
    if (scale <= 1.05) {
      setZoom(IDLE);
      setDragging(false);
      return;
    }
    setZoom({
      active: true,
      scale,
      ox: pinchRef.current.ox,
      oy: pinchRef.current.oy,
      tx: zoom.tx,
      ty: zoom.ty,
    });
  }, [zoom.tx, zoom.ty]);

  const onTouchEnd = useCallback(() => {
    pinchRef.current.active = false;
    setDragging(false);
    setZoom((z) => (z.scale < 1.08 ? IDLE : z));
  }, []);

  /* fără transform pe stage când nu e zoom — altfel aplatizează perspectiva 3D a paginilor */
  const style: CSSProperties | undefined = zoom.active
    ? {
      transform: `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.scale})`,
      transformOrigin: `${zoom.ox}% ${zoom.oy}%`,
      transition: dragging ? 'none' : `transform ${ANIM_MS}ms ease-out`,
    }
    : undefined;

  return {
    zoom,
    active: zoom.active,
    style,
    reset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: () => { panRef.current.active = false; setDragging(false); },
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
