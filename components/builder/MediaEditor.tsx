'use client';
import type { CatalogProduct, PageItem } from '@/lib/catalogTypes';

interface Props {
  item: PageItem;
  product: CatalogProduct;
  activeIndex: number;
  onActiveIndex: (i: number) => void;
  onChange: (patch: Partial<PageItem>) => void;
}

export default function MediaEditor({
  item, product, activeIndex, onActiveIndex, onChange,
}: Props) {
  const slot = item.media[activeIndex];
  if (!slot) return null;
  const img = product.images[slot.imageIndex];

  const patchSlot = (partial: Partial<typeof slot>) => {
    const media = item.media.map((m, i) => (i === activeIndex ? { ...m, ...partial } : m));
    onChange({ media });
  };

  const move = (dir: -1 | 1) => {
    const next = activeIndex + dir;
    if (next < 0 || next >= item.media.length) return;
    const media = [...item.media];
    const tmp = media[activeIndex];
    media[activeIndex] = media[next];
    media[next] = tmp;
    onChange({ media });
    onActiveIndex(next);
  };

  return (
    <div className="b-media">
      <div className="b-media__tabs">
        {item.media.map((m, i) => (
          <button
            key={i}
            type="button"
            className={`b-media__tab${i === activeIndex ? ' is-on' : ''}`}
            onClick={() => onActiveIndex(i)}
          >
            Poză {i + 1}
          </button>
        ))}
      </div>

      {img ? (
        <p className="b-inspect__muted">Trageți poza direct în căsuță (pe pagina din mijloc) pentru a o muta.</p>
      ) : null}

      <label className="b-field">
        <span>Mărire (zoom) {slot.scale.toFixed(2)}</span>
        <input
          type="range"
          min={0.5}
          max={2.5}
          step={0.05}
          value={slot.scale}
          onChange={(e) => patchSlot({ scale: +e.target.value })}
        />
      </label>

      <div className="b-field-row">
        <button type="button" className="b-btn" onClick={() => move(-1)} disabled={activeIndex === 0}>Înainte</button>
        <button type="button" className="b-btn" onClick={() => move(1)} disabled={activeIndex >= item.media.length - 1}>Înapoi</button>
      </div>

      <button
        type="button"
        className="b-btn"
        onClick={() => patchSlot({ x: 0, y: 0, scale: 1 })}
      >
        Resetează poza
      </button>

      <label className="b-chk">
        <input
          type="checkbox"
          checked={!!item.overflow}
          onChange={(e) => onChange({ overflow: e.target.checked })}
        />
        Poza iese din chenar
      </label>
    </div>
  );
}
