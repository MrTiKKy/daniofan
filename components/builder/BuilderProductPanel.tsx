'use client';
/* Panou stânga: produsele din ofertă, pe 2 coloane, cu căutare + filtre + drag. */
import { useMemo, useState } from 'react';
import * as DF from '@/lib/store';
import { stripDiacritics } from '@/lib/text';
import type { Product, ResolvedOffer } from '@/lib/types';

type ImageFilter = 'all' | 'with' | 'without';
type KindFilter = 'all' | 'hero' | 'promo';

interface Props {
  products: Product[];
  offer: ResolvedOffer | null;
  usedIds: Set<string>;
  draggingId: string | null;
  onDragStart: (product: Product, e: React.PointerEvent) => void;
}

function ProductMini({
  p, offer, used, dragging, onDragStart,
}: {
  p: Product;
  offer: ResolvedOffer | null;
  used: boolean;
  dragging: boolean;
  onDragStart: (e: React.PointerEvent) => void;
}) {
  const d = DF.discountPct(p.oldPrice, p.newPrice);
  const { brand, title } = DF.productBrandTitle(p);
  const label = [brand, title].filter(Boolean).join(' ') || 'Fără nume';
  const st = offer ? DF.productStatus(p, offer) : null;

  return (
    <article
      className={
        'bp-card'
        + (p.hero ? ' is-hero' : '')
        + (st === 'expirat' ? ' is-expired' : '')
        + (used ? ' is-used' : '')
        + (dragging ? ' is-dragging' : '')
      }
      data-product-id={p.id}
    >
      <button
        type="button"
        className="bp-card__drag"
        disabled={used}
        onPointerDown={used ? undefined : onDragStart}
        aria-label={used ? `${label} — deja pe o pagină` : `Trage ${label} pe pagină`}
      >
        <div className="bp-card__media">
          {d ? <span className="bp-card__disc">{`-${d}%`}</span> : null}
          {used ? <span className="bp-card__used">Pe pagină</span> : null}
          <div className="bp-card__img">
            {p.image
              ? <img src={DF.imageSrc(p.image)} alt="" loading="lazy" decoding="async" draggable={false} />
              : <span className="bp-card__noimg">Fără poză</span>}
          </div>
        </div>
        <div className="bp-card__body">
          <h3 className="bp-card__name" title={label}>{label}</h3>
          {p.size ? <p className="bp-card__meta" title={p.size}>{p.size}</p> : null}
          <div className="bp-card__prices">
            {+p.oldPrice > 0 ? <span className="bp-card__was">{DF.fmtPriceRo(p.oldPrice)}</span> : null}
            <span className="bp-card__now">{+p.newPrice > 0 ? DF.fmtPriceRo(p.newPrice) : '—'}</span>
          </div>
        </div>
      </button>
    </article>
  );
}

export default function BuilderProductPanel({
  products, offer, usedIds, draggingId, onDragStart,
}: Props) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [imageFilter, setImageFilter] = useState<ImageFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const c = (p.category || '').trim();
      if (c) set.add(c);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'ro'));
  }, [products]);

  const filtered = useMemo(() => {
    const needle = stripDiacritics(q.trim());
    return products.filter((p) => {
      if (category !== 'all' && (p.category || '').trim() !== category) return false;
      if (imageFilter === 'with' && !p.image) return false;
      if (imageFilter === 'without' && p.image) return false;
      if (kindFilter === 'hero' && !p.hero) return false;
      if (kindFilter === 'promo' && !(+p.oldPrice > 0 && +p.newPrice > 0 && +p.newPrice < +p.oldPrice)) return false;
      if (!needle) return true;
      const hay = stripDiacritics(
        [p.name, p.brand || '', p.size, p.category, p.variants || '', p.specialLabel || ''].join(' '),
      );
      return hay.includes(needle);
    });
  }, [products, q, category, imageFilter, kindFilter]);

  return (
    <aside className="bp-panel" aria-label="Produse pentru revistă">
      <div className="bp-panel__head">
        <h2>Produse</h2>
        <span className="bp-panel__count">{filtered.length}/{products.length}</span>
      </div>

      <div className="bp-filters">
        <label className="bp-filters__search">
          <span className="sr-only">Caută produs</span>
          <input
            type="search"
            placeholder="Caută nume, brand, gramaj…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="bp-filters__field">
          <span>Categorie</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Toate</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="bp-filters__field">
          <span>Poză</span>
          <select value={imageFilter} onChange={(e) => setImageFilter(e.target.value as ImageFilter)}>
            <option value="all">Toate</option>
            <option value="with">Cu poză</option>
            <option value="without">Fără poză</option>
          </select>
        </label>
        <label className="bp-filters__field">
          <span>Tip</span>
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as KindFilter)}>
            <option value="all">Toate</option>
            <option value="hero">Vedete</option>
            <option value="promo">Cu reducere</option>
          </select>
        </label>
      </div>

      <div className="bp-panel__grid">
        {filtered.length === 0 ? (
          <p className="bp-panel__empty">
            {products.length === 0
              ? 'Nu există produse. Adaugă-le din tab-ul Produse.'
              : 'Niciun produs nu potrivește filtrele.'}
          </p>
        ) : (
          filtered.map((p) => (
            <ProductMini
              key={p.id}
              p={p}
              offer={offer}
              used={usedIds.has(p.id)}
              dragging={draggingId === p.id}
              onDragStart={(e) => onDragStart(p, e)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
