/* O pagină de revistă — raport 1:1.414, conținut în cqw. */
'use client';
import { getPageBgCss, resolvePageChrome } from '@/lib/pageChrome';
import type { Product } from '@/lib/types';
import { pageProducts, PageContent, type MagPage, type PageTapHandlers } from './PageLayouts';

interface Props {
  page: MagPage;
  pageNumber: number; /* 1-based */
  side?: 'left' | 'right' | 'single';
  active?: boolean;
  eager?: boolean;
  handlers?: PageTapHandlers;
  mini?: boolean;
  allProducts?: Product[];
}

export default function MagazinePage({
  page, pageNumber, side = 'single', active, eager, handlers, mini, allProducts,
}: Props) {
  const showSgr = !mini && pageProducts(page).some((p) => p.sgr);
  const isCatalog = page.kind === 'catalog';
  const chrome = isCatalog ? resolvePageChrome(page.page) : null;
  const showHeader = !!(chrome?.header?.enabled && chrome.header.text.trim());
  const innerStyle = chrome ? { background: getPageBgCss(chrome.bg) } : undefined;

  return (
    <div
      className={
        `mag-page mag-page--${side}`
        + (active ? ' is-active' : '')
        + (mini ? ' mag-page--mini' : '')
        + (isCatalog ? ' mag-page--catalog' : '')
      }
      data-page={pageNumber}
      aria-hidden={!active && !mini}
    >
      <div className="mag-page__sheet">
        <div
          className={
            'mag-page__inner'
            + (showHeader ? ' has-page-header' : '')
            + (isCatalog ? ' mag-page__inner--catalog' : '')
          }
          style={innerStyle}
        >
          <PageContent
            page={page}
            handlers={mini ? undefined : handlers}
            eager={eager || active}
            allProducts={allProducts}
          />
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
