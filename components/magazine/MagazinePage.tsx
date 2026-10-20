/* O pagină de revistă — raport 1:1.414, conținut în cqw. */
'use client';
import { pageProducts, PageContent, type MagPage, type PageTapHandlers } from './PageLayouts';

interface Props {
  page: MagPage;
  pageNumber: number; /* 1-based */
  side?: 'left' | 'right' | 'single';
  active?: boolean;
  eager?: boolean;
  handlers?: PageTapHandlers;
  mini?: boolean;
}

export default function MagazinePage({
  page, pageNumber, side = 'single', active, eager, handlers, mini,
}: Props) {
  const showSgr = !mini && pageProducts(page).some((p) => p.sgr);
  return (
    <div
      className={`mag-page mag-page--${side}${active ? ' is-active' : ''}${mini ? ' mag-page--mini' : ''}`}
      data-page={pageNumber}
      aria-hidden={!active && !mini}
    >
      <div className="mag-page__sheet">
        <div className="mag-page__inner">
          <PageContent page={page} handlers={mini ? undefined : handlers} eager={eager || active} />
          {!mini ? (
            <div className="mag-page__meta">
              {showSgr ? <span className="mag-page__sgr">Prețul nu include SGR</span> : <span />}
              <span className="mag-page__folio" aria-hidden="true">{pageNumber}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
