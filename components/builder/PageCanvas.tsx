'use client';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useRef } from 'react';
import PageRenderer, { buildProductsMap } from '@/components/catalog/PageRenderer';
import type { Catalog, CatalogProduct, PageItem } from '@/lib/catalogTypes';

interface Props {
  catalog: Catalog;
  pageIndex: number;
  products: CatalogProduct[];
  selectedItemId: string | null;
  onSelectItem: (item: PageItem | null) => void;
  ghost: { col: number; row: number; w: number; h: number; ok: boolean } | null;
  onMoveItem: (itemId: string, col: number, row: number) => void;
  onResizeItem: (itemId: string, w: number, h: number) => void;
  mediaEdit: {
    itemId: string | null;
    activeIndex: number | null;
    onMediaPointerDown: (itemId: string, slotIndex: number, e: React.PointerEvent) => void;
  };
}

export default function PageCanvas({
  catalog, pageIndex, products, selectedItemId, onSelectItem,
  ghost, onResizeItem, mediaEdit,
}: Props) {
  const page = catalog.pages[pageIndex];
  const wrapRef = useRef<HTMLDivElement>(null);
  const { setNodeRef, isOver } = useDroppable({ id: 'page-canvas' });
  const productsById = buildProductsMap(products);
  const selected = page?.items.find((i) => i.id === selectedItemId) || null;

  const onResizePointerDown = (e: React.PointerEvent) => {
    if (!selected) return;
    e.preventDefault();
    e.stopPropagation();
    const startW = selected.w;
    const startH = selected.h;
    const startX = e.clientX;
    const startY = e.clientY;
    const el = wrapRef.current?.querySelector('.cat-grid') as HTMLElement | null;
    if (!el) return;
    const cellW = el.getBoundingClientRect().width / catalog.grid.cols;
    const cellH = el.getBoundingClientRect().height / catalog.grid.rows;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const dw = Math.round((ev.clientX - startX) / cellW);
      const dh = Math.round((ev.clientY - startY) / cellH);
      onResizeItem(selected.id, Math.max(1, startW + dw), Math.max(1, startH + dh));
    };
    const onUp = () => {
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!page) return <div className="b-canvas__empty">Nu există pagină.</div>;

  return (
    <div
      className={`b-canvas${isOver ? ' is-over' : ''}`}
      ref={(n) => { setNodeRef(n); wrapRef.current = n; }}
      onClick={() => onSelectItem(null)}
      data-grid-point="1"
    >
      <div className="b-canvas__page">
        <PageRenderer
          page={page}
          catalog={catalog}
          productsById={productsById}
          pageNumber={pageIndex + 1}
          showGuides
          handlers={{
            selectedItemId,
            onItemClick: (item) => onSelectItem(item),
            mediaEditItemId: mediaEdit.itemId,
            mediaActiveIndex: mediaEdit.activeIndex,
            onMediaPointerDown: mediaEdit.onMediaPointerDown,
          }}
          ghost={ghost}
        />
        {selected ? (
          <ResizeOverlay
            item={selected}
            cols={catalog.grid.cols}
            rows={catalog.grid.rows}
            onResizePointerDown={onResizePointerDown}
          />
        ) : null}
      </div>
    </div>
  );
}

function ResizeOverlay({
  item, cols, rows, onResizePointerDown,
}: {
  item: PageItem;
  cols: number;
  rows: number;
  onResizePointerDown: (e: React.PointerEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `item-${item.id}`,
    data: {
      from: 'canvas',
      itemId: item.id,
      w: item.w,
      h: item.h,
    },
  });
  const left = (item.col / cols) * 100;
  const top = (item.row / rows) * 100;
  const width = (item.w / cols) * 100;
  const height = (item.h / rows) * 100;
  return (
    <div
      ref={setNodeRef}
      className={`b-resize${isDragging ? ' is-dragging' : ''}`}
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
      {...listeners}
      {...attributes}
    >
      <button type="button" className="b-resize__handle" aria-label="Redimensionează" onPointerDown={onResizePointerDown} />
    </div>
  );
}

export function clientToGrid(
  canvasEl: HTMLElement,
  clientX: number,
  clientY: number,
  cols: number,
  rows: number,
): { col: number; row: number } | null {
  const grid = canvasEl.querySelector('.cat-grid') as HTMLElement | null;
  if (!grid) return null;
  const r = grid.getBoundingClientRect();
  if (clientX < r.left || clientY < r.top || clientX > r.right || clientY > r.bottom) {
    // încă permitem snap lângă margine
  }
  const col = Math.floor(((clientX - r.left) / r.width) * cols);
  const row = Math.floor(((clientY - r.top) / r.height) * rows);
  return {
    col: Math.max(0, Math.min(cols - 1, col)),
    row: Math.max(0, Math.min(rows - 1, row)),
  };
}
