/* Cuprins vizual — grilă de miniaturi + rând Final. */
'use client';
import { useEffect, useRef } from 'react';
import type { Product } from '@/lib/types';
import BottomSheet from '@/components/public/BottomSheet';
import PageThumbnail from './PageThumbnail';
import type { MagPage } from './PageLayouts';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  pages: MagPage[];
  currentPage: number;
  isOnEnd?: boolean;
  allProducts?: Product[];
  onSelectPage: (page1: number) => void;
  onSelectEnd?: () => void;
}

export default function PagesSheet({
  open, onClose, title, pages, currentPage, isOnEnd,
  allProducts, onSelectPage, onSelectEnd,
}: Props) {
  const currentRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLButtonElement>(null);
  const count = pages.length;
  const subtitle = `${title} · ${count} ${count === 1 ? 'pagină' : 'pagini'}`;

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const el = isOnEnd ? endRef.current : currentRef.current;
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [open, currentPage, isOnEnd]);

  return (
    <BottomSheet open={open} title="Toate paginile" onClose={onClose}>
      <p className="pages-sheet__sub">{subtitle}</p>
      <div className="pages-sheet__grid" role="list">
        {pages.map((page, i) => {
          const page1 = i + 1;
          const isCurrent = !isOnEnd && page1 === currentPage;
          return (
            <div key={page1} role="listitem">
              <PageThumbnail
                page={page}
                pageNumber={page1}
                current={isCurrent}
                allProducts={allProducts}
                onSelect={onSelectPage}
                currentRef={isCurrent ? currentRef : undefined}
              />
            </div>
          );
        })}
      </div>
      {onSelectEnd ? (
        <button
          ref={endRef}
          type="button"
          className={'pages-sheet__final' + (isOnEnd ? ' is-current' : '')}
          aria-label="Mergi la final"
          aria-current={isOnEnd ? 'page' : undefined}
          onClick={onSelectEnd}
        >
          Final ✓
        </button>
      ) : null}
    </BottomSheet>
  );
}
