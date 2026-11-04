'use client';
/* Constructor — salvează draft pe Postgres; publicarea se face din /admin/reviste. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import MagazineBuilder from '@/components/builder/MagazineBuilder';
import SaveOfferModal, { type SaveOfferValues } from '@/components/admin/SaveOfferModal';
import {
  DEFAULT_GRID,
  MAGAZINE_KINDS,
  magazineAdminSectionTitle,
  isMagazineKind,
  type Catalog,
  type CatalogPage,
  type MagazineKind,
} from '@/lib/catalogTypes';
import { getCatalog, saveCatalog } from '@/lib/catalogStore';
import { uid } from '@/lib/autoLayout';
import {
  clearMagazineBuilderDraft,
  loadMagazineBuilderDraft,
  saveMagazineBuilderDraft,
} from '@/lib/magazineBuilderStore';
import * as DF from '@/lib/store';
import type { OfferData } from '@/lib/types';

function isoToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function AdminConstructorPage() {
  const [data, setData] = useState<OfferData | null>(null);
  const [kind, setKind] = useState<MagazineKind>('weekend');
  const [catalogId, setCatalogId] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState({ title: '', end: '', permanent: false });
  const [saved, setSaved] = useState({ msg: '', err: false, show: false });
  const flashT = useRef<number | undefined>(undefined);
  const publishSourceRef = useRef<(() => { pages: CatalogPage[]; activeIndex: number }) | null>(null);

  const bindPublishSource = useCallback(
    (getState: (() => { pages: CatalogPage[]; activeIndex: number }) | null) => {
      publishSourceRef.current = getState;
    },
    [],
  );

  const flash = useCallback((msg: string, err?: boolean) => {
    setSaved({ msg, err: !!err, show: true });
    window.clearTimeout(flashT.current);
    flashT.current = window.setTimeout(() => setSaved((s) => ({ ...s, show: false })), err ? 5000 : 2200);
  }, []);

  useEffect(() => {
    let alive = true;
    DF.load().then((d) => { if (alive) setData(d); });

    const params = new URLSearchParams(window.location.search);
    const isNew = params.get('new') === '1';
    const kindParam = params.get('kind');

    if (isNew) {
      clearMagazineBuilderDraft();
      setCatalogId(undefined);
      setMeta({ title: '', end: '', permanent: false });
      if (kindParam && isMagazineKind(kindParam)) setKind(kindParam);
      /* Curăță query ca un refresh să nu șteargă din nou draft-ul. */
      window.history.replaceState({}, '', '/admin/constructor');
    } else {
      const draft = loadMagazineBuilderDraft();
      if (draft?.kind) setKind(draft.kind);
      if (draft?.catalogId) setCatalogId(draft.catalogId);
      if (draft) {
        setMeta({
          title: draft.title || '',
          end: draft.end || '',
          permanent: !!draft.permanent,
        });
      } else if (kindParam && isMagazineKind(kindParam)) {
        setKind(kindParam);
      }
    }
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('admin-builder-lock');
    document.body.classList.add('admin-builder-lock');
    const syncChrome = () => {
      const top = document.querySelector('.a-top');
      const h = Math.ceil(top?.getBoundingClientRect().height || 0);
      document.documentElement.style.setProperty('--admin-chrome', `${h || 72}px`);
    };
    syncChrome();
    window.addEventListener('resize', syncChrome);
    return () => {
      window.removeEventListener('resize', syncChrome);
      document.documentElement.classList.remove('admin-builder-lock');
      document.body.classList.remove('admin-builder-lock');
      document.documentElement.style.removeProperty('--admin-chrome');
    };
  }, []);

  const resolved = useMemo(() => (data ? DF.resolveOffer(data) : null), [data]);

  const openSaveModal = () => {
    const live = publishSourceRef.current?.();
    const pages = live?.pages ?? loadMagazineBuilderDraft()?.pages ?? [];
    if (!pages.length) {
      flash('Nu există pagini de salvat.', true);
      return;
    }
    setModalOpen(true);
  };

  const confirmSave = async (values: SaveOfferValues) => {
    const live = publishSourceRef.current?.();
    const pages = live?.pages ?? loadMagazineBuilderDraft()?.pages ?? [];
    const activeIndex = live?.activeIndex ?? loadMagazineBuilderDraft()?.activeIndex ?? 0;
    const withGrid = pages.filter((p) => !!p.grid);
    if (!withGrid.length) {
      flash('Adaugă cel puțin o pagină cu grilă înainte de salvare.', true);
      return;
    }

    setBusy(true);
    try {
      const start = isoToday();
      /* Nu permite end < start (altfel revista publicată nu apare pe home). */
      const end = values.end && values.end >= start ? values.end : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        const p = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      })();
      /* Reia același draft pe Postgres dacă există și încă e draft; altfel id nou.
         La catalog nou: remint id-urile foilor — altfel INSERT lovește PK-ul foilor
         din revista publicată (aceleași page-*). */
      let id = catalogId || uid('cat');
      let pagesToSave = withGrid;
      if (catalogId) {
        const existing = await getCatalog(catalogId);
        if (!existing || existing.status === 'published' || existing.status === 'archived') {
          id = uid('cat');
          pagesToSave = withGrid.map((p) => ({ ...p, id: uid('page') }));
        }
      } else {
        pagesToSave = withGrid.map((p) => ({ ...p, id: uid('page') }));
      }

      const catalog: Catalog = {
        id,
        title: values.title,
        start,
        end,
        theme: 'standard',
        status: 'draft',
        kind,
        permanent: values.permanent,
        grid: { ...(pagesToSave[0].grid || DEFAULT_GRID) },
        pages: pagesToSave,
      };
      await saveCatalog(catalog);

      saveMagazineBuilderDraft(pagesToSave, activeIndex, {
        kind,
        title: values.title,
        start,
        end,
        permanent: values.permanent,
        catalogId: id,
      });
      setCatalogId(id);
      setMeta({ title: values.title, end, permanent: values.permanent });
      setModalOpen(false);
      flash(`✓ Salvată ca draft pe „${magazineAdminSectionTitle(kind)}”. Publică din Reviste.`);
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Salvarea a eșuat.';
      /* Drizzle bagă tot payload-ul în mesaj — taie ca să nu umple ecranul. */
      const msg = raw.length > 220
        ? (raw.includes('duplicate key') || /unique|pkey/i.test(raw)
          ? 'Conflict la salvare (foi deja existente). Încearcă din nou.'
          : `${raw.slice(0, 180)}…`)
        : raw;
      flash(msg, true);
    } finally {
      setBusy(false);
    }
  };

  const onKindChange = (next: MagazineKind) => {
    setKind(next);
    const live = publishSourceRef.current?.();
    const pages = live?.pages ?? loadMagazineBuilderDraft()?.pages;
    const activeIndex = live?.activeIndex ?? loadMagazineBuilderDraft()?.activeIndex ?? 0;
    if (pages?.length) {
      saveMagazineBuilderDraft(pages, activeIndex, { kind: next });
    }
  };

  return (
    <>
      <header className="a-top a-top--builder">
        <div className="a-in a-in--wide">
          <Link className="a-brand" href="/admin" aria-label="Panou angajați">
            <span className="mini-logo"><BrandLogo size="sm" /></span>
          </Link>
          <div className="a-top-actions a-top-actions--compact">
            <label className="a-kind-pick">
              <span className="sr-only">Tip magazin</span>
              <select
                className="a-hbar a-hbar--soft"
                value={kind}
                onChange={(e) => onKindChange(e.target.value as MagazineKind)}
                aria-label="Tip magazin"
              >
                {MAGAZINE_KINDS.map((k) => (
                  <option key={k} value={k}>{magazineAdminSectionTitle(k)}</option>
                ))}
              </select>
            </label>
            <button type="button" className="a-hbar a-hbar--solid" onClick={openSaveModal}>
              Salvează
            </button>
            <Link className="a-hbar a-hbar--soft" href="/admin/reviste">
              ← Reviste
            </Link>
          </div>
        </div>
      </header>

      <main className="a-main a-main--builder" aria-label="Constructor revista">
        <MagazineBuilder
          products={data?.products || []}
          offer={resolved}
          onBindPublishSource={bindPublishSource}
          onProductUpdate={(id, patch) => {
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                products: prev.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
              };
            });
          }}
        />
      </main>

      <SaveOfferModal
        open={modalOpen}
        busy={busy}
        initial={meta}
        confirmLabel="Salvează draft"
        onClose={() => { if (!busy) setModalOpen(false); }}
        onConfirm={(v) => { void confirmSave(v); }}
      />

      <div
        className={'saved' + (saved.show ? ' show' : '') + (saved.err ? ' err' : '')}
        role="status"
      >
        {saved.msg}
      </div>
    </>
  );
}
