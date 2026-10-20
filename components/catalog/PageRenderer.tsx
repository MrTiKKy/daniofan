'use client';
import type {
  Catalog,
  CatalogGrid,
  CatalogPage,
  CatalogProduct,
  PageItem,
} from '@/lib/catalogTypes';
import { DEFAULT_GRID } from '@/lib/catalogTypes';
import BannerBlock from './BannerBlock';
import HeadingBlock from './HeadingBlock';
import ImageBlock from './ImageBlock';
import ProductBlock from './ProductBlock';
import TextBlock from './TextBlock';

export interface PageRendererHandlers {
  onProduct?: (product: CatalogProduct, item: PageItem) => void;
  onItemClick?: (item: PageItem) => void;
  highlightId?: string | null;
  selectedItemId?: string | null;
  mediaEditItemId?: string | null;
  mediaActiveIndex?: number | null;
  onMediaPointerDown?: (itemId: string, slotIndex: number, e: React.PointerEvent) => void;
}

interface Props {
  page: CatalogPage;
  catalog: Pick<Catalog, 'grid' | 'theme'>;
  productsById: Map<string, CatalogProduct>;
  pageNumber?: number;
  side?: 'left' | 'right' | 'single';
  showMeta?: boolean;
  showGuides?: boolean;
  mini?: boolean;
  handlers?: PageRendererHandlers;
  /** overlay ghost în timpul drag (builder) */
  ghost?: { col: number; row: number; w: number; h: number; ok: boolean } | null;
  className?: string;
}

function ItemView({
  item, productsById, handlers, mini,
}: {
  item: PageItem;
  productsById: Map<string, CatalogProduct>;
  handlers?: PageRendererHandlers;
  mini?: boolean;
}) {
  if (item.type === 'product') {
    const product = item.productId ? productsById.get(item.productId) : undefined;
    if (!product) return <div className="cat-prod"><span className="cat-media__empty">Produs lipsă</span></div>;
    const mediaEdit = !mini && handlers?.mediaEditItemId === item.id && handlers.onMediaPointerDown
      ? {
          activeIndex: handlers.mediaActiveIndex ?? null,
          onMediaPointerDown: (slotIndex: number, e: React.PointerEvent) =>
            handlers.onMediaPointerDown!(item.id, slotIndex, e),
        }
      : undefined;
    return (
      <ProductBlock
        item={item}
        product={product}
        onTap={mini ? undefined : handlers?.onProduct}
        highlight={handlers?.highlightId === product.id}
        mediaEdit={mediaEdit}
      />
    );
  }
  if (item.type === 'heading') return <HeadingBlock item={item} />;
  if (item.type === 'banner') return <BannerBlock item={item} />;
  if (item.type === 'image') return <ImageBlock item={item} productsById={productsById} />;
  if (item.type === 'text') return <TextBlock item={item} />;
  return null;
}

export default function PageRenderer({
  page, catalog, productsById, pageNumber = 1, side = 'single',
  showMeta = true, showGuides = false, mini = false, handlers, ghost, className,
}: Props) {
  const grid: CatalogGrid = catalog.grid || DEFAULT_GRID;
  const cols = Math.max(1, grid.cols);
  const rows = Math.max(1, grid.rows);
  const showSgr = !mini && page.items.some((it) => {
    if (it.type !== 'product' || !it.productId) return false;
    return !!productsById.get(it.productId);
  });

  return (
    <div
      className={`cat-page cat-page--${side}${mini ? ' cat-page--mini' : ''}${className ? ` ${className}` : ''}`}
      data-page={pageNumber}
      data-theme={catalog.theme}
    >
      <div className="cat-page__sheet">
        <div className="cat-page__inner">
          <div
            className={`cat-grid${showGuides ? ' cat-grid--guides' : ''}`}
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              ['--cat-cols' as string]: String(cols),
              ['--cat-rows' as string]: String(rows),
            }}
          >
            {page.items.map((item) => (
              <div
                key={item.id}
                className={`cat-slot${handlers?.selectedItemId === item.id ? ' is-selected' : ''}`}
                data-item-id={item.id}
                style={{
                  gridColumn: `${item.col + 1} / span ${item.w}`,
                  gridRow: `${item.row + 1} / span ${item.h}`,
                }}
                onClick={handlers?.onItemClick && !mini ? (e) => {
                  e.stopPropagation();
                  handlers.onItemClick!(item);
                } : undefined}
              >
                <ItemView item={item} productsById={productsById} handlers={handlers} mini={mini} />
              </div>
            ))}
            {ghost ? (
              <div
                className={`cat-slot ${ghost.ok ? 'cat-slot--drop-ok' : 'cat-slot--drop-bad'} is-ghost`}
                style={{
                  gridColumn: `${ghost.col + 1} / span ${ghost.w}`,
                  gridRow: `${ghost.row + 1} / span ${ghost.h}`,
                }}
              />
            ) : null}
          </div>
          {showMeta && !mini ? (
            <div className="cat-page__meta">
              {showSgr ? <span className="cat-page__sgr">Prețul nu include SGR</span> : <span />}
              <span className="cat-page__folio" aria-hidden="true">{pageNumber}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function buildProductsMap(products: CatalogProduct[]): Map<string, CatalogProduct> {
  return new Map(products.map((p) => [p.id, p]));
}
