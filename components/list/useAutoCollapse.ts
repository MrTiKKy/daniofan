/* Cronometru auto-strângere — resetat la fiecare interacțiune. */
'use client';
import { useCallback, useEffect, useRef } from 'react';

export function useAutoCollapse(
  active: boolean,
  ms: number,
  onCollapse: () => void,
  /** Nu strânge cât timp e focus pe control (tastatură). */
  paused = false,
): { bump: () => void; clear: () => void } {
  const timer = useRef(0);
  const onCollapseRef = useRef(onCollapse);
  onCollapseRef.current = onCollapse;

  const clear = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = 0;
  }, []);

  const bump = useCallback(() => {
    clear();
    if (!active || paused || ms <= 0) return;
    timer.current = window.setTimeout(() => {
      timer.current = 0;
      onCollapseRef.current();
    }, ms);
  }, [active, paused, ms, clear]);

  useEffect(() => {
    if (!active || paused) {
      clear();
      return;
    }
    bump();
    return clear;
  }, [active, paused, bump, clear]);

  useEffect(() => () => clear(), [clear]);

  return { bump, clear };
}
