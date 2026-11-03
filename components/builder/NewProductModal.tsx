'use client';
import { useMemo } from 'react';
import { uid } from '@/lib/autoLayout';
import type { CatalogProduct } from '@/lib/catalogTypes';
import ProductShelfModal, { type ShelfDraft } from './ProductShelfModal';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (product: CatalogProduct) => void | Promise<void>;
  categories?: string[];
}

const EMPTY: ShelfDraft = {
  brand: '',
  name: '',
  size: '',
  oldPrice: 0,
  newPrice: 0,
  category: '',
  image: '',
};

export default function NewProductModal({ open, onClose, onSave, categories = [] }: Props) {
  const initial = useMemo(() => EMPTY, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- reset when reopened

  return (
    <ProductShelfModal
      open={open}
      title="Produs nou"
      initial={initial}
      categories={categories}
      showPromoPrice
      onClose={onClose}
      onSave={async (d) => {
        const images = d.image
          ? [{ src: d.image, w: 0, h: 0 }]
          : [];
        await onSave({
          id: uid('prod'),
          brand: d.brand,
          name: d.name,
          details: d.size,
          unit: (d.unitKind || '').trim(),
          unitQty: d.unitQty && d.unitQty > 0 ? d.unitQty : 0,
          normalPrice: d.oldPrice,
          promoPrice: d.newPrice,
          images,
        });
      }}
    />
  );
}
