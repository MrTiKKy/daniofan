/* Context listă cumpărături — localStorage + sync între taburi. */
'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { MagazineKind } from '@/lib/catalogTypes';
import {
  SHOPPING_LIST_KEY,
  clear as clearList,
  countQty,
  decrementItem,
  emptyList,
  getQty,
  hasSlot,
  incrementItem,
  parseList,
  remove as removeItem,
  restore as restoreItem,
  serializeList,
  setQty as setQtyPure,
  toggleItem,
  totalOld,
  totalPromo,
  type ShoppingListDraft,
  type ShoppingListItem,
} from '@/lib/shoppingList';

interface ShoppingListApi {
  items: ShoppingListItem[];
  count: number;
  totalPromo: number;
  totalOld: number;
  has: (slotId: string) => boolean;
  qtyOf: (slotId: string) => number;
  toggle: (draft: ShoppingListDraft) => { added: boolean };
  setQty: (slotId: string, qty: number) => void;
  increment: (draft: ShoppingListDraft) => { qty: number; added: boolean };
  decrement: (slotId: string) => { qty: number; removed: ShoppingListItem | null };
  remove: (slotId: string) => ShoppingListItem | null;
  restore: (item: ShoppingListItem) => void;
  clear: () => void;
  /** Toast „Produs scos · Anulează” */
  undoItem: ShoppingListItem | null;
  undo: () => void;
  dismissUndo: () => void;
}

const ShoppingListCtx = createContext<ShoppingListApi | null>(null);

function readStored(): ShoppingListItem[] {
  if (typeof window === 'undefined') return emptyList();
  try {
    return parseList(localStorage.getItem(SHOPPING_LIST_KEY));
  } catch {
    return emptyList();
  }
}

function writeStored(list: ShoppingListItem[]) {
  try {
    localStorage.setItem(SHOPPING_LIST_KEY, serializeList(list));
  } catch { /* */ }
}

export function ShoppingListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ShoppingListItem[]>(emptyList);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState<Date | undefined>(undefined);
  const [undoItem, setUndoItem] = useState<ShoppingListItem | null>(null);
  const undoTimer = useRef(0);

  useEffect(() => {
    setNow(new Date());
    setItems(readStored());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === SHOPPING_LIST_KEY) setItems(parseList(e.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearTimeout(undoTimer.current);
    };
  }, []);

  const commit = useCallback((list: ShoppingListItem[]) => {
    writeStored(list);
    setItems(list);
  }, []);

  const scheduleUndo = useCallback((item: ShoppingListItem) => {
    setUndoItem(item);
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndoItem(null), 5000);
  }, []);

  const dismissUndo = useCallback(() => {
    setUndoItem(null);
    window.clearTimeout(undoTimer.current);
  }, []);

  const undo = useCallback(() => {
    setUndoItem((cur) => {
      if (cur) commit(restoreItem(readStored(), cur));
      return null;
    });
    window.clearTimeout(undoTimer.current);
  }, [commit]);

  const toggle = useCallback((draft: ShoppingListDraft) => {
    const result = toggleItem(readStored(), draft);
    commit(result.list);
    return { added: result.added };
  }, [commit]);

  const setQty = useCallback((slotId: string, qty: number) => {
    commit(setQtyPure(readStored(), slotId, qty));
  }, [commit]);

  const increment = useCallback((draft: ShoppingListDraft) => {
    const result = incrementItem(readStored(), draft);
    commit(result.list);
    return { qty: result.qty, added: result.added };
  }, [commit]);

  const decrement = useCallback((slotId: string) => {
    const result = decrementItem(readStored(), slotId);
    commit(result.list);
    if (result.removed) scheduleUndo(result.removed);
    return { qty: result.qty, removed: result.removed };
  }, [commit, scheduleUndo]);

  const remove = useCallback((slotId: string) => {
    const prev = readStored();
    const hit = prev.find((it) => it.slotId === slotId) || null;
    if (!hit) return null;
    commit(removeItem(prev, slotId));
    scheduleUndo(hit);
    return hit;
  }, [commit, scheduleUndo]);

  const restore = useCallback((item: ShoppingListItem) => {
    commit(restoreItem(readStored(), item));
    dismissUndo();
  }, [commit, dismissUndo]);

  const clear = useCallback(() => {
    commit(clearList());
    dismissUndo();
  }, [commit, dismissUndo]);

  const has = useCallback((slotId: string) => hasSlot(items, slotId), [items]);
  const qtyOf = useCallback((slotId: string) => getQty(items, slotId), [items]);

  const live = ready ? items : emptyList();

  const api = useMemo<ShoppingListApi>(() => ({
    items: live,
    count: countQty(live),
    totalPromo: totalPromo(live, now),
    totalOld: totalOld(live, now),
    has,
    qtyOf,
    toggle,
    setQty,
    increment,
    decrement,
    remove,
    restore,
    clear,
    undoItem,
    undo,
    dismissUndo,
  }), [
    live, now, has, qtyOf, toggle, setQty, increment, decrement,
    remove, restore, clear, undoItem, undo, dismissUndo,
  ]);

  return (
    <ShoppingListCtx.Provider value={api}>
      {children}
    </ShoppingListCtx.Provider>
  );
}

const NOOP_API: ShoppingListApi = {
  items: emptyList(),
  count: 0,
  totalPromo: 0,
  totalOld: 0,
  has: () => false,
  qtyOf: () => 0,
  toggle: () => ({ added: false }),
  setQty: () => {},
  increment: () => ({ qty: 0, added: false }),
  decrement: () => ({ qty: 0, removed: null }),
  remove: () => null,
  restore: () => {},
  clear: () => {},
  undoItem: null,
  undo: () => {},
  dismissUndo: () => {},
};

export function useShoppingList(): ShoppingListApi {
  const ctx = useContext(ShoppingListCtx);
  return ctx || NOOP_API;
}

export type { ShoppingListDraft, ShoppingListItem, MagazineKind };
