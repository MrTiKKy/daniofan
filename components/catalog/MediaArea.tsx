'use client';
import { assetUrl } from '@/lib/store';
import type { CatalogProduct, MediaLayout, MediaSlot } from '@/lib/catalogTypes';

interface Props {
  product: CatalogProduct;
  media: MediaSlot[];
  layout: MediaLayout;
  overflow?: boolean;
  /** index selectat în editor (evidențiere) */
  activeIndex?: number | null;
  onMediaPointerDown?: (slotIndex: number, e: React.PointerEvent) => void;
}

function fanOffset(i: number, n: number): { rot: number; dx: number } {
  if (n <= 1) return { rot: 0, dx: 0 };
  const mid = (n - 1) / 2;
  return { rot: (i - mid) * 8, dx: (i - mid) * 6 };
}

function stackOffset(i: number): { rot: number; dx: number; dy: number } {
  return { rot: (i - 1) * 4, dx: i * 3, dy: i * 2 };
}

export default function MediaArea({
  product, media, layout, overflow, activeIndex, onMediaPointerDown,
}: Props) {
  const slots = media.length
    ? media
    : product.images[0]
      ? [{ imageIndex: 0, x: 0, y: 0, scale: 1 }]
      : [];

  if (!slots.length) {
    return (
      <div className={`cat-media cat-media--${layout}${overflow ? ' is-overflow' : ''}`}>
        <span className="cat-media__empty">Fără poză</span>
      </div>
    );
  }

  return (
    <div className={`cat-media cat-media--${layout}${overflow ? ' is-overflow' : ''}`}>
      {slots.map((slot, i) => {
        const img = product.images[slot.imageIndex];
        if (!img) return null;
        const fan = layout === 'fan' ? fanOffset(i, slots.length) : { rot: 0, dx: 0 };
        const st = layout === 'stack' ? stackOffset(i) : { rot: 0, dx: 0, dy: 0 };
        const tx = slot.x + fan.dx + st.dx;
        const ty = slot.y + st.dy;
        const rot = fan.rot + st.rot;
        const scale = slot.scale || 1;
        const isSingleLike = layout === 'single' || layout === 'hero-small' || layout === 'fan' || layout === 'stack';
        const transform = isSingleLike
          ? `translate(-50%, -50%) translate(${tx}%, ${ty}%) rotate(${rot}deg) scale(${scale})`
          : `translate(${tx}%, ${ty}%) rotate(${rot}deg) scale(${scale})`;

        return (
          <img
            key={`${slot.imageIndex}-${i}`}
            className={`cat-media__img${activeIndex === i ? ' is-active' : ''}`}
            src={assetUrl(img.src)}
            alt=""
            draggable={false}
            style={{
              transform,
              zIndex: activeIndex === i ? 5 : i + 1,
              cursor: onMediaPointerDown ? 'grab' : undefined,
              pointerEvents: onMediaPointerDown ? 'auto' : undefined,
            }}
            onPointerDown={onMediaPointerDown ? (e) => onMediaPointerDown(i, e) : undefined}
          />
        );
      })}
    </div>
  );
}
