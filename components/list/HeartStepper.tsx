/* Inimă + cantitate pe căsuța de produs (viewer). */
'use client';
import { useEffect, useRef, useState } from 'react';
import type { MagazineKind } from '@/lib/catalogTypes';
import { MAX_QTY, type ShoppingListDraft } from '@/lib/shoppingList';
import { assetUrl } from '@/lib/store';
import type { Product } from '@/lib/types';
import { useActiveStepper } from './ActiveStepperContext';
import { useFlyToList } from './FlyToList';
import { useAutoCollapse } from './useAutoCollapse';
import { useShoppingList } from './ShoppingListProvider';

interface Props {
  slotId: string;
  magazineType: MagazineKind;
  product: Product;
  imageSrc?: string;
  /** Deschis automat (ex. navigare din bon cu ?produs=) */
  autoExpand?: boolean;
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg className="hstep__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      {filled ? (
        <path
          fill="currentColor"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          d="M12.1 18.55l-.1.1-.11-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"
        />
      )}
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9zm-1 12h12l1-12H5l1 12z"
      />
    </svg>
  );
}

function stop(e: React.SyntheticEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export default function HeartStepper({
  slotId, magazineType, product, imageSrc, autoExpand = false,
}: Props) {
  const { qtyOf, increment, decrement } = useShoppingList();
  const { fly } = useFlyToList();
  const { expand, collapse, isExpanded } = useActiveStepper();
  const qty = qtyOf(slotId);
  const expanded = isExpanded(slotId);
  const rootRef = useRef<HTMLDivElement>(null);
  const [anchorLeft, setAnchorLeft] = useState(false);
  const [pop, setPop] = useState(false);
  const [fillOn, setFillOn] = useState(qty > 0);
  const [burst, setBurst] = useState(false);
  const [qtyDir, setQtyDir] = useState<'up' | 'down' | null>(null);
  const [displayQty, setDisplayQty] = useState(qty);
  const [shake, setShake] = useState(false);
  const [bumpHeart, setBumpHeart] = useState(false);
  const [ripple, setRipple] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const autoDone = useRef(false);
  const labelName = (product.brand || product.name || 'produs').trim();

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (qty > 0) setFillOn(true);
    else setFillOn(false);
  }, [qty]);

  useEffect(() => {
    if (qty === displayQty) return;
    const dir = qty > displayQty ? 'up' : 'down';
    setQtyDir(dir);
    const t = window.setTimeout(() => {
      setDisplayQty(qty);
      setQtyDir(null);
    }, reduced ? 80 : 200);
    return () => window.clearTimeout(t);
  }, [qty, displayQty, reduced]);

  const { bump } = useAutoCollapse(expanded, 3000, collapse, focused);

  useEffect(() => {
    if (!autoExpand || autoDone.current || qty <= 0) return;
    autoDone.current = true;
    expand(slotId);
  }, [autoExpand, qty, slotId, expand]);

  const measureAnchor = () => {
    const el = rootRef.current;
    if (!el) return;
    const page = el.closest('.mag-page, .mag-catalog__block, .mag__stage') as HTMLElement | null;
    const box = el.getBoundingClientRect();
    const pageBox = page?.getBoundingClientRect();
    const rightLimit = pageBox ? pageBox.right - 8 : window.innerWidth - 8;
    /* pastila ~148px; dacă iese în dreapta → ancorează spre stânga */
    setAnchorLeft(box.left + 148 > rightLimit);
  };

  const draft = (): ShoppingListDraft => ({
    slotId,
    productId: product.id,
    magazineType,
    name: product.name,
    brand: product.brand || '',
    size: product.size || '',
    image: imageSrc || product.image || '',
    promoPrice: product.newPrice,
    oldPrice: product.oldPrice,
    validUntil: product.validUntil || '',
  });

  const doFly = (size: number) => {
    const src = imageSrc || product.image || '';
    const rect = rootRef.current?.closest('.mag-cell__img')?.getBoundingClientRect()
      || rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    fly({ from: rect, src: assetUrl(src), size });
  };

  const onHeartTap = () => {
    if (qty <= 0) {
      const result = increment(draft());
      try { navigator.vibrate?.(15); } catch { /* */ }
      setPop(true);
      setFillOn(true);
      setBurst(true);
      doFly(64);
      measureAnchor();
      expand(slotId);
      window.setTimeout(() => setPop(false), reduced ? 120 : 320);
      window.setTimeout(() => setBurst(false), reduced ? 120 : 360);
      bump();
      return;
    }
    if (!expanded) {
      measureAnchor();
      expand(slotId);
      bump();
      return;
    }
    /* deja extins — tap pe inimă resetează timer */
    bump();
  };

  const onPlus = () => {
    if (qty >= MAX_QTY) {
      setShake(true);
      window.setTimeout(() => setShake(false), 400);
      bump();
      return;
    }
    increment(draft());
    setBumpHeart(true);
    setRipple(true);
    doFly(48);
    window.setTimeout(() => setBumpHeart(false), reduced ? 100 : 280);
    window.setTimeout(() => setRipple(false), reduced ? 100 : 280);
    bump();
  };

  const onMinus = () => {
    const result = decrement(slotId);
    if (result.qty <= 0) {
      setFillOn(false);
      collapse();
    }
    bump();
  };

  const empty = qty <= 0;
  const compact = qty > 0 && !expanded;

  return (
    <div
      ref={rootRef}
      className={
        'hstep'
        + (empty ? ' is-empty' : '')
        + (compact ? ' is-compact' : '')
        + (expanded ? ' is-expanded' : '')
        + (anchorLeft ? ' is-anchor-left' : '')
        + (pop ? ' is-pop' : '')
        + (fillOn ? ' is-filled' : '')
        + (shake ? ' is-shake' : '')
        + (bumpHeart ? ' is-bump' : '')
        + (reduced ? ' is-reduced' : '')
      }
      data-heart-stepper={slotId}
      data-viewer-chrome
      role="group"
      aria-label={`Cantitate pentru ${labelName}`}
      onPointerDown={stop}
      onPointerUp={stop}
      onPointerCancel={stop}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
    >
      {expanded ? (
        <button
          type="button"
          className={'hstep__side hstep__minus' + (qty <= 1 ? ' is-trash' : '')}
          aria-label={
            qty <= 1
              ? `Scoate ${labelName} din listă`
              : `Micșorează cantitatea pentru ${labelName}`
          }
          onClick={(e) => { stop(e); onMinus(); }}
        >
          {qty <= 1 ? <TrashIcon /> : '–'}
        </button>
      ) : null}

      <button
        type="button"
        className="hstep__heart"
        aria-label={
          empty
            ? `Adaugă ${labelName} în listă`
            : expanded
              ? `Cantitate ${qty} pentru ${labelName}`
              : `Deschide cantitatea pentru ${labelName}`
        }
        aria-pressed={!empty}
        onClick={(e) => { stop(e); onHeartTap(); }}
      >
        <span className="hstep__circle">
          <span className="hstep__fill" aria-hidden />
          {expanded && qty > 0 ? (
            <span className="hstep__qty-wrap" aria-live="polite">
              <span
                key={`${displayQty}-${qtyDir || 'x'}`}
                className={
                  'hstep__qty'
                  + (qtyDir === 'up' ? ' is-slide-up' : '')
                  + (qtyDir === 'down' ? ' is-slide-down' : '')
                }
              >
                {displayQty}
              </span>
            </span>
          ) : (
            <span className="hstep__glyph">
              <HeartIcon filled={!empty} />
            </span>
          )}
          {burst ? <span className="hstep__burst" aria-hidden /> : null}
        </span>
        {compact && qty >= 2 ? (
          <span className="hstep__badge" aria-hidden>{qty > 99 ? '99' : qty}</span>
        ) : null}
      </button>

      {expanded ? (
        <button
          type="button"
          className={'hstep__side hstep__plus' + (ripple ? ' is-ripple' : '')}
          aria-label={`Mărește cantitatea pentru ${labelName}`}
          disabled={qty >= MAX_QTY}
          onClick={(e) => { stop(e); onPlus(); }}
        >
          +
        </button>
      ) : null}
    </div>
  );
}
