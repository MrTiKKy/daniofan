'use client';
import { useMemo, useState } from 'react';
import { autoLabel, discountPct, fmtPriceRo } from '@/lib/catalogPricing';
import type {
  CatalogProduct,
  MediaLayout,
  PageItem,
  SizePresetId,
} from '@/lib/catalogTypes';
import { SIZE_PRESETS } from '@/lib/catalogTypes';
import MediaEditor from './MediaEditor';

interface Props {
  item: PageItem | null;
  product: CatalogProduct | null;
  onChange: (patch: Partial<PageItem>) => void;
  onRemove: () => void;
}

const LAYOUTS: { id: MediaLayout; label: string }[] = [
  { id: 'single', label: 'O poză' },
  { id: 'side', label: 'Una lângă alta' },
  { id: 'stack', label: 'Una peste alta' },
  { id: 'fan', label: 'Evantai' },
  { id: 'hero-small', label: 'Vedetă mică' },
];

export default function ItemInspector({ item, product, onChange, onRemove }: Props) {
  const [mediaIdx, setMediaIdx] = useState(0);

  const presetId = useMemo(() => {
    if (!item) return null;
    return SIZE_PRESETS.find((p) => p.w === item.w && p.h === item.h)?.id || null;
  }, [item]);

  if (!item) {
    return (
      <aside className="b-inspect" aria-label="Inspector">
        <h2>Inspector</h2>
        <p className="b-inspect__hint">Selectați o căsuță pe pagină pentru a o edita.</p>
      </aside>
    );
  }

  const pct = product && item.promoPrice != null
    ? discountPct(product.normalPrice, item.promoPrice)
    : 0;

  return (
    <aside className="b-inspect" aria-label="Inspector">
      <div className="b-inspect__head">
        <h2>Căsuță</h2>
        <button type="button" className="b-btn b-btn--danger" onClick={onRemove}>Scoate</button>
      </div>

      <label className="b-field">
        <span>Tip</span>
        <strong>{item.type === 'product' ? 'Produs' : item.type === 'heading' ? 'Titlu' : item.type === 'banner' ? 'Banner' : item.type === 'image' ? 'Imagine' : 'Text'}</strong>
      </label>

      <label className="b-field">
        <span>Mărime presetată</span>
        <select
          value={presetId || ''}
          onChange={(e) => {
            const p = SIZE_PRESETS.find((x) => x.id === e.target.value as SizePresetId);
            if (p) onChange({ w: p.w, h: p.h });
          }}
        >
          <option value="">Personalizat</option>
          {SIZE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </label>

      <div className="b-field-row">
        <label className="b-field">
          <span>Lățime (coloane)</span>
          <input
            type="number"
            min={1}
            max={12}
            value={item.w}
            onChange={(e) => onChange({ w: Math.max(1, +e.target.value || 1) })}
          />
        </label>
        <label className="b-field">
          <span>Înălțime (rânduri)</span>
          <input
            type="number"
            min={1}
            max={12}
            value={item.h}
            onChange={(e) => onChange({ h: Math.max(1, +e.target.value || 1) })}
          />
        </label>
      </div>

      {(item.type === 'heading' || item.type === 'banner' || item.type === 'text') ? (
        <label className="b-field">
          <span>Text</span>
          <textarea
            rows={3}
            value={item.text || ''}
            onChange={(e) => onChange({ text: e.target.value })}
          />
        </label>
      ) : null}

      {item.type === 'product' && product ? (
        <>
          <p className="b-inspect__product">{product.brand}{product.name ? ` — ${product.name}` : ''}</p>
          <p className="b-inspect__muted">Preț normal: {fmtPriceRo(product.normalPrice)} lei</p>

          <label className="b-field">
            <span>Preț promoțional</span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={item.promoPrice ?? ''}
              onChange={(e) => {
                const promoPrice = e.target.value === '' ? undefined : +e.target.value;
                const label = promoPrice != null && product
                  ? (item.label && !/^-\d+%$/.test(item.label) ? item.label : autoLabel(product.normalPrice, promoPrice))
                  : item.label;
                onChange({ promoPrice, label });
              }}
            />
          </label>
          {pct > 0 ? <p className="b-inspect__pct">Reducere calculată: −{pct}%</p> : null}

          <label className="b-field">
            <span>Etichetă specială</span>
            <input
              type="text"
              placeholder="ex. 2+1 sau lăsați gol pentru −%"
              value={item.label || ''}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </label>

          <label className="b-chk">
            <input
              type="checkbox"
              checked={!!item.sponsored}
              onChange={(e) => onChange({ sponsored: e.target.checked })}
            />
            Sponsorizat
          </label>

          <label className="b-field">
            <span>Așezare poze</span>
            <select
              value={item.mediaLayout}
              onChange={(e) => onChange({ mediaLayout: e.target.value as MediaLayout })}
            >
              {LAYOUTS.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </label>

          <div className="b-field">
            <span>Poze în căsuță</span>
            <div className="b-inspect__thumbs">
              {product.images.map((img, i) => {
                const on = item.media.some((m) => m.imageIndex === i);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`b-inspect__thumb${on ? ' is-on' : ''}`}
                    onClick={() => {
                      if (on) {
                        onChange({ media: item.media.filter((m) => m.imageIndex !== i) });
                      } else {
                        onChange({
                          media: [...item.media, { imageIndex: i, x: 0, y: 0, scale: 1 }],
                        });
                      }
                    }}
                  >
                    <img src={img.src.startsWith('data:') || img.src.startsWith('/') ? img.src : '/' + img.src} alt="" />
                  </button>
                );
              })}
            </div>
          </div>

          {item.media.length ? (
            <MediaEditor
              item={item}
              product={product}
              activeIndex={Math.min(mediaIdx, item.media.length - 1)}
              onActiveIndex={setMediaIdx}
              onChange={onChange}
            />
          ) : null}
        </>
      ) : null}
    </aside>
  );
}
