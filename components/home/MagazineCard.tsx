'use client';
import Link from 'next/link';
import { DEFAULT_GRID, type CatalogPage, type MagazineKind } from '@/lib/catalogTypes';
import { fmtRange } from '@/lib/store';
import type { Product } from '@/lib/types';
import MagazinePage from '@/components/magazine/MagazinePage';
import { catalogPageProducts } from '@/components/magazine/CatalogPageSheet';

interface Props {
  kind: MagazineKind;
  title: string;
  start: Date;
  end: Date;
  /** Prima foaie din oferta publicată — același aspect ca preview în constructor */
  coverPage: CatalogPage | null;
  products: Product[];
  /** Prima copertă: priority; restul lazy */
  priority?: boolean;
  tilt?: 'left' | 'right';
}

export default function MagazineCard({
  kind, title, start, end, coverPage, products, priority, tilt = 'left',
}: Props) {
  const href = `/revista/${kind}`;
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
    <article className={'home-mag' + (tilt === 'right' ? ' home-mag--tilt-r' : ' home-mag--tilt-l')}>
      <Link
        href={href}
        className="home-mag__cover-link"
        aria-label={`Deschide revista ${title}`}
        onClick={() => {
          try { sessionStorage.setItem('daniofan.home.scroll', String(window.scrollY)); } catch { /* */ }
        }}
      >
        <div className="home-mag__cover">
          {magPage ? (
            <div className="home-mag__page" aria-hidden="true">
              <MagazinePage
                page={magPage}
                pageNumber={1}
                eager={priority}
                allProducts={products}
              />
            </div>
          ) : (
            <div className="home-mag__placeholder" aria-hidden="true">
              <span>{title}</span>
            </div>
          )}
        </div>
      </Link>
      <h2 className="home-mag__title">{title}</h2>
      <p className="home-mag__period">{fmtRange(start, end)}</p>
      <Link
        href={href}
        className="home-mag__btn"
        onClick={() => {
          try { sessionStorage.setItem('daniofan.home.scroll', String(window.scrollY)); } catch { /* */ }
        }}
      >
        Deschide revista →
      </Link>
    </article>
  );
}
