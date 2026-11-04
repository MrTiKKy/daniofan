'use client';
/* Reviste pe Postgres: Live + Draft-uri + Arhivă; Publică / Retrage / Editează de aici. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  deleteCatalog,
  duplicateCatalog,
  listCatalogs,
  listProducts,
  publishCatalog,
} from '@/lib/catalogStore';
import { clearMagazineBuilderDraft, saveMagazineBuilderDraft } from '@/lib/magazineBuilderStore';
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

function formatUpdated(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}

function cardMeta(item: RevistaCard): string {
  const pages = `${item.pageCount || 0} pag.`;
  const when = formatUpdated(item.updatedAt);
  return when ? `${pages} · ${when}` : pages;
}

function RevistaCardView({
  item,
  products,
  busyId,
  menuId,
  onOpen,
  onEdit,
  onPublish,
  onArchive,
  onDuplicate,
  onDelete,
  onToggleMenu,
}: {
  item: RevistaCard;
  products: Product[];
  busyId: string | null;
  menuId: string | null;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleMenu: (id: string) => void;
}) {
  const busy = busyId === item.id;
  const menuOpen = menuId === item.id;
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
          <span className="a-rev-card__meta">{cardMeta(item)}</span>
        </div>
      </button>
      <div className="a-rev-card__acts">
        <button
          type="button"
          className="a-rev-card__edit"
          disabled={busy}
          onClick={() => onEdit(item.id)}
        >
          Editează
        </button>
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
          <>
            <a
              className="a-rev-card__site"
              href={`/revista/${item.kind}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Vezi pe site
            </a>
            <button
              type="button"
              className="a-rev-card__retract"
              disabled={busy}
              onClick={() => onArchive(item.id)}
            >
              {busy ? '…' : 'Retrage de pe site'}
            </button>
          </>
        )}
        <div className="a-rev-card__more">
          <button
            type="button"
            className="a-rev-card__more-btn"
            aria-expanded={menuOpen}
            aria-label="Mai multe acțiuni"
            disabled={busy}
            onClick={() => onToggleMenu(item.id)}
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="a-rev-card__menu" role="menu">
              <button type="button" role="menuitem" disabled={busy} onClick={() => onDuplicate(item.id)}>
                Duplică
              </button>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                disabled={busy}
                onClick={() => onDelete(item.id)}
              >
                Șterge
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function LivePlaceholder() {
  return (
    <div className="a-rev-live-slot" role="status">
      <span className="a-rev-live-slot__label">Nimic live</span>
      <span className="a-rev-live-slot__hint">Publică un draft ca să apară aici.</span>
    </div>
  );
}

export default function AdminRevistePage() {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState<Partial<Record<MagazineKind, boolean>>>({});
  const [flash, setFlash] = useState<{ msg: string; err?: boolean } | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [list, dbProducts] = await Promise.all([listCatalogs(), listProducts()]);
    setCatalogs(list);
    setProducts(dbProducts.map(catalogProductToOfferProduct));
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await refresh();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [refresh]);

  useEffect(() => {
    if (!menuId) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('.a-rev-card__more')) return;
      setMenuId(null);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [menuId]);

  const viewing = useMemo(
    () => (viewingId ? catalogs.find((c) => c.id === viewingId) || null : null),
    [catalogs, viewingId],
  );

  const showFlash = (msg: string, err?: boolean) => {
    setFlash({ msg, err });
    window.setTimeout(() => setFlash(null), err ? 5000 : 2500);
  };

  const withBusy = async (id: string, fn: () => Promise<void>, okMsg: string) => {
    setBusyId(id);
    setMenuId(null);
    try {
      await fn();
      await refresh();
      showFlash(okMsg);
    } catch (e) {
      showFlash(e instanceof Error ? e.message : 'Operația a eșuat.', true);
    } finally {
      setBusyId(null);
    }
  };

  const onPublish = (id: string) =>
    withBusy(id, () => publishCatalog(id), '✓ Revista e live pe site.');

  const onArchive = (id: string) =>
    withBusy(id, () => archiveCatalog(id), 'Retrasă — mutată în arhivă.');

  const onDuplicate = (id: string) =>
    withBusy(id, async () => { await duplicateCatalog(id); }, 'Copie creată ca draft.');

  const onDelete = (id: string) => {
    if (!window.confirm('Ștergi definitiv revista? Acțiunea nu poate fi anulată.')) return;
    void withBusy(id, () => deleteCatalog(id), 'Revista a fost ștearsă.');
    if (viewingId === id) setViewingId(null);
  };

  const onEdit = (id: string) => {
    const cat = catalogs.find((c) => c.id === id);
    if (!cat) return;
    const kind = normalizeKind(cat.kind);
    saveMagazineBuilderDraft(cat.pages || [], 0, {
      kind,
      title: cat.title,
      start: cat.start,
      end: cat.end,
      permanent: !!cat.permanent,
      catalogId: cat.id,
    });
    router.push('/admin/constructor');
  };

  const onCreate = (kind: MagazineKind) => {
    clearMagazineBuilderDraft();
    router.push(`/admin/constructor?kind=${kind}&new=1`);
  };

  const byKind = useMemo(() => {
    const map = new Map<MagazineKind, {
      live: RevistaCard | null;
      recent: RevistaCard[];
      archive: RevistaCard[];
      total: number;
    }>();

    for (const k of MAGAZINE_KINDS) {
      const all = catalogs
        .filter((c) => normalizeKind(c.kind) === k)
        .map(catalogToCard)
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

      const live = all.find((c) => c.status === 'published') || null;
      const recent = all.filter((c) => c.status === 'draft').slice(0, RECENT_LIMIT);
      const archive = all.filter((c) => c.status === 'archived');

      map.set(k, { live, recent, archive, total: all.length });
    }
    return map;
  }, [catalogs]);

  return (
    <AdminShell active="reviste">
      {flash ? (
        <div className={'a-stores-flash' + (flash.err ? ' is-err' : '')} role="status">
          {flash.msg}
        </div>
      ) : null}

      <div className="a-rev">
        {loading ? (
          MAGAZINE_KINDS.map((kind) => (
            <section key={kind} className="a-rev-section a-rev-section--skeleton" aria-busy="true">
              <div className="a-rev-skel a-rev-skel--title" />
              <div className="a-rev-skel a-rev-skel--card" />
              <div className="a-rev-skel a-rev-skel--line" />
            </section>
          ))
        ) : (
          MAGAZINE_KINDS.map((kind) => {
            const block = byKind.get(kind)!;
            const showArchive = !!archiveOpen[kind];
            const empty = block.total === 0;

            return (
              <section key={kind} className="a-rev-section" aria-labelledby={`rev-${kind}`}>
                <div className="a-rev-section__head">
                  <h2 id={`rev-${kind}`} className="a-rev-section__title">
                    {magazineAdminSectionTitle(kind)}
                  </h2>
                  {!empty ? (
                    <button
                      type="button"
                      className="a-rev-create"
                      onClick={() => onCreate(kind)}
                    >
                      + Creează revistă
                    </button>
                  ) : null}
                </div>

                {empty ? (
                  <div className="a-rev-empty-block">
                    <p className="a-rev-empty-block__text">Nicio revistă salvată încă.</p>
                    <button
                      type="button"
                      className="a-rev-create a-rev-create--primary"
                      onClick={() => onCreate(kind)}
                    >
                      Creează revistă
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="a-rev-live">
                      <h3 className="a-rev-sub">Live pe site</h3>
                      {block.live ? (
                        <div className="a-rev-rail" role="list">
                          <RevistaCardView
                            item={block.live}
                            products={products}
                            busyId={busyId}
                            menuId={menuId}
                            onOpen={setViewingId}
                            onEdit={onEdit}
                            onPublish={onPublish}
                            onArchive={onArchive}
                            onDuplicate={onDuplicate}
                            onDelete={onDelete}
                            onToggleMenu={(id) => setMenuId((cur) => (cur === id ? null : id))}
                          />
                        </div>
                      ) : (
                        <LivePlaceholder />
                      )}
                    </div>

                    <div className="a-rev-recent">
                      <h3 className="a-rev-sub">Draft-uri</h3>
                      {block.recent.length === 0 ? (
                        <p className="a-rev-empty">Niciun draft. Creează o revistă nouă sau duplică una existentă.</p>
                      ) : (
                        <div className="a-rev-rail" role="list">
                          {block.recent.map((item) => (
                            <RevistaCardView
                              key={item.id}
                              item={item}
                              products={products}
                              busyId={busyId}
                              menuId={menuId}
                              onOpen={setViewingId}
                              onEdit={onEdit}
                              onPublish={onPublish}
                              onArchive={onArchive}
                              onDuplicate={onDuplicate}
                              onDelete={onDelete}
                              onToggleMenu={(id) => setMenuId((cur) => (cur === id ? null : id))}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {block.archive.length > 0 ? (
                      <div className="a-rev-archive">
                        <div className="a-rev-archive__head">
                          <h3 className="a-rev-sub">Arhivă</h3>
                          <button
                            type="button"
                            className="a-rev-archive-btn"
                            onClick={() => setArchiveOpen((s) => ({ ...s, [kind]: !s[kind] }))}
                          >
                            {showArchive ? 'Ascunde arhiva' : `Vezi arhiva (${block.archive.length})`}
                          </button>
                        </div>
                        {showArchive ? (
                          <div className="a-rev-rail" role="list">
                            {block.archive.map((item) => (
                              <RevistaCardView
                                key={item.id}
                                item={item}
                                products={products}
                                busyId={busyId}
                                menuId={menuId}
                                onOpen={setViewingId}
                                onEdit={onEdit}
                                onPublish={onPublish}
                                onArchive={onArchive}
                                onDuplicate={onDuplicate}
                                onDelete={onDelete}
                                onToggleMenu={(id) => setMenuId((cur) => (cur === id ? null : id))}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </section>
            );
          })
        )}
      </div>

      {viewing ? (
        <AdminRevistaViewer
          catalog={viewing}
          products={products}
          busy={busyId === viewing.id}
          onClose={() => setViewingId(null)}
          onPublish={onPublish}
          onArchive={onArchive}
          onEdit={() => onEdit(viewing.id)}
          onDuplicate={() => onDuplicate(viewing.id)}
          onDelete={() => onDelete(viewing.id)}
        />
      ) : null}
    </AdminShell>
  );
}
