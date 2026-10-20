/* Machete fixe + căsuțe produs interactive (tap → modal). */
'use client';
import * as DF from '@/lib/store';
import type { OfferData, Product, ResolvedOffer, StoreInfo } from '@/lib/types';
import type { ThemeKey } from '@/lib/themes';
import { CartIcon, PhoneIcon, PinIcon } from '@/components/icons';
import ProductCell from './ProductCell';

export type MagPage =
  | { kind: 'cover'; hero: Product | null; offer: ResolvedOffer; theme: ThemeKey }
  | { kind: 'hero4'; hero: Product; others: Product[] }
  | { kind: 'grid4'; products: Product[] }
  | { kind: 'grid6'; products: Product[] }
  | { kind: 'back'; store: StoreInfo }
  | { kind: 'empty' };

export type PageTapHandlers = {
  onProduct?: (p: Product) => void;
  highlightId?: string | null;
};

type LayoutOpts = PageTapHandlers & { eager?: boolean };

export function buildMagazinePages(data: OfferData, at: Date): MagPage[] {
  const offer = DF.resolveOffer(data, at);
  const list = DF.activeProducts(data, at);
  const theme = (data.offer.theme || 'standard') as ThemeKey;
  const pages: MagPage[] = [];

  if (!list.length) {
    pages.push({ kind: 'empty' });
    pages.push({ kind: 'back', store: data.store });
    return pages;
  }

  const hero = DF.heroOf(list);
  pages.push({ kind: 'cover', hero, offer, theme });

  const rest = list.filter((p) => p !== hero);
  while (rest.length) {
    const n = rest.length;
    if (n >= 6 && (n === 6 || n % 5 === 1)) {
      pages.push({ kind: 'grid6', products: rest.splice(0, 6) });
    } else if (n >= 5) {
      const chunk = rest.splice(0, 5);
      pages.push({ kind: 'hero4', hero: chunk[0], others: chunk.slice(1) });
    } else {
      pages.push({ kind: 'grid4', products: rest.splice(0, n) });
    }
  }

  pages.push({ kind: 'back', store: data.store });
  return pages;
}

export function pageProducts(page: MagPage): Product[] {
  switch (page.kind) {
    case 'cover': return page.hero ? [page.hero] : [];
    case 'hero4': return [page.hero, ...page.others];
    case 'grid4':
    case 'grid6': return page.products;
    default: return [];
  }
}

export function pageProductIds(page: MagPage): string[] {
  return pageProducts(page).map((p) => p.id);
}

/** 1-based page number for product id */
export function findProductPage(pages: MagPage[], productId: string): number {
  const i = pages.findIndex((p) => pageProductIds(p).includes(productId));
  return i < 0 ? 1 : i + 1;
}

export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export type SearchHit = { product: Product; page: number };

export function searchProducts(pages: MagPage[], query: string): SearchHit[] {
  const q = stripDiacritics(query.trim());
  if (!q) return [];
  const out: SearchHit[] = [];
  const seen = new Set<string>();
  pages.forEach((page, i) => {
    pageProducts(page).forEach((p) => {
      if (seen.has(p.id)) return;
      if (stripDiacritics(p.name).includes(q) || stripDiacritics(p.size).includes(q)) {
        seen.add(p.id);
        out.push({ product: p, page: i + 1 });
      }
    });
  });
  return out;
}

function CoverLayout({ page, opts }: { page: Extract<MagPage, { kind: 'cover' }>; opts?: LayoutOpts }) {
  const [small, big] = DF.splitTitle(page.offer.title);
  return (
    <div className="mag-layout mag-layout--cover">
      <div className="mag-cover__logo" role="img" aria-label="Daniofan Market">
        <span className="mag-cover__l1">Daniofan</span>
        <span className="mag-cover__l2">Market<span className="mag-cover__cart"><CartIcon /></span></span>
      </div>
      <div className="mag-cover__title">
        {small ? <span className="mag-cover__t-small">{small}</span> : null}
        <span className="mag-cover__t-big">{big}</span>
        <span className="mag-cover__t-dates">{DF.fmtRange(page.offer.start, page.offer.end)}</span>
      </div>
      {page.theme !== 'standard' ? (
        <div className="mag-cover__theme" data-theme-badge={page.theme}>
          {page.theme === 'paste' ? 'Paște' : 'Crăciun'}
        </div>
      ) : null}
      {page.hero
        ? <ProductCell p={page.hero} variant="hero" eager={opts?.eager} onProduct={opts?.onProduct} highlight={opts?.highlightId === page.hero.id} />
        : <p className="mag-cover__soon">Ofertele noi apar în curând</p>}
    </div>
  );
}

function Hero4Layout({ page, opts }: { page: Extract<MagPage, { kind: 'hero4' }>; opts?: LayoutOpts }) {
  return (
    <div className="mag-layout mag-layout--hero4">
      <ProductCell p={page.hero} variant="hero" eager={opts?.eager} onProduct={opts?.onProduct} highlight={opts?.highlightId === page.hero.id} />
      <div className="mag-layout__grid4">
        {page.others.map((p) => (
          <ProductCell key={p.id} p={p} variant="sm" eager={opts?.eager} onProduct={opts?.onProduct} highlight={opts?.highlightId === p.id} />
        ))}
      </div>
    </div>
  );
}

function GridLayout({ products, cols, opts }: { products: Product[]; cols: 4 | 6; opts?: LayoutOpts }) {
  return (
    <div className={`mag-layout mag-layout--grid${cols}`}>
      {products.map((p) => (
        <ProductCell key={p.id} p={p} variant={cols === 6 ? 'sm' : 'std'} eager={opts?.eager} onProduct={opts?.onProduct} highlight={opts?.highlightId === p.id} />
      ))}
    </div>
  );
}

function BackLayout({ store }: { store: StoreInfo }) {
  return (
    <div className="mag-layout mag-layout--back">
      <div className="mag-back__brand">Daniofan Market</div>
      <p className="mag-back__addr">{store.address}</p>
      <p className="mag-back__hours">{store.hours}</p>
      <p className="mag-back__phone">Telefon: {store.phoneLabel || store.phone}</p>
      <div className="mag-back__notes">
        <span className="mag-back__sgr">Prețul nu include SGR</span>
        <span className="mag-back__stock">ÎN LIMITA STOCULUI DISPONIBIL</span>
      </div>
      <div className="mag-back__actions">
        <a className="mag-back__btn mag-back__btn--call" href={'tel:' + store.phone} onClick={() => DF.track('calls')}>
          <PhoneIcon />Sună la magazin
        </a>
        <a className="mag-back__btn mag-back__btn--map" href={store.mapsUrl} target="_blank" rel="noopener" onClick={() => DF.track('directions')}>
          <PinIcon />Cum ajung
        </a>
      </div>
    </div>
  );
}

function EmptyLayout() {
  return (
    <div className="mag-layout mag-layout--empty">
      <h2>Oferta s-a încheiat</h2>
      <p>Ofertele noi apar în curând, chiar aici.</p>
    </div>
  );
}

export function PageContent({ page, handlers, eager }: { page: MagPage; handlers?: PageTapHandlers; eager?: boolean }) {
  const opts: LayoutOpts = { ...handlers, eager };
  switch (page.kind) {
    case 'cover': return <CoverLayout page={page} opts={opts} />;
    case 'hero4': return <Hero4Layout page={page} opts={opts} />;
    case 'grid4': return <GridLayout products={page.products} cols={4} opts={opts} />;
    case 'grid6': return <GridLayout products={page.products} cols={6} opts={opts} />;
    case 'back': return <BackLayout store={page.store} />;
    case 'empty': return <EmptyLayout />;
  }
}
