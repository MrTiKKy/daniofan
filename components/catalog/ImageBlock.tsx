'use client';
import { assetUrl } from '@/lib/store';
import type { CatalogProduct, PageItem } from '@/lib/catalogTypes';

interface Props {
  item: PageItem;
  productsById: Map<string, CatalogProduct>;
}

export default function ImageBlock({ item, productsById }: Props) {
  const prod = item.productId ? productsById.get(item.productId) : undefined;
  const slot = item.media[0];
  const src = prod && slot ? prod.images[slot.imageIndex]?.src : undefined;
  if (!src) return <div className="cat-image" />;
  return (
    <div className="cat-image">
      <img src={assetUrl(src)} alt="" />
    </div>
  );
}
