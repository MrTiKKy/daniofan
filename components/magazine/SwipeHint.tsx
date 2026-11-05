/* Hint swipe — doar la prima vizită (localStorage). */
'use client';
import { useEffect, useState } from 'react';

export const SWIPE_HINT_KEY = 'daniofan_swipe_hint_seen';

interface Props {
  active: boolean;
  reducedMotion: boolean;
  onDismiss: () => void;
  /** Pornit când hint-ul e vizibil (pentru peek pe pagină) */
  onPeekChange?: (peeking: boolean) => void;
  registerGesture?: (cb: () => void) => (() => void) | void;
}

function markSeen() {
  try { localStorage.setItem(SWIPE_HINT_KEY, '1'); } catch { /* */ }
}

function alreadySeen(): boolean {
  try { return localStorage.getItem(SWIPE_HINT_KEY) === '1'; } catch { return true; }
}

export default function SwipeHint({
  active, reducedMotion, onDismiss, onPeekChange, registerGesture,
}: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active || alreadySeen()) return;
    const t = window.setTimeout(() => setShow(true), 800);
    return () => window.clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (!show) {
      onPeekChange?.(false);
      return;
    }
    onPeekChange?.(true);
    const auto = window.setTimeout(() => {
      markSeen();
      setShow(false);
      onPeekChange?.(false);
      onDismiss();
    }, 4000);
    return () => {
      window.clearTimeout(auto);
      onPeekChange?.(false);
    };
  }, [show, onDismiss, onPeekChange]);

  useEffect(() => {
    if (!show || !registerGesture) return;
    return registerGesture(() => {
      markSeen();
      setShow(false);
      onPeekChange?.(false);
      onDismiss();
    });
  }, [show, registerGesture, onDismiss, onPeekChange]);

  if (!show) return null;

  return (
    <div
      className={'swipe-hint' + (reducedMotion ? ' is-reduced' : '')}
      role="status"
      aria-live="polite"
      data-viewer-chrome
      onPointerDown={(e) => {
        e.stopPropagation();
        markSeen();
        setShow(false);
        onPeekChange?.(false);
        onDismiss();
      }}
    >
      {!reducedMotion ? (
        <div className="swipe-hint__hand" aria-hidden="true">
          <span className="swipe-hint__ripple" />
          {/* Lucide `pointer` — mână cu arătătorul ridicat (ISC) */}
          <svg
            className="swipe-hint__icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="64"
            height="64"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 14a8 8 0 0 1-8 8" />
            <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
            <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
            <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
            <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
        </div>
      ) : null}
      <p className="swipe-hint__pill">Glisează pentru pagina următoare</p>
    </div>
  );
}
