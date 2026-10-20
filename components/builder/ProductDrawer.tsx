'use client';
import { useDraggable } from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import { assetUrl } from '@/lib/store';
import { suggestSizeFromImage } from '@/lib/catalogPricing';
import type { CatalogProduct, SizePreset, SizePresetId } from '@/lib/catalogTypes';
import { SIZE_PRESETS } from '@/lib/catalogTypes';
import { stripDiacritics } from '@/lib/text';

interface Props {
  products: CatalogProduct[];
  usedIds: Set<string>;
  sizeByProduct: Record<string, SizePresetId>;
  onSizeChange: (productId: string, preset: SizePresetId) => void;
  onNewProduct: () => void;
}

function presetOf(id: SizePresetId): SizePreset {
  return SIZE_PRESETS.find((p) => p.id === id) || SIZE_PRESETS[1];
}

function DraggableProduct({
  product, presetId, onSizeChange,
}: {
  product: CatalogProduct;
  presetId: SizePresetId;
  onSizeChange: (id: string, p: SizePresetId) => void;
}) {
  const preset = presetOf(presetId);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `drawer-${product.id}`,
    data: {
      from: 'drawer',
      productId: product.id,
      w: preset.w,
      h: preset.h,
    },
  });
  const thumb = product.images[0];

  return (
    <div className={`b-drawer__card${isDragging ? ' is-dragging' : ''}`} ref={setNodeRef}>
      <button type="button" className="b-drawer__drag" {...listeners} {...attributes} aria-label={`Trage ${product.brand}`}>
        <div className="b-drawer__thumb">
          {thumb ? <img src={assetUrl(thumb.src)} alt="" /> : <span>Fără poză</span>}
        </div>
        <div className="b-drawer__meta">
          <strong>{product.brand}</strong>
          <span>{product.details || product.name}</span>
        </div>
      </button>
      <label className="b-drawer__size">
        <span>Mărime</span>
        <select
          value={presetId}
          onChange={(e) => onSizeChange(product.id, e.target.value as SizePresetId)}
        >
          {SIZE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default function ProductDrawer({
  products, usedIds, sizeByProduct, onSizeChange, onNewProduct,
}: Props) {
  const [q, setQ] = useState('');
  const available = useMemo(() => {
    const needle = stripDiacritics(q.trim());
    return products.filter((p) => {
      if (usedIds.has(p.id)) return false;
      if (!needle) return true;
      const hay = stripDiacritics(`${p.brand} ${p.name} ${p.details}`);
      return hay.includes(needle);
    });
  }, [products, usedIds, q]);

  return (
    <aside className="b-drawer" aria-label="Produse">
      <div className="b-drawer__head">
        <h2>Produse</h2>
        <button type="button" className="b-btn b-btn--primary" onClick={onNewProduct}>Produs nou</button>
      </div>
      <input
        className="b-drawer__search"
        type="search"
        placeholder="Caută produs…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Caută produs"
      />
      <div className="b-drawer__list">
        {available.length === 0 ? (
          <p className="b-drawer__empty">Toate produsele sunt deja pe pagini, sau nu există potriviri.</p>
        ) : available.map((p) => {
          const img = p.images[0];
          const suggested = img ? suggestSizeFromImage(img.w, img.h).preset as SizePresetId : 'lat';
          const presetId = sizeByProduct[p.id] || suggested;
          return (
            <DraggableProduct
              key={p.id}
              product={p}
              presetId={presetId}
              onSizeChange={onSizeChange}
            />
          );
        })}
      </div>
    </aside>
  );
}
