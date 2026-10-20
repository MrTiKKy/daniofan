'use client';
import { useLayoutEffect, useRef } from 'react';
import { displayLabel, fmtPriceRo, unitPriceLine } from '@/lib/catalogPricing';
import type { CatalogProduct, PageItem } from '@/lib/catalogTypes';
import MediaArea from './MediaArea';

interface Props {
  item: PageItem;
  product: CatalogProduct;
  onTap?: (product: CatalogProduct, item: PageItem) => void;
  highlight?: boolean;
  mediaEdit?: {
    activeIndex: number | null;
    onMediaPointerDown: (slotIndex: number, e: React.PointerEvent) => void;
  };
}

/** Micșorează fontul până textul încape complet (fără tăiere). */
function fitToBox(el: HTMLElement | null, floorPx = 7) {
  if (!el) return;
  el.style.fontSize = '';
  const max = parseFloat(getComputedStyle(el).fontSize);
  if (!(max > 0) || !(el.clientWidth > 0)) return;

  let lo = floorPx;
  let hi = max;
  let best = floorPx;
  // căutare binară — încape în lățime + înălțime (max 2 rânduri)
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    el.style.fontSize = `${mid}px`;
    const ok = el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1;
    if (ok) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  el.style.fontSize = `${best}px`;
}

export default function ProductBlock({ item, product, onTap, highlight, mediaEdit }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const brandRef = useRef<HTMLParagraphElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const leiRef = useRef<HTMLSpanElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);

  const promo = item.promoPrice ?? 0;
  const [lei, ban] = fmtPriceRo(promo).split(',');
  const label = displayLabel(item, product);
  const unit = unitPriceLine(product, promo);
  const isPct = label && /^-\d+%$/.test(label);
  const area = Math.max(1, item.w * item.h);
  const narrow = item.w <= 1;

  useLayoutEffect(() => {
    const fitAll = () => {
      fitToBox(brandRef.current, narrow ? 7 : 8);
      fitToBox(nameRef.current, 7);
      const now = nowRef.current;
      const leiEl = leiRef.current;
      if (!now || !leiEl) return;
      leiEl.style.fontSize = '';
      const banEl = now.querySelector('.cat-prod__ban') as HTMLElement | null;
      if (banEl) banEl.style.fontSize = '';
      const max = parseFloat(getComputedStyle(leiEl).fontSize);
      if (!(max > 0)) return;
      let lo = Math.min(12, max);
      let hi = max;
      let best = lo;
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        leiEl.style.fontSize = `${mid}px`;
        if (banEl) banEl.style.fontSize = `${mid * 0.48}px`;
        if (now.scrollWidth <= now.clientWidth + 1) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      leiEl.style.fontSize = `${best}px`;
      if (banEl) banEl.style.fontSize = `${best * 0.48}px`;
    };
    fitAll();
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => fitAll());
    ro.observe(root);
    return () => ro.disconnect();
  }, [product.brand, product.name, product.details, promo, item.w, item.h, label, narrow]);

  return (
    <article
      ref={rootRef}
      className={`cat-prod${narrow ? ' cat-prod--narrow' : ''}${highlight ? ' is-highlight' : ''}`}
      data-id={product.id}
      data-cols={item.w}
      data-rows={item.h}
      data-area={area}
      style={{
        ['--cat-cols' as string]: String(item.w),
        ['--cat-rows' as string]: String(item.h),
        ['--cat-area' as string]: String(area),
      }}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
      onClick={onTap ? () => onTap(product, item) : undefined}
      onKeyDown={onTap ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(product, item); } } : undefined}
    >
      <div className="cat-prod__media">
        <MediaArea
          product={product}
          media={item.media}
          layout={item.mediaLayout}
          overflow={item.overflow}
          activeIndex={mediaEdit?.activeIndex}
          onMediaPointerDown={mediaEdit?.onMediaPointerDown}
        />
      </div>
      <div className="cat-prod__foot">
        <div className="cat-prod__text">
          <p className="cat-prod__brand" ref={brandRef}>{product.brand}</p>
          {product.name ? <p className="cat-prod__name" ref={nameRef}>{product.name}</p> : null}
          {product.details ? <p className="cat-prod__detail">{product.details}</p> : null}
          {unit ? <p className="cat-prod__detail cat-prod__detail--unit">{unit}</p> : null}
        </div>
        <div className="cat-prod__price">
          <div className="cat-prod__badge-row">
            {item.sponsored ? <span className="cat-prod__badge cat-prod__badge--sponsored">Sponsorizat</span> : null}
            {label
              ? <span className={`cat-prod__badge${isPct ? '' : ' cat-prod__badge--special'}`}>{label}</span>
              : null}
            {product.normalPrice > 0 && promo > 0 && promo < product.normalPrice
              ? <span className="cat-prod__was">{fmtPriceRo(product.normalPrice)}</span>
              : null}
          </div>
          {promo > 0 ? (
            <div className="cat-prod__now" ref={nowRef} aria-label={`${lei},${ban} lei`}>
              <span className="cat-prod__lei" ref={leiRef}>{lei}</span>
              <span className="cat-prod__ban">,{ban}</span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
