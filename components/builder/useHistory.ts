'use client';
import { useCallback, useRef, useState } from 'react';
import type { Catalog } from '@/lib/catalogTypes';

const MAX = 50;

export function useCatalogHistory(initial: Catalog | null) {
  const [catalog, setCatalogState] = useState<Catalog | null>(initial);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const past = useRef<Catalog[]>([]);
  const future = useRef<Catalog[]>([]);
  const catalogRef = useRef<Catalog | null>(initial);

  const syncFlags = () => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  };

  const replace = useCallback((next: Catalog | null, pushHistory: boolean) => {
    if (pushHistory && catalogRef.current) {
      past.current = [...past.current.slice(-(MAX - 1)), catalogRef.current];
      future.current = [];
    }
    catalogRef.current = next;
    setCatalogState(next);
    syncFlags();
  }, []);

  const setCatalog = useCallback((next: Catalog | ((prev: Catalog) => Catalog), opts?: { history?: boolean }) => {
    const hist = opts?.history !== false;
    const base = catalogRef.current;
    if (!base && typeof next === 'function') return;
    const resolved = typeof next === 'function' ? next(base!) : next;
    replace(resolved, hist && !!base);
  }, [replace]);

  const reset = useCallback((next: Catalog) => {
    past.current = [];
    future.current = [];
    catalogRef.current = next;
    setCatalogState(next);
    syncFlags();
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev || !catalogRef.current) return;
    future.current.push(catalogRef.current);
    catalogRef.current = prev;
    setCatalogState(prev);
    syncFlags();
  }, []);

  const redo = useCallback(() => {
    const n = future.current.pop();
    if (!n || !catalogRef.current) return;
    past.current.push(catalogRef.current);
    catalogRef.current = n;
    setCatalogState(n);
    syncFlags();
  }, []);

  return {
    catalog,
    catalogRef,
    setCatalog,
    reset,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
