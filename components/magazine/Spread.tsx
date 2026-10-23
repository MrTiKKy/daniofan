/* Bandă orizontală: pagina curentă + vecini (±1) + EndPage, swipe. */
'use client';
import type { HomeMagazineSlot } from '@/lib/catalogStore';
import type { Product } from '@/lib/types';
import EndPage from './EndPage';
import MagazinePage from './MagazinePage';
import type { MagPage, PageTapHandlers } from './PageLayouts';
import type { MagView } from './usePageSwipe';

export interface EndPageProps {
  title: string;
  period: string;
  daysLeft: number | null;
  otherMagazine: HomeMagazineSlot | null;
  shareUrl: string;
  onBackToFirst: () => void;
}

interface Props {
  pages: MagPage[];
  views: MagView[];
  viewIndex: number;
  dragProgress: number;
  flipping: 'next' | 'prev' | null;
  flipMs: number;
  reduced: boolean;
  handlers?: PageTapHandlers;
  allProducts?: Product[];
  endPage?: EndPageProps | null;
}

export default function Spread({
  pages, views, viewIndex,
  dragProgress, flipping, flipMs, reduced, handlers, allProducts, endPage,
}: Props) {
  const hasPrev = viewIndex > 0;
  const hasNext = viewIndex < views.length - 1;
  const slots: { view: MagView; index: number }[] = [];
  if (hasPrev) slots.push({ view: views[viewIndex - 1], index: viewIndex - 1 });
  slots.push({ view: views[viewIndex], index: viewIndex });
  if (hasNext) slots.push({ view: views[viewIndex + 1], index: viewIndex + 1 });

  const currentSlot = hasPrev ? 1 : 0;
  let shiftPct = -currentSlot * 100;
  if (flipping === 'next') shiftPct = -(currentSlot + 1) * 100;
  else if (flipping === 'prev') shiftPct = -(currentSlot - 1) * 100;
  else shiftPct = -currentSlot * 100 + dragProgress * 100;

  const animClass = flipping
    ? ` is-sliding-${flipping}`
    : dragProgress !== 0
      ? ' is-dragging'
      : '';

  return (
    <div className="mag-track-wrap">
      <div
        className={`mag-track${animClass}${reduced ? ' mag-track--reduced' : ''}`}
        style={{
          ['--mag-shift' as string]: `${shiftPct}%`,
          ['--mag-slide-ms' as string]: `${flipMs}ms`,
        }}
      >
        {slots.map(({ view, index }) => {
          const active = index === viewIndex;
          if (view.end) {
            return (
              <div key={`end:${index}`} className="mag-slot mag-slot--single" aria-hidden={!active}>
                {endPage ? (
                  <EndPage
                    title={endPage.title}
                    period={endPage.period}
                    daysLeft={endPage.daysLeft}
                    otherMagazine={endPage.otherMagazine}
                    shareUrl={endPage.shareUrl}
                    onBackToFirst={endPage.onBackToFirst}
                  />
                ) : null}
              </div>
            );
          }
          const page1 = view.pages[0];
          return (
            <div key={`${page1}:${index}`} className="mag-slot mag-slot--single" aria-hidden={!active}>
              <MagazinePage
                page={pages[page1 - 1]}
                pageNumber={page1}
                side="single"
                active={active}
                eager
                handlers={active ? handlers : undefined}
                allProducts={allProducts}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
