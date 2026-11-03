'use client';
/* Reviste pe Postgres: Live + Recente + Arhivă; Publică / Retrage de aici. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminShell from './AdminShell';
import AdminRevistaCover from './AdminRevistaCover';
import AdminRevistaViewer from './AdminRevistaViewer';
import {
  MAGAZINE_KINDS,
  magazineAdminSectionTitle,
  type Catalog,
  type CatalogPage,
  type CatalogStatus,
  type MagazineKind,
} from '@/lib/catalogTypes';
import {
  archiveCatalog,
  catalogProductToOfferProduct,
  listCatalogs,
  listProducts,
  publishCatalog,
} from '@/lib/catalogStore';
import type { Product } from '@/lib/types';

const RECENT_LIMIT = 8;

type RevistaCard = {
  id: string;
  title: string;
  kind: MagazineKind;
  status: CatalogStatus;
  updatedAt: string;
  pageCount: number;
  coverPage: CatalogPage | null;
  permanent?: boolean;
};

function normalizeKind(kind?: MagazineKind): MagazineKind {
  return kind === 'special' ? 'special' : 'weekend';
}

function countPages(pages: { grid?: unknown }[] | undefined): number {
  return (pages || []).filter((p) => !!p.grid).length;
}

function firstPage(pages: CatalogPage[] | undefined): CatalogPage | null {
  const withGrid = (pages || []).find((p) => !!p.grid);
  return withGrid || pages?.[0] || null;
}

function catalogToCard(c: Catalog): RevistaCard {
  return {
    id: c.id,
    title: c.title?.trim() || 'Fără titlu',
    kind: normalizeKind(c.kind),
    status: c.status === 'published' ? 'published' : c.status === 'archived' ? 'archived' : 'draft',
    updatedAt: c.updatedAt || c.start || '',
    pageCount: countPages(c.pages),
    coverPage: firstPage(c.pages),
    permanent: !!c.permanent,
  };
}

function statusLabel(item: RevistaCard): string {
  if (item.status === 'published') return item.permanent ? 'Live · permanent' : 'Live';
  if (item.status === 'archived') return 'Arhivă';
  return 'Draft';
}

function RevistaCardView({
  item,
  products,
  busyId,
  onOpen,
  onPublish,
  onArchive,
}: {
  item: RevistaCard;
  products: Product[];
  busyId: string | null;
  onOpen: (id: string) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const busy = busyId === item.id;
  return (
    <article className="a-rev-card" role="listitem">
      <button
        type="button"
        className="a-rev-card__open"
        onClick={() => onOpen(item.id)}
        aria-label={`Deschide ${item.title}`}
      >
        <AdminRevistaCover
          coverPage={item.coverPage}
          products={products}
          fallbackLabel={`${item.pageCount || 0} pag.`}
        />
        <div className="a-rev-card__body">
          <strong className="a-rev-card__name">{item.title}</strong>
          <span className={'a-rev-card__status is-' + item.status}>
            {statusLabel(item)}
          </span>
        </div>
      </button>
      <div className="a-rev-card__acts">
        {item.status !== 'published' ? (
          <button
            type="button"
            className="a-rev-card__pub"
            disabled={busy}
            onClick={() => onPublish(item.id)}
          >
            {busy ? '…' : 'Publică'}
          </button>
        ) : (
          <button
            type="button"
            className="a-rev-card__retract"
            disabled={busy}
            onClick={() => onArchive(item.id)}
          >
            {busy ? '…' : 'Retrage de pe site'}
          </button>
        )}
      </div>
    </article>
  );
}

export default function AdminRevistePage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState<Partial<Record<MagazineKind, boolean>>>({});
  const [flash, setFlash] = useState<{ msg: string; err?: boolean } | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [list, dbProducts] = await Promise.all([listCatalogs(), listProducts()]);
    setCatalogs(list);
    setProducts(dbProducts.map(catalogProductToOfferProduct));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const viewing = useMemo(
    () => (viewingId ? catalogs.find((c) => c.id === viewingId) || null : null),
    [catalogs, viewingId],
  );

  const showFlash = (msg: string, err?: boolean) => {
    setFlash({ msg, err });
    window.setTimeout(() => setFlash(null), err ? 5000 : 2500);
  };

  const onPublish = async (id: string) => {
    setBusyId(id);
    try {
      await publishCatalog(id);
      await refresh();
      showFlash('✓ Revista e live pe site.');
    } catch (e) {
      showFlash(e instanceof Error ? e.message : 'Publicarea a eșuat.', true);
    } finally {
      setBusyId(null);
    }
  };

  const onArchive = async (id: string) => {
    setBusyId(id);
    try {
      await archiveCatalog(id);
      await refresh();
      showFlash('Retrasă — mutată în arhivă.');
    } catch (e) {
      showFlash(e instanceof Error ? e.message : 'Retragerea a eșuat.', true);
    } finally {
      setBusyId(null);
    }
  };

  const byKind = useMemo(() => {
    const map = new Map<MagazineKind, {
      live: RevistaCard | null;
      recent: RevistaCard[];
      archive: RevistaCard[];
    }>();

    for (const k of MAGAZINE_KINDS) {
      const all = catalogs
        .filter((c) => normalizeKind(c.kind) === k)
        .map(catalogToCard)
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

      const live = all.find((c) => c.status === 'published') || null;
      const recent = all.filter((c) => c.status !== 'archived').slice(0, RECENT_LIMIT);
      const archive = all.filter((c) => c.status === 'archived');

      map.set(k, { live, recent, archive });
    }
    return map;
  }, [catalogs]);

  return (
    <AdminShell active="reviste" title="Reviste">
      {flash ? (
        <div className={'a-stores-flash' + (flash.err ? ' is-err' : '')} role="status">
          {flash.msg}
        </div>
      ) : null}

      <p className="a-rev-lead">
        Apasă pe o revistă ca să o răsfoiești. De aici le <strong>publici</strong> pe site.
        {' '}
        <Link href="/admin/constructor">Deschide constructorul →</Link>
      </p>

      <div className="a-rev">
        {MAGAZINE_KINDS.map((kind) => {
          const block = byKind.get(kind)!;
          const showArchive = !!archiveOpen[kind];
          return (
            <section key={kind} className="a-rev-section" aria-labelledby={`rev-${kind}`}>
              <h2 id={`rev-${kind}`} className="a-rev-section__title">
                {magazineAdminSectionTitle(kind)}
              </h2>

              <div className="a-rev-live">
                <h3 className="a-rev-sub">Live pe site</h3>
                {block.live ? (
                  <div className="a-rev-rail" role="list">
                    <RevistaCardView
                      item={block.live}
                      products={products}
                      busyId={busyId}
                      onOpen={setViewingId}
                      onPublish={onPublish}
                      onArchive={onArchive}
                    />
                  </div>
                ) : (
                  <p className="a-rev-empty">Nicio revistă publicată pe acest tip.</p>
                )}
              </div>

              <div className="a-rev-recent">
                <div className="a-rev-recent__head">
                  <h3 className="a-rev-sub">Recente salvate</h3>
                  <button
                    type="button"
                    className="a-rev-archive-btn"
                    onClick={() => setArchiveOpen((s) => ({ ...s, [kind]: !s[kind] }))}
                  >
                    {showArchive ? 'Ascunde arhiva' : `Vezi arhiva (${block.archive.length})`}
                  </button>
                </div>
                {block.recent.length === 0 ? (
                  <p className="a-rev-empty">Nicio salvare încă. Folosește constructorul.</p>
                ) : (
                  <div className="a-rev-rail" role="list">
                    {block.recent.map((item) => (
                      <RevistaCardView
                        key={item.id}
                        item={item}
                        products={products}
                        busyId={busyId}
                        onOpen={setViewingId}
                        onPublish={onPublish}
                        onArchive={onArchive}
                      />
                    ))}
                  </div>
                )}
              </div>

              {showArchive ? (
                <div className="a-rev-archive">
                  <h3 className="a-rev-sub">Arhivă</h3>
                  {block.archive.length === 0 ? (
                    <p className="a-rev-empty">Arhiva e goală.</p>
                  ) : (
                    <div className="a-rev-rail" role="list">
                      {block.archive.map((item) => (
                        <RevistaCardView
                          key={item.id}
                          item={item}
                          products={products}
                          busyId={busyId}
                          onOpen={setViewingId}
                          onPublish={onPublish}
                          onArchive={onArchive}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {viewing ? (
        <AdminRevistaViewer
          catalog={viewing}
          products={products}
          busy={busyId === viewing.id}
          onClose={() => setViewingId(null)}
          onPublish={onPublish}
          onArchive={onArchive}
        />
      ) : null}
    </AdminShell>
  );
}
