'use client';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { autoPlaceProducts, emptyPage, makeProductItem, uid, usedProductIds } from '@/lib/autoLayout';
import { canPlace, clampResize, findFirstFit } from '@/lib/collision';
import {
  createDebouncedCatalogSaver,
  duplicateCatalog,
  getActiveCatalogId,
  getCatalog,
  listCatalogs,
  listProducts,
  saveCatalog,
  saveProduct,
  setActiveCatalogId,
  validateForPublish,
} from '@/lib/catalogStore';
import type {
  Catalog,
  CatalogProduct,
  PageItem,
  PageItemType,
  PublishIssue,
  SizePresetId,
} from '@/lib/catalogTypes';
import { SIZE_PRESETS } from '@/lib/catalogTypes';
import BuilderToolbar from './BuilderToolbar';
import ItemInspector from './ItemInspector';
import NewProductModal from './NewProductModal';
import PageCanvas, { clientToGrid } from './PageCanvas';
import PageStrip from './PageStrip';
import ProductDrawer from './ProductDrawer';
import { useCatalogHistory } from './useHistory';

type Ghost = { col: number; row: number; w: number; h: number; ok: boolean } | null;

export default function BuilderApp() {
  const { catalog, setCatalog, reset, undo, redo, canUndo, canRedo, catalogRef } = useCatalogHistory(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sizeByProduct, setSizeByProduct] = useState<Record<string, SizePresetId>>({});
  const [ghost, setGhost] = useState<Ghost>(null);
  const [dragMeta, setDragMeta] = useState<{ w: number; h: number; productId?: string; itemId?: string } | null>(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [issues, setIssues] = useState<PublishIssue[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [mediaActive, setMediaActive] = useState<number | null>(null);
  const [narrow, setNarrow] = useState(false);
  const canvasHost = useRef<HTMLDivElement>(null);
  const saver = useRef(createDebouncedCatalogSaver(500));

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [prods, activeId, list] = await Promise.all([
        listProducts(),
        getActiveCatalogId(),
        listCatalogs(),
      ]);
      if (!alive) return;
      setProducts(prods);
      const id = activeId || list[0]?.id;
      if (!id) return;
      const cat = await getCatalog(id);
      if (cat && alive) {
        reset(cat);
        setPageIndex(0);
      }
    })();
    return () => { alive = false; };
  }, [reset]);

  const persist = useCallback((next: Catalog) => {
    saver.current.schedule(next);
    setSaveMsg('Se salvează…');
    window.setTimeout(() => setSaveMsg('Salvat'), 550);
  }, []);

  const updateCatalog = useCallback((fn: (c: Catalog) => Catalog, opts?: { history?: boolean }) => {
    setCatalog((c) => {
      const next = fn(c);
      persist(next);
      return next;
    }, opts);
  }, [setCatalog, persist]);

  const usedIds = useMemo(
    () => (catalog ? usedProductIds(catalog) : new Set<string>()),
    [catalog],
  );

  const selectedItem = useMemo(() => {
    if (!catalog || !selectedId) return null;
    return catalog.pages[pageIndex]?.items.find((i) => i.id === selectedId) || null;
  }, [catalog, pageIndex, selectedId]);

  const selectedProduct = useMemo(() => {
    if (!selectedItem?.productId) return null;
    return products.find((p) => p.id === selectedItem.productId) || null;
  }, [selectedItem, products]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    updateCatalog((c) => {
      const pages = c.pages.map((p, i) =>
        i === pageIndex ? { ...p, items: p.items.filter((it) => it.id !== selectedId) } : p,
      );
      return { ...c, pages };
    });
    setSelectedId(null);
  }, [selectedId, pageIndex, updateCatalog]);

  /* ---- tastatură: Delete, Ctrl+Z / Ctrl+Shift+Z ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        const c = catalogRef.current;
        if (c) persist(c);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        removeSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, undo, redo, removeSelected, catalogRef, persist]);

  const patchSelected = (patch: Partial<PageItem>) => {
    if (!selectedId || !catalog) return;
    updateCatalog((c) => {
      const pages = c.pages.map((p, i) => {
        if (i !== pageIndex) return p;
        return {
          ...p,
          items: p.items.map((it) => {
            if (it.id !== selectedId) return it;
            const next = { ...it, ...patch };
            if (patch.w != null || patch.h != null) {
              const clamped = clampResize(
                it,
                patch.w ?? it.w,
                patch.h ?? it.h,
                c.grid,
                p.items,
              );
              next.w = clamped.w;
              next.h = clamped.h;
            }
            return next;
          }),
        };
      });
      return { ...c, pages };
    });
  };

  const onDragStart = (e: DragStartEvent) => {
    const d = e.active.data.current as { from?: string; productId?: string; w?: number; h?: number; itemId?: string } | undefined;
    if (!d) return;
    if (d.from === 'drawer' && d.productId) {
      setDragMeta({ w: d.w || 2, h: d.h || 2, productId: d.productId });
    } else if (d.from === 'canvas' && d.itemId) {
      setDragMeta({ w: d.w || 2, h: d.h || 2, itemId: d.itemId });
    }
  };

  const resolveGhost = (ev: { clientX: number; clientY: number }, w: number, h: number, ignoreId?: string) => {
    if (!catalog || !canvasHost.current) return null;
    const pt = clientToGrid(canvasHost.current, ev.clientX, ev.clientY, catalog.grid.cols, catalog.grid.rows);
    if (!pt) return null;
    const col = Math.max(0, Math.min(catalog.grid.cols - w, pt.col));
    const row = Math.max(0, Math.min(catalog.grid.rows - h, pt.row));
    const page = catalog.pages[pageIndex];
    const ok = canPlace({ col, row, w, h }, catalog.grid, page.items, ignoreId);
    return { col, row, w, h, ok };
  };

  const onDragMove = (e: DragMoveEvent) => {
    if (!dragMeta || !e.activatorEvent) return;
    const native = e.activatorEvent as PointerEvent;
    const translated = e.delta;
    const g = resolveGhost(
      { clientX: native.clientX + translated.x, clientY: native.clientY + translated.y },
      dragMeta.w,
      dragMeta.h,
      dragMeta.itemId,
    );
    setGhost(g);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const meta = dragMeta;
    setDragMeta(null);
    const g = ghost;
    setGhost(null);
    if (!meta || !g || !catalog) return;
    if (e.over?.id !== 'page-canvas') return;
    if (!g.ok) return;

    if (meta.productId) {
      const product = products.find((p) => p.id === meta.productId);
      if (!product) return;
      const item = makeProductItem(product, g.col, g.row, { w: g.w, h: g.h });
      updateCatalog((c) => {
        const pages = c.pages.map((p, i) =>
          i === pageIndex ? { ...p, items: [...p.items, item] } : p,
        );
        return { ...c, pages };
      });
      setSelectedId(item.id);
    } else if (meta.itemId) {
      onMoveItem(meta.itemId, g.col, g.row);
    }
  };

  const onResizeItem = (itemId: string, w: number, h: number) => {
    updateCatalog((c) => {
      const pages = c.pages.map((p, i) => {
        if (i !== pageIndex) return p;
        return {
          ...p,
          items: p.items.map((it) => {
            if (it.id !== itemId) return it;
            const clamped = clampResize(it, w, h, c.grid, p.items);
            return { ...it, ...clamped };
          }),
        };
      });
      return { ...c, pages };
    }, { history: true });
  };

  const onMoveItem = (itemId: string, col: number, row: number) => {
    updateCatalog((c) => {
      const page = c.pages[pageIndex];
      const item = page.items.find((i) => i.id === itemId);
      if (!item) return c;
      if (!canPlace({ col, row, w: item.w, h: item.h }, c.grid, page.items, itemId)) return c;
      const pages = c.pages.map((p, i) =>
        i === pageIndex
          ? { ...p, items: p.items.map((it) => (it.id === itemId ? { ...it, col, row } : it)) }
          : p,
      );
      return { ...c, pages };
    });
  };

  /* mutare media prin drag în căsuță */
  const onMediaPointerDown = (itemId: string, slotIndex: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(itemId);
    setMediaActive(slotIndex);
    const startX = e.clientX;
    const startY = e.clientY;
    const page = catalogRef.current?.pages[pageIndex];
    const item = page?.items.find((i) => i.id === itemId);
    if (!item) return;
    const slot = item.media[slotIndex];
    if (!slot) return;
    const origin = { x: slot.x, y: slot.y };
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / 120) * 10;
      const dy = ((ev.clientY - startY) / 120) * 10;
      updateCatalog((c) => {
        const pages = c.pages.map((p, i) => {
          if (i !== pageIndex) return p;
          return {
            ...p,
            items: p.items.map((it) => {
              if (it.id !== itemId) return it;
              const media = it.media.map((m, mi) =>
                mi === slotIndex ? { ...m, x: origin.x + dx, y: origin.y + dy } : m,
              );
              return { ...it, media };
            }),
          };
        });
        return { ...c, pages };
      }, { history: false });
    };
    const onUp = () => {
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const c = catalogRef.current;
      if (c) {
        // un singur pas de istoric la final
        setCatalog(c, { history: true });
        persist(c);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const addBlock = (type: PageItemType) => {
    if (!catalog) return;
    const page = catalog.pages[pageIndex];
    const size = type === 'heading' || type === 'banner'
      ? { w: 4, h: 1 }
      : type === 'text'
        ? { w: 2, h: 1 }
        : { w: 2, h: 2 };
    const spot = findFirstFit(size.w, size.h, catalog.grid, page.items);
    if (!spot) {
      setSaveMsg('Nu încape pe această pagină');
      return;
    }
    const item: PageItem = {
      id: uid('item'),
      type,
      col: spot.col,
      row: spot.row,
      w: size.w,
      h: size.h,
      text: type === 'heading' ? 'Categorie' : type === 'banner' ? 'Ofertă specială' : type === 'text' ? 'Text' : '',
      media: [],
      mediaLayout: 'single',
    };
    updateCatalog((c) => {
      const pages = c.pages.map((p, i) =>
        i === pageIndex ? { ...p, items: [...p.items, item] } : p,
      );
      return { ...c, pages };
    });
    setSelectedId(item.id);
  };

  const onAutoLayout = () => {
    if (!catalog) return;
    const presets: Record<string, (typeof SIZE_PRESETS)[number]> = {};
    Object.entries(sizeByProduct).forEach(([id, pid]) => {
      const p = SIZE_PRESETS.find((x) => x.id === pid);
      if (p) presets[id] = p;
    });
    updateCatalog((c) => autoPlaceProducts(c, products, presets));
  };

  const onDuplicateMag = async () => {
    if (!catalog) return;
    const copy = await duplicateCatalog(catalog.id);
    await setActiveCatalogId(copy.id);
    reset(copy);
    setPageIndex(0);
    setSaveMsg('Revistă duplicată');
  };

  const onPublish = async () => {
    if (!catalog) return;
    const found = validateForPublish(catalog, products);
    setIssues(found);
    if (found.length) return;
    const next = { ...catalog, status: 'published' as const };
    await saveCatalog(next);
    reset(next);
    setSaveMsg('Publicată — vizibilă pe site');
    setIssues([]);
  };

  const onIssueClick = (index: number) => {
    const issue = issues[index];
    if (!issue?.pageId || !catalog) return;
    const pi = catalog.pages.findIndex((p) => p.id === issue.pageId);
    if (pi >= 0) setPageIndex(pi);
    if (issue.itemId) setSelectedId(issue.itemId);
  };

  if (narrow) {
    return (
      <div className="b-phone">
        <p>Folosiți un calculator pentru editare</p>
        <a href="/admin">Înapoi la panou</a>
      </div>
    );
  }

  if (!catalog) {
    return <div className="b-loading">Se încarcă builder-ul…</div>;
  }

  return (
    <div className="b-app" data-theme={catalog.theme}>
      <div className="b-app__nav">
        <a href="/admin">← Panou</a>
        <strong>Constructor revistă</strong>
      </div>

      <BuilderToolbar
        catalog={catalog}
        canUndo={canUndo}
        canRedo={canRedo}
        saveMsg={saveMsg}
        publishIssues={issues.map((i) => i.message)}
        onPatch={(patch) => updateCatalog((c) => ({ ...c, ...patch }))}
        onUndo={() => { undo(); const c = catalogRef.current; if (c) persist(c); }}
        onRedo={() => { redo(); const c = catalogRef.current; if (c) persist(c); }}
        onAutoLayout={onAutoLayout}
        onDuplicate={() => void onDuplicateMag()}
        onPreview={() => window.open('/', '_blank')}
        onPublish={() => void onPublish()}
        onIssueClick={onIssueClick}
        onAddBlock={addBlock}
      />

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDragCancel={() => { setGhost(null); setDragMeta(null); }}
      >
        <div className="b-app__body">
          <ProductDrawer
            products={products}
            usedIds={usedIds}
            sizeByProduct={sizeByProduct}
            onSizeChange={(id, preset) => setSizeByProduct((s) => ({ ...s, [id]: preset }))}
            onNewProduct={() => setNewOpen(true)}
          />

          <div className="b-app__center" ref={canvasHost}>
            <PageCanvas
              catalog={catalog}
              pageIndex={pageIndex}
              products={products}
              selectedItemId={selectedId}
              onSelectItem={(it) => setSelectedId(it?.id || null)}
              ghost={ghost}
              onMoveItem={onMoveItem}
              onResizeItem={onResizeItem}
              mediaEdit={{
                itemId: selectedId,
                activeIndex: mediaActive,
                onMediaPointerDown,
              }}
            />
          </div>

          <ItemInspector
            item={selectedItem}
            product={selectedProduct}
            onChange={patchSelected}
            onRemove={removeSelected}
          />
        </div>
        <DragOverlay>
          {dragMeta?.productId ? (
            <div className="b-drag-ghost">Produs</div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <PageStrip
        catalog={catalog}
        products={products}
        activeIndex={pageIndex}
        onSelect={setPageIndex}
        onAdd={() => {
          updateCatalog((c) => ({ ...c, pages: [...c.pages, emptyPage()] }));
          setPageIndex(catalog.pages.length);
        }}
        onDuplicate={(i) => {
          updateCatalog((c) => {
            const src = c.pages[i];
            const copy = {
              ...src,
              id: uid('page'),
              items: src.items.map((it) => ({ ...it, id: uid('item') })),
            };
            const pages = [...c.pages];
            pages.splice(i + 1, 0, copy);
            return { ...c, pages };
          });
        }}
        onDelete={(i) => {
          updateCatalog((c) => {
            if (c.pages.length <= 1) return c;
            const pages = c.pages.filter((_, idx) => idx !== i);
            return { ...c, pages };
          });
          setPageIndex((pi) => Math.max(0, Math.min(pi, catalog.pages.length - 2)));
        }}
        onReorder={(pages) => updateCatalog((c) => ({ ...c, pages }))}
      />

      <NewProductModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSave={async (p) => {
          await saveProduct(p);
          setProducts((list) => [...list, p]);
        }}
      />
    </div>
  );
}
