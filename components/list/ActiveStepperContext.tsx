/* Un singur HeartStepper extins pe ecran. */
'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export const COLLAPSE_STEPPER_EVENT = 'daniofan-collapse-stepper';

interface ActiveStepperApi {
  activeId: string | null;
  expand: (slotId: string) => void;
  collapse: () => void;
  isExpanded: (slotId: string) => boolean;
}

const Ctx = createContext<ActiveStepperApi | null>(null);

export function collapseAllSteppers() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(COLLAPSE_STEPPER_EVENT));
}

export function ActiveStepperProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const collapse = useCallback(() => setActiveId(null), []);
  const expand = useCallback((slotId: string) => setActiveId(slotId), []);
  const isExpanded = useCallback((slotId: string) => activeId === slotId, [activeId]);

  useEffect(() => {
    const onCollapse = () => setActiveId(null);
    window.addEventListener(COLLAPSE_STEPPER_EVENT, onCollapse);
    return () => window.removeEventListener(COLLAPSE_STEPPER_EVENT, onCollapse);
  }, []);

  /* tap în afara controlului */
  useEffect(() => {
    if (!activeId) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest(`[data-heart-stepper="${activeId}"]`)) return;
      setActiveId(null);
    };
    /* capture: după gesturi pe butoanele din stepper (bubbling deja oprit) */
    window.addEventListener('pointerdown', onPointer, true);
    return () => window.removeEventListener('pointerdown', onPointer, true);
  }, [activeId]);

  const api = useMemo<ActiveStepperApi>(() => ({
    activeId, expand, collapse, isExpanded,
  }), [activeId, expand, collapse, isExpanded]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useActiveStepper(): ActiveStepperApi {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      activeId: null,
      expand: () => {},
      collapse: () => {},
      isExpanded: () => false,
    };
  }
  return ctx;
}
