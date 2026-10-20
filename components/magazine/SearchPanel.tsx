/* Căutare produse fără diacritice. */
'use client';
import { useMemo, useState } from 'react';
import * as DF from '@/lib/store';
import type { MagPage } from './PageLayouts';
import { searchProducts } from './PageLayouts';

interface Props {
  open: boolean;
  pages: MagPage[];
  onClose: () => void;
  onJump: (page1: number, productId: string) => void;
}

export default function SearchPanel({ open, pages, onClose, onJump }: Props) {
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchProducts(pages, q), [pages, q]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="mag-drawer__scrim" aria-label="Închide căutarea" onClick={onClose} />
      <aside className="mag-drawer mag-drawer--search" role="dialog" aria-label="Caută produs">
        <div className="mag-drawer__head">
          <h2>Caută</h2>
          <button type="button" className="mag-drawer__close" aria-label="Închide" onClick={onClose}>×</button>
        </div>
        <label className="mag-search__field">
          <span className="sr-only">Caută produs</span>
          <input
            type="search"
            placeholder="Caută produs…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {q ? (
            <button type="button" className="mag-search__clear" aria-label="Șterge" onClick={() => setQ('')}>×</button>
          ) : null}
        </label>
        <ul className="mag-search__list">
          {q && !hits.length ? <li className="mag-search__empty">Niciun produs găsit.</li> : null}
          {hits.map(({ product: p, page }) => (
            <li key={p.id}>
              <button
                type="button"
                className="mag-search__hit"
                onClick={() => { onJump(page, p.id); onClose(); setQ(''); }}
              >
                <span className="mag-search__img">
                  {p.image
                    ? <img src={DF.assetUrl(p.image)} alt="" loading="lazy" width={72} height={72} />
                    : null}
                </span>
                <span className="mag-search__meta">
                  <strong>{p.name}</strong>
                  <span>{DF.fmtPrice(p.newPrice)} lei · pagina {page}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
