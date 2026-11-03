'use client';
/* Viewer simplu pe Reviste: foaie cu ← → + Editează / Publică / Retrage. */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_GRID, type Catalog, type CatalogStatus } from '@/lib/catalogTypes';
import { saveMagazineBuilderDraft } from '@/lib/magazineBuilderStore';
import type { Product } from '@/lib/types';
import MagazinePage from '@/components/magazine/MagazinePage';
import { catalogPageProducts } from '@/components/magazine/CatalogPageSheet';

interface Props {
  catalog: Catalog;
  products: Product[];
  busy?: boolean;
  onClose: () => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
}

function statusLabel(status: CatalogStatus, permanent?: boolean): string {
  if (status === 'published') return permanent ? 'Live · permanent' : 'Live';
  if (status === 'archived') return 'Arhivă';
  return 'Draft';
}

export default function AdminRevistaViewer({
  catalog,
  products,
  busy,
  onClose,
  onPublish,
  onArchive,
}: Props) {
  const router = useRouter();
  const pages = useMemo(
    () => (catalog.pages || []).filter((p) => !!p.grid || (p.items && p.items.length)),
    [catalog.pages],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [catalog.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(pages.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pages.length]);

  const page = pages[index];
  const magPage = page
    ? {
        kind: 'catalog' as const,
        page: page.grid ? page : { ...page, grid: catalog.grid || DEFAULT_GRID },
        products: catalogPageProducts(
          page.grid ? page : { ...page, grid: catalog.grid || DEFAULT_GRID },
          products,
        ),
      }
    : null;

  const goEdit = () => {
    const kind = catalog.kind === 'special' ? 'special' : 'weekend';
    saveMagazineBuilderDraft(catalog.pages || [], 0, {
      kind,
      title: catalog.title,
      start: catalog.start,
      end: catalog.end,
      permanent: !!catalog.permanent,
      catalogId: catalog.id,
    });
    router.push('/admin/constructor');
  };

  return (
    <div
      className="a-rev-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={catalog.title || 'Previzualizare revistă'}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className="a-rev-viewer__panel">
        <header className="a-rev-viewer__head">
          <div className="a-rev-viewer__titles">
            <strong>{catalog.title || 'Fără titlu'}</strong>
            <span className={'a-rev-card__status is-' + catalog.status}>
              {statusLabel(catalog.status, catalog.permanent)}
            </span>
          </div>
          <button type="button" className="a-rev-viewer__x" aria-label="Închide" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="a-rev-viewer__stage">
          <button
            type="button"
            className="a-rev-viewer__nav"
            disabled={index <= 0}
            aria-label="Pagina anterioară"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            ←
          </button>

          <div className="a-rev-viewer__sheet">
            {magPage ? (
              <MagazinePage
                page={magPage}
                pageNumber={index + 1}
                eager
                allProducts={products}
              />
            ) : (
              <p className="a-rev-empty">Nicio pagină de afișat.</p>
            )}
          </div>

          <button
            type="button"
            className="a-rev-viewer__nav"
            disabled={index >= pages.length - 1}
            aria-label="Pagina următoare"
            onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
          >
            →
          </button>
        </div>

        <p className="a-rev-viewer__pager">
          {pages.length ? `Pagina ${index + 1} / ${pages.length}` : '0 pagini'}
        </p>

        <footer className="a-rev-viewer__foot">
          <button type="button" className="btn a-ghost" disabled={busy} onClick={goEdit}>
            Editează
          </button>
          {catalog.status !== 'published' ? (
            <button
              type="button"
              className="btn a-add"
              disabled={busy}
              onClick={() => onPublish(catalog.id)}
            >
              {busy ? '…' : 'Publică'}
            </button>
          ) : (
            <button
              type="button"
              className="btn a-ghost"
              style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
              disabled={busy}
              onClick={() => onArchive(catalog.id)}
            >
              {busy ? '…' : 'Retrage'}
            </button>
          )}
          <button type="button" className="btn a-ghost" disabled={busy} onClick={onClose}>
            Închide
          </button>
        </footer>
      </div>
    </div>
  );
}
