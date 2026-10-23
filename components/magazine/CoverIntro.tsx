/* Intro animat pe copertă — o dată pe sesiune / tip, skip la tap/swipe. */
'use client';
import { useEffect, useRef, useState } from 'react';
import type { MagazineKind } from '@/lib/catalogTypes';

export function introStorageKey(kind: MagazineKind) {
  return `daniofan_intro_${kind}`;
}

function introAlreadySeen(kind: MagazineKind): boolean {
  try {
    return sessionStorage.getItem(introStorageKey(kind)) === '1';
  } catch {
    return true;
  }
}

function markIntroSeen(kind: MagazineKind) {
  try {
    sessionStorage.setItem(introStorageKey(kind), '1');
  } catch { /* */ }
}

/** True dacă URL-ul are ?pagina= explicit (inclusiv pagina=1 sau final). */
export function urlHasExplicitPagina(): boolean {
  if (typeof window === 'undefined') return true;
  return new URLSearchParams(window.location.search).has('pagina');
}

interface Props {
  kind: MagazineKind;
  /** false = nu rula (deep-link, deja văzut, etc.) */
  enabled: boolean;
  reducedMotion: boolean;
  children: React.ReactNode;
  onDone: () => void;
}

type Phase = 'wait' | 'play' | 'done';

const INTRO_MS = 900;
const REDUCED_MS = 150;
const IMG_TIMEOUT_MS = 1500;

export default function CoverIntro({
  kind, enabled, reducedMotion, children, onDone,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>(() => (enabled ? 'wait' : 'done'));
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = (mark: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (mark) markIntroSeen(kind);
    setPhase('done');
    document.documentElement.classList.remove(
      'cover-intro-active',
      'cover-intro-page',
      'cover-intro-chrome',
    );
    onDoneRef.current();
  };

  useEffect(() => {
    if (!enabled) {
      finish(false);
      return;
    }
    if (introAlreadySeen(kind)) {
      finish(false);
      return;
    }

    let cancelled = false;
    let playTimer = 0;
    let chromeTimer = 0;
    let endTimer = 0;
    let imgTimer = 0;

    const startPlay = () => {
      if (cancelled || doneRef.current) return;
      setPhase('play');
      document.documentElement.classList.add('cover-intro-active');

      if (reducedMotion) {
        endTimer = window.setTimeout(() => finish(true), REDUCED_MS);
        return;
      }

      /* 150ms: bg deja vizibil via .cover-intro-active */
      playTimer = window.setTimeout(() => {
        document.documentElement.classList.add('cover-intro-page');
      }, 150);
      chromeTimer = window.setTimeout(() => {
        document.documentElement.classList.add('cover-intro-chrome');
      }, 700);
      endTimer = window.setTimeout(() => finish(true), INTRO_MS);
    };

    const waitImages = async () => {
      const root = rootRef.current;
      const imgs = root
        ? Array.from(root.querySelectorAll('img'))
        : [];
      const decodeAll = Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return (img.decode?.() ?? Promise.resolve()).catch(() => undefined);
        }),
      );
      await Promise.race([
        decodeAll,
        new Promise<void>((r) => {
          imgTimer = window.setTimeout(r, IMG_TIMEOUT_MS);
        }),
      ]);
      if (!cancelled) startPlay();
    };

    void waitImages();

    return () => {
      cancelled = true;
      window.clearTimeout(playTimer);
      window.clearTimeout(chromeTimer);
      window.clearTimeout(endTimer);
      window.clearTimeout(imgTimer);
      document.documentElement.classList.remove(
        'cover-intro-active',
        'cover-intro-page',
        'cover-intro-chrome',
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish pe mount o singură dată
  }, [enabled, kind, reducedMotion]);

  const skip = () => {
    if (phase === 'done' || phase === 'wait') {
      if (phase === 'wait') finish(true);
      return;
    }
    finish(true);
  };

  return (
    <div
      ref={rootRef}
      className={
        'cover-intro'
        + (phase === 'play' ? ' is-playing' : '')
        + (phase === 'done' ? ' is-done' : '')
        + (reducedMotion ? ' is-reduced' : '')
      }
      onPointerDown={(e) => {
        if (phase !== 'play' && phase !== 'wait') return;
        e.stopPropagation();
        skip();
      }}
    >
      {children}
    </div>
  );
}
