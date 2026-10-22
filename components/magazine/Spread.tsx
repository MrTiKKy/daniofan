/* Strip orizontal: spread curent + vecini (±1) lipite, deja randate. */
'use client';
import type { Product } from '@/lib/types';
import MagazinePage from './MagazinePage';
import type { MagPage, PageTapHandlers } from './PageLayouts';
import type { MagView } from './useFlip';

interface Props {
  pages: MagPage[];
  view: MagView;
  views: MagView[];
  viewIndex: number;
  dragProgress: number;
  flipping: 'next' | 'prev' | null;
  flipMs: number;
  reduced: boolean;
  handlers?: PageTapHandlers;
  allProducts?: Product[];
}

function Slot({
  view, pages, active, eager, handlers, allProducts,
}: {
  view: MagView;
  pages: MagPage[];
  active: boolean;
  eager: boolean;
  handlers?: PageTapHandlers;
  allProducts?: Product[];
}) {
  const alone = view.pages.length === 1;
  const left = alone ? null : view.pages[0];
  const right = alone ? view.pages[0] : view.pages[1];

  return (
    <div className={`mag-slot${alone ? ' mag-slot--single' : ' mag-slot--pair'}`} aria-hidden={!active}>
      {left != null ? (
        <MagazinePage
          page={pages[left - 1]}
          pageNumber={left}
          side="left"
          active={active}
          eager={eager}
          handlers={active ? handlers : undefined}
          allProducts={allProducts}
        />
      ) : null}
      {right != null ? (
        <MagazinePage
          page={pages[right - 1]}
          pageNumber={right}
          side={alone ? 'single' : 'right'}
          active={active}
          eager={eager}
          handlers={active ? handlers : undefined}
          allProducts={allProducts}
        />
      ) : null}
    </div>
  );
}

export default function Spread({
  pages, views, viewIndex,
  dragProgress, flipping, flipMs, reduced, handlers, allProducts,
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
        {slots.map(({ view, index }) => (
          <Slot
            key={view.pages.join('-') + ':' + index}
            view={view}
            pages={pages}
            active={index === viewIndex}
            eager
            handlers={handlers}
            allProducts={allProducts}
          />
        ))}
      </div>
    </div>
  );
}
