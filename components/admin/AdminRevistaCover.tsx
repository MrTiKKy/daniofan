'use client';
/* Preview copertă = prima foaie, același rendering ca pe panoul clienți. */
import { DEFAULT_GRID, type CatalogPage } from '@/lib/catalogTypes';
import type { Product } from '@/lib/types';
import MagazinePage from '@/components/magazine/MagazinePage';
import { catalogPageProducts } from '@/components/magazine/CatalogPageSheet';

interface Props {
  coverPage: CatalogPage | null;
  products: Product[];
  fallbackLabel?: string;
}

export default function AdminRevistaCover({ coverPage, products, fallbackLabel }: Props) {
  const page = coverPage
    ? (coverPage.grid ? coverPage : { ...coverPage, grid: DEFAULT_GRID })
    : null;
  const magPage = page
    ? {
        kind: 'catalog' as const,
        page,
        products: catalogPageProducts(page, products),
      }
    : null;

  return (
    <div className="a-rev-card__cover">
      {magPage ? (
        <div className="a-rev-card__page" aria-hidden="true">
          <MagazinePage
            page={magPage}
            pageNumber={1}
            eager
            allProducts={products}
          />
        </div>
      ) : (
        <span className="a-rev-card__placeholder">{fallbackLabel || '—'}</span>
      )}
    </div>
  );
}
