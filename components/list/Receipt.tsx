/* Bon fiscal — doar citire. */
'use client';
import { useEffect, useState } from 'react';
import {
  countQty,
  formatLei,
  formatReceiptDateTime,
  savings,
  sortedByRecent,
  totalOld,
  totalPromo,
  type ShoppingListItem,
} from '@/lib/shoppingList';
import ReceiptBarcode from './ReceiptBarcode';
import ReceiptDivider from './ReceiptDivider';
import ReceiptLine from './ReceiptLine';

interface Props {
  items: ShoppingListItem[];
  storeAddress: string;
  now: Date;
  onOpenItem: (item: ShoppingListItem) => void;
}

function useCountUp(target: number, ms = 500, play: boolean): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!play) {
      setValue(target);
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(target);
      return;
    }
    const from = 0;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - (1 - p) ** 3;
      setValue(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, play]);
  return value;
}

export default function Receipt({ items, storeAddress, now, onOpenItem }: Props) {
  const ordered = sortedByRecent(items);
  const isEmpty = items.length === 0;
  const sumOld = totalOld(items, now);
  const sumPromo = totalPromo(items, now);
  const sumSave = savings(items, now);
  const qtySum = countQty(items);
  const animatedSave = useCountUp(sumSave, 500, !isEmpty);
  const seed = items.map((it) => `${it.slotId}:${it.qty}`).join('|') || 'empty';

  return (
    <div className="receipt">
      <div className="receipt__print">
      <div className="receipt__paper">
        <header className="receipt__head">
          <p className="receipt__brand">DANIOFAN MARKET</p>
          {storeAddress ? <p className="receipt__addr">{storeAddress}</p> : null}
          <p className="receipt__list-title">LISTA MEA DE CUMPĂRĂTURI</p>
          <p className="receipt__date">{formatReceiptDateTime(now)}</p>
        </header>

        <ReceiptDivider />

        {isEmpty ? (
          <div className="receipt__empty">
            <p>LISTA E GOALĂ</p>
            <p>Apasă ♡ pe produsele din revistă</p>
          </div>
        ) : (
          <div className="receipt__items">
            {ordered.map((item, i) => (
              <ReceiptLine
                key={item.slotId}
                item={item}
                now={now}
                index={i}
                onOpen={onOpenItem}
              />
            ))}
          </div>
        )}

        {!isEmpty ? (
          <>
            <ReceiptDivider />
            <div className="receipt__totals">
              <div className="receipt__tot-row">
                <span>SUBTOTAL FĂRĂ REDUCERE</span>
                <span className="receipt__was">{formatLei(sumOld)}</span>
              </div>
              <div className="receipt__tot-row receipt__tot-row--pay">
                <span>TOTAL DE PLATĂ</span>
                <span className="receipt__pay">
                  {formatLei(sumPromo)} <small>LEI</small>
                </span>
              </div>
            </div>
            <ReceiptDivider double />
            <p className="receipt__save" aria-live="polite">
              ★ AȚI ECONOMISIT {formatLei(animatedSave)} LEI ★
            </p>
            <p className="receipt__meta">NR. PRODUSE: {qtySum}</p>
          </>
        ) : null}

        <p className="receipt__thanks">VĂ MULȚUMIM!</p>
        <p className="receipt__note">LISTA NU SE POATE COMANDA ONLINE</p>
        <ReceiptBarcode seed={seed} />
      </div>
      </div>
    </div>
  );
}
