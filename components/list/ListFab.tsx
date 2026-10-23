/* Buton plutitor „Lista mea” — apare când lista nu e goală. */
'use client';
import { useEffect, useState } from 'react';
import { fmtLei } from '@/lib/shoppingList';
import { useFlyToList } from './FlyToList';
import ShoppingListSheet from './ShoppingListSheet';
import { useShoppingList } from './ShoppingListProvider';

function productWord(n: number): string {
  if (n === 1) return 'produs';
  return 'produse';
}

export default function ListFab() {
  const { count, totalPromo } = useShoppingList();
  const { bumpToken, fabAnchorRef } = useFlyToList();
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const [countAnim, setCountAnim] = useState(false);
  const [visible, setVisible] = useState(count > 0);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 359px)');
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (count > 0) {
      setVisible(true);
      document.documentElement.classList.add('has-list-fab');
      return;
    }
    document.documentElement.classList.remove('has-list-fab');
    const t = window.setTimeout(() => setVisible(false), 300);
    return () => window.clearTimeout(t);
  }, [count]);

  useEffect(() => {
    if (!bumpToken) return;
    setBump(true);
    setCountAnim(true);
    const a = window.setTimeout(() => setBump(false), 320);
    const b = window.setTimeout(() => setCountAnim(false), 280);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [bumpToken]);

  useEffect(() => () => {
    document.documentElement.classList.remove('has-list-fab');
  }, []);

  /* Sheet rămâne montat cât e deschis, chiar dacă lista s-a golit */
  if (!visible && count === 0 && !open) return null;

  const price = fmtLei(totalPromo);
  const label = narrow
    ? `🛒 Lista mea · ${count} · ${price} lei`
    : `🛒 Lista mea · ${count} ${productWord(count)} · ${price} lei`;

  return (
    <>
      {visible || count > 0 ? (
        <button
          ref={(el) => { fabAnchorRef.current = el; }}
          type="button"
          className={
            'list-fab'
            + (count > 0 ? ' is-shown' : ' is-hiding')
            + (bump ? ' is-bump' : '')
          }
          aria-label={`Lista mea, ${count} ${productWord(count)}, ${price} lei`}
          onClick={() => setOpen(true)}
        >
          <span className={'list-fab__text' + (countAnim ? ' is-tick' : '')}>
            {label}
          </span>
        </button>
      ) : null}

      <ShoppingListSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
