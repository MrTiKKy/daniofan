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
          <svg
            className="swipe-hint__icon"
            viewBox="0 0 88 120"
            width="64"
            height="88"
          >
            <g
              fill="#fff"
              stroke="rgba(0,0,0,.45)"
              strokeWidth="2.4"
              strokeLinejoin="round"
            >
              {/* palmă */}
              <path d="M24 58c0-4 3.2-7.2 7.2-7.2h30.6c4 0 7.2 3.2 7.2 7.2v28c0 10.5-8.5 19-19 19h-7c-10.5 0-19-8.5-19-19V58z" />
              {/* arătător — lung, degetul care glisează */}
              <rect x="26" y="4" width="15" height="56" rx="7.5" />
              {/* mijlociu */}
              <rect x="41" y="28" width="14" height="36" rx="7" />
              {/* inelar */}
              <rect x="54" y="34" width="13" height="30" rx="6.5" />
              {/* mic */}
              <rect x="66" y="40" width="12" height="24" rx="6" />
              {/* degetul mare */}
              <path d="M24.5 61C14 54 4.5 58 2.2 66.5c-2.2 8 3.2 15.5 11.2 16.8l11.1 1.8V68c0-2.5 1-4.8 2.6-6.5l-2.6-.5z" />
            </g>
            {/* unghie pe arătător */}
            <ellipse cx="33.5" cy="12" rx="4" ry="5" fill="rgba(0,0,0,.15)" />
          </svg>
        </div>
      ) : null}
      <p className="swipe-hint__pill">Glisează pentru pagina următoare</p>
    </div>
  );
}
