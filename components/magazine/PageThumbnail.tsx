/* Miniatură pagină reală (MagazinePage scalată), lazy via IntersectionObserver. */
'use client';
import { useEffect, useRef, useState } from 'react';
import type { Product } from '@/lib/types';
import MagazinePage from './MagazinePage';
import type { MagPage } from './PageLayouts';
import { pageCategoryLabel } from './pageCategory';

/** Lățime „nativă” a foii înainte de scale — cqw-urile paginii rămân corecte. */
const BASE_W = 360;
const BASE_H = BASE_W * 1.414;

interface Props {
  page: MagPage;
  pageNumber: number;
  current: boolean;
  allProducts?: Product[];
  onSelect: (page1: number) => void;
  /** Ref pe butonul paginii curente — pentru scrollIntoView la deschidere */
  currentRef?: React.Ref<HTMLButtonElement>;
}

export default function PageThumbnail({
  page, pageNumber, current, allProducts, onSelect, currentRef,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0.4);
  const category = pageCategoryLabel(page);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { root: el.closest('.bsheet__body') ?? null, rootMargin: '120px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / BASE_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <button
      ref={current ? currentRef : undefined}
      type="button"
      className={'pthumb' + (current ? ' is-current' : '')}
      aria-label={`Mergi la pagina ${pageNumber}`}
      aria-current={current ? 'page' : undefined}
      onClick={() => onSelect(pageNumber)}
    >
      <div className="pthumb__frame" ref={frameRef}>
        {visible ? (
          <div
            className="pthumb__scaler"
            style={{
              width: BASE_W,
              height: BASE_H,
              transform: `scale(${scale})`,
            }}
            aria-hidden="true"
          >
            <MagazinePage
              page={page}
              pageNumber={pageNumber}
              side="single"
              mini
              eager={false}
              allProducts={allProducts}
            />
          </div>
        ) : (
          <div className="pthumb__ph" aria-hidden="true" />
        )}
        {current ? <span className="pthumb__here">Ești aici</span> : null}
      </div>
      <span className="pthumb__label">Pagina {pageNumber}</span>
      {category ? <span className="pthumb__cat">{category}</span> : null}
    </button>
  );
}
