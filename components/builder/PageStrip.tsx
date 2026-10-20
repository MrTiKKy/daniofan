'use client';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PageRenderer, { buildProductsMap } from '@/components/catalog/PageRenderer';
import type { Catalog, CatalogProduct } from '@/lib/catalogTypes';

interface Props {
  catalog: Catalog;
  products: CatalogProduct[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onReorder: (pages: Catalog['pages']) => void;
}

function Thumb({
  catalog, pageIndex, products, active, onSelect, onDuplicate, onDelete,
}: {
  catalog: Catalog;
  pageIndex: number;
  products: CatalogProduct[];
  active: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const page = catalog.pages[pageIndex];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const map = buildProductsMap(products);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`b-strip__item${active ? ' is-active' : ''}${isDragging ? ' is-dragging' : ''}`}
    >
      <button type="button" className="b-strip__thumb" onClick={onSelect} {...attributes} {...listeners}>
        <div className="b-strip__scale">
          <PageRenderer
            page={page}
            catalog={catalog}
            productsById={map}
            pageNumber={pageIndex + 1}
            mini
            showMeta={false}
          />
        </div>
        <span className="b-strip__label">Pagina {pageIndex + 1}</span>
      </button>
      <div className="b-strip__actions">
        <button type="button" className="b-btn b-btn--sm" onClick={onDuplicate}>Duplică</button>
        <button type="button" className="b-btn b-btn--sm b-btn--danger" onClick={onDelete} disabled={catalog.pages.length <= 1}>Șterge</button>
      </div>
    </div>
  );
}

export default function PageStrip({
  catalog, products, activeIndex, onSelect, onAdd, onDuplicate, onDelete, onReorder,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = catalog.pages.findIndex((p) => p.id === active.id);
    const newIndex = catalog.pages.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(catalog.pages, oldIndex, newIndex));
  };

  return (
    <div className="b-strip">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={catalog.pages.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
          <div className="b-strip__list">
            {catalog.pages.map((_, i) => (
              <Thumb
                key={catalog.pages[i].id}
                catalog={catalog}
                pageIndex={i}
                products={products}
                active={i === activeIndex}
                onSelect={() => onSelect(i)}
                onDuplicate={() => onDuplicate(i)}
                onDelete={() => onDelete(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button type="button" className="b-btn b-btn--primary b-strip__add" onClick={onAdd}>+ Pagină</button>
    </div>
  );
}
