/* Foaie din constructor — același aspect ca preview (fără chrome de editare). */
'use client';
import type { CatalogPage } from '@/lib/catalogTypes';
import { isMessageItem } from '@/lib/messageBlock';
import {
  pageHeaderClass,
  resolvePageChrome,
} from '@/lib/pageChrome';
import {
  displayAsProduct,
  displayImages,
  normalizeImageLayouts,
  resolvePricePos,
  resolveTextPos,
} from '@/lib/pageItemDisplay';
import type { Product } from '@/lib/types';
import MessageBlock from '@/components/builder/MessageBlock';
import ProductCell from './ProductCell';

export type CatalogPageHandlers = {
  onProduct?: (p: Product) => void;
  highlightId?: string | null;
};

interface Props {
  page: CatalogPage;
  products: Product[];
  handlers?: CatalogPageHandlers;
  eager?: boolean;
}

export default function CatalogPageSheet({ page, products, handlers, eager }: Props) {
  const grid = page.grid;
  if (!grid) return null;

  const productsById = new Map(products.map((p) => [p.id, p]));
  const chrome = resolvePageChrome(page);
  const header = chrome.header;
  const showHeader = !!(header?.enabled && header.text.trim());

  return (
    <div className={'mag-catalog' + (showHeader ? ' has-page-header' : '')}>
      {showHeader && header ? (
        <header
          className={`mag-page-header ${pageHeaderClass(header.style)}`}
          aria-label={header.text.trim()}
        >
          <div className="mag-page-header__badge" aria-hidden="true">
            <span className="mag-page-header__badge-top">TOP</span>
            <span className="mag-page-header__badge-bot">oferte</span>
          </div>
          <div className="mag-page-header__stack">
            <div className="mag-page-header__title-bar">
              <span className="mag-page-header__title">{header.text.trim()}</span>
            </div>
            {header.subtitle?.trim() ? (
              <div className="mag-page-header__sub-bar">
                <span className="mag-page-header__sub">{header.subtitle.trim()}</span>
              </div>
            ) : null}
          </div>
        </header>
      ) : null}

      <div className="mag-catalog__grid-wrap">
        <div
          className="mag-catalog__items"
          style={{
            gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
            gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
          }}
        >
          {page.items.map((item) => {
            const isMsg = isMessageItem(item);
            const base = !isMsg && item.productId ? productsById.get(item.productId) : null;
            if (!isMsg && !base) return null;
            const view = base ? displayAsProduct(base, item) : null;
            const imgs = base ? displayImages(item, base) : [];
            const layouts = base ? normalizeImageLayouts(imgs, item.display?.imageLayouts) : [];
            const cellOverflow = !!(item.display?.overflow || item.overflow);
            const cellVariant = (item.w * item.h >= 4 || grid.cols <= 2) ? 'std' : 'sm';
            const textPos = resolveTextPos(item.display);
            const pricePos = resolvePricePos(item.display);

            return (
              <div
                key={item.id}
                className={'mag-catalog__block' + (isMsg ? ' is-msg' : '')}
                style={{
                  gridColumn: `${item.col + 1} / span ${item.w}`,
                  gridRow: `${item.row + 1} / span ${item.h}`,
                }}
              >
                {isMsg ? (
                  <MessageBlock item={item} />
                ) : view ? (
                  <ProductCell
                    p={view}
                    variant={cellVariant}
                    interactive={!!handlers?.onProduct}
                    eager={eager}
                    images={imgs}
                    imageLayouts={layouts}
                    overflow={cellOverflow}
                    priceLeft={!!item.display?.priceLeft}
                    textPos={textPos}
                    pricePos={pricePos}
                    onProduct={handlers?.onProduct}
                    highlight={handlers?.highlightId === view.id}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Produsele de pe o foaie catalog (pentru căutare / tracking). */
export function catalogPageProducts(page: CatalogPage, products: Product[]): Product[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: Product[] = [];
  const seen = new Set<string>();
  for (const item of page.items) {
    if (!item.productId || seen.has(item.productId)) continue;
    const base = byId.get(item.productId);
    if (!base) continue;
    seen.add(item.productId);
    out.push(displayAsProduct(base, item));
  }
  return out;
}
