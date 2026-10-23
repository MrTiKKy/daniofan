/* Drawer „Lista mea” — bon fiscal (doar citire). */
'use client';
import { useCallback, useEffect, useState } from 'react';
import BottomSheet from '@/components/public/BottomSheet';
import { WhatsappIcon } from '@/components/icons';
import { getPublishedByKind, getStores } from '@/lib/catalogStore';
import { resolveDisplayStore } from '@/lib/nearestStore';
import {
  buildWhatsAppText,
  countQty,
  isOfferExpired,
  type ShoppingListItem,
} from '@/lib/shoppingList';
import { DEMO_PRIMARY_STORE } from '@/lib/storeTypes';
import { collapseAllSteppers } from './ActiveStepperContext';
import Receipt from './Receipt';
import { useShoppingList } from './ShoppingListProvider';

interface Props {
  open: boolean;
  onClose: () => void;
}

function productWord(n: number): string {
  return n === 1 ? 'produs' : 'produse';
}

export default function ShoppingListSheet({ open, onClose }: Props) {
  const { items, clear } = useShoppingList();
  const [now, setNow] = useState<Date | null>(null);
  const [address, setAddress] = useState(DEMO_PRIMARY_STORE.address);
  const [confirmClear, setConfirmClear] = useState(false);

  const qtySum = countQty(items);
  const isEmpty = items.length === 0;

  useEffect(() => {
    if (!open) {
      setConfirmClear(false);
      return;
    }
    collapseAllSteppers();
    setNow(new Date());
    let alive = true;
    void (async () => {
      try {
        const stores = await getStores();
        const s = resolveDisplayStore(stores) || DEMO_PRIMARY_STORE;
        if (alive) setAddress(s.address);
      } catch {
        if (alive) setAddress(DEMO_PRIMARY_STORE.address);
      }
    })();
    return () => { alive = false; };
  }, [open]);

  const onOpenProduct = useCallback(async (item: ShoppingListItem) => {
    const at = now || new Date();
    if (isOfferExpired(item, at)) return;
    onClose();
    let page = 1;
    try {
      const catalog = await getPublishedByKind(item.magazineType);
      if (catalog?.pages?.length) {
        const idx = catalog.pages.findIndex((pg) =>
          pg.items.some((it) => it.id === item.slotId),
        );
        if (idx >= 0) page = idx + 1;
      }
    } catch { /* */ }
    const url = `/revista/${item.magazineType}?pagina=${page}&produs=${encodeURIComponent(item.slotId)}`;
    window.location.assign(url);
  }, [now, onClose]);

  const onWhatsApp = useCallback(() => {
    const site = typeof window !== 'undefined' ? window.location.origin : '';
    const text = buildWhatsAppText(items, site, now || undefined);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }, [items, now]);

  return (
    <BottomSheet
      open={open}
      title="Lista mea"
      subtitle={isEmpty ? undefined : `${qtySum} ${productWord(qtySum)}`}
      onClose={onClose}
      panelClassName="bsheet__panel--tall bsheet__panel--receipt"
      footer={
        <div className="receipt-actions">
          {!isEmpty ? (
            <>
              <button type="button" className="receipt-actions__wa" onClick={onWhatsApp}>
                <span className="receipt-actions__wa-icon" aria-hidden><WhatsappIcon /></span>
                <span>💬 Trimite lista pe WhatsApp</span>
              </button>
              {confirmClear ? (
                <div className="receipt-actions__confirm" role="alertdialog" aria-labelledby="receipt-clear-q">
                  <p id="receipt-clear-q">Ștergi toate produsele din listă?</p>
                  <div className="receipt-actions__confirm-btns">
                    <button
                      type="button"
                      className="receipt-actions__yes"
                      onClick={() => { clear(); setConfirmClear(false); }}
                    >
                      Da, golește
                    </button>
                    <button
                      type="button"
                      className="receipt-actions__no"
                      onClick={() => setConfirmClear(false)}
                    >
                      Renunț
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="receipt-actions__clear"
                  onClick={() => setConfirmClear(true)}
                >
                  Golește lista
                </button>
              )}
            </>
          ) : (
            <button type="button" className="receipt-actions__browse" onClick={onClose}>
              Răsfoiește revista
            </button>
          )}
        </div>
      }
    >
      {now ? (
        <Receipt
          items={items}
          storeAddress={address}
          now={now}
          onOpenItem={onOpenProduct}
        />
      ) : null}
    </BottomSheet>
  );
}
