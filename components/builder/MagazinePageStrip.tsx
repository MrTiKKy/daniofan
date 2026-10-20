'use client';
/* Bandă jos: paginile revistei — previzualizare, adaugă, șterge (cu confirmare dacă are produse). */
import * as DF from '@/lib/store';
import type { CatalogGrid, CatalogPage } from '@/lib/catalogTypes';
import type { Product } from '@/lib/types';

export function createEmptyPage(grid: CatalogGrid): CatalogPage {
  return { id: `page-${crypto.randomUUID().slice(0, 8)}`, items: [], grid: { ...grid } };
}

function productCount(page: CatalogPage): number {
  return page.items.filter((it) => it.type === 'product' && it.productId).length;
}

function gridLabel(page: CatalogPage): string {
  const g = page.grid;
  if (!g) return '';
  return `${g.cols}×${g.rows}`;
}

function PageThumb({
  page,
  index,
  products,
  active,
  onSelect,
  onDelete,
  canDelete,
}: {
  page: CatalogPage;
  index: number;
  products: Product[];
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const thumbs = page.items
    .filter((it) => it.type === 'product' && it.productId)
    .map((it) => byId.get(it.productId!))
    .filter((p): p is Product => !!p)
    .slice(0, 6);
  const n = productCount(page);
  const g = gridLabel(page);
  const cols = page.grid?.cols || 3;
  const rows = page.grid?.rows || 4;

  return (
    <div className={`mag-strip__item${active ? ' is-active' : ''}`}>
      <button type="button" className="mag-strip__thumb" onClick={onSelect} aria-label={`Pagina ${index + 1}`}>
        <div className="mag-strip__sheet" aria-hidden="true">
          {thumbs.length === 0 ? (
            <div
              className="mag-strip__grid"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
            >
              {Array.from({ length: cols * rows }, (_, i) => <span key={i} />)}
            </div>
          ) : (
            <div className={`mag-strip__mosaic mag-strip__mosaic--${Math.min(thumbs.length, 4)}`}>
              {thumbs.slice(0, 4).map((p) => (
                <div key={p.id} className="mag-strip__cell">
                  {p.image
                    ? <img src={DF.imageSrc(p.image)} alt="" />
                    : <span>{(p.brand || p.name || '?').slice(0, 1)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="mag-strip__label">
          Pagina {index + 1}
          {g ? <small>{g}{n > 0 ? ` · ${n}` : ''}</small> : n > 0 ? <small>{n} {n === 1 ? 'produs' : 'produse'}</small> : null}
        </span>
      </button>
      {canDelete ? (
        <button type="button" className="mag-strip__del" onClick={onDelete} aria-label={`Șterge pagina ${index + 1}`}>
          Șterge
        </button>
      ) : null}
    </div>
  );
}

interface Props {
  pages: CatalogPage[];
  activeIndex: number;
  products: Product[];
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
}

export default function MagazinePageStrip({
  pages, activeIndex, products, onSelect, onAdd, onDelete,
}: Props) {
  return (
    <div className="mag-strip" aria-label="Paginile revistei">
      <div className="mag-strip__list">
        {pages.map((page, i) => (
          <PageThumb
            key={page.id}
            page={page}
            index={i}
            products={products}
            active={i === activeIndex}
            onSelect={() => onSelect(i)}
            onDelete={() => onDelete(i)}
            canDelete={pages.length > 1}
          />
        ))}
      </div>
      <button type="button" className="mag-strip__add" onClick={onAdd}>
        + Adaugă pagină
      </button>
    </div>
  );
}

export { productCount };
