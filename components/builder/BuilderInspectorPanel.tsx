'use client';
/* Panou dreapta: detalii editabile pe casuță (doar în ofertă, nu în tab Produse). */
import { useEffect, useState } from 'react';
import type { PageItem, PageItemDisplay } from '@/lib/catalogTypes';
import * as DF from '@/lib/store';
import type { Product } from '@/lib/types';

interface Props {
  item: PageItem | null;
  baseProduct: Product | null;
  display: PageItemDisplay | null;
  onChange: (patch: Partial<PageItemDisplay>) => void;
  onClose: () => void;
}

function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <label className="bi-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function parsePrice(raw: string): number {
  const v = parseFloat(raw.replace(',', '.').trim());
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

export default function BuilderInspectorPanel({
  item, baseProduct, display, onChange, onClose,
}: Props) {
  const [oldStr, setOldStr] = useState('');
  const [newStr, setNewStr] = useState('');

  useEffect(() => {
    if (!display || !item) return;
    setOldStr(display.oldPrice ? DF.fmtPrice(display.oldPrice) : '');
    setNewStr(display.newPrice ? DF.fmtPrice(display.newPrice) : '');
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- sync only on product switch

  if (!item || !baseProduct || !display) {
    return (
      <aside className="bi-panel" aria-label="Setări și detalii">
        <div className="bi-panel__head">
          <h2>Detalii</h2>
        </div>
        <div className="bi-panel__body">
          <p className="bi-panel__hint">
            Click pe un produs din pagină ca să-i editezi detaliile aici. Modificările rămân doar în această ofertă.
          </p>
        </div>
      </aside>
    );
  }

  const imgs = [display.images[0] || '', display.images[1] || ''];

  const setImages = (slot0: string, slot1: string) => {
    onChange({ images: [slot0, slot1].filter(Boolean) });
  };

  const setImageAt = (index: number, src: string) => {
    const next = [imgs[0], imgs[1]];
    next[index] = src;
    setImages(next[0], next[1]);
  };

  const onFile = (index: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageAt(index, String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const clearImage = (index: number) => {
    const next = [imgs[0], imgs[1]];
    next[index] = '';
    setImages(next[0], next[1]);
  };

  return (
    <aside className="bi-panel" aria-label="Setări produs pe pagină">
      <div className="bi-panel__head">
        <h2>Detalii</h2>
        <button type="button" className="bi-panel__x" aria-label="Închide" onClick={onClose}>×</button>
      </div>
      <div className="bi-panel__body">
        <p className="bi-panel__note">Doar în această ofertă — nu schimbă produsul din tab-ul Produse.</p>

        <div className="bi-section">
          <h3>Text</h3>
          <Field label="Brand">
            <input type="text" value={display.brand} onChange={(e) => onChange({ brand: e.target.value })} />
          </Field>
          <Field label="Denumire">
            <input type="text" value={display.name} onChange={(e) => onChange({ name: e.target.value })} />
          </Field>
          <Field label="Gramaj / ambalaj">
            <input type="text" value={display.size} onChange={(e) => onChange({ size: e.target.value })} />
          </Field>
          <Field label="Variante">
            <input type="text" value={display.variants} onChange={(e) => onChange({ variants: e.target.value })} placeholder="opțional" />
          </Field>
          <Field label="Etichetă specială">
            <input type="text" value={display.specialLabel} onChange={(e) => onChange({ specialLabel: e.target.value })} placeholder="ex. 2+1" />
          </Field>
        </div>

        <div className="bi-section">
          <h3>Preț</h3>
          <div className="bi-row">
            <Field label="Normal (lei)">
              <input
                type="text"
                inputMode="decimal"
                value={oldStr}
                onChange={(e) => setOldStr(e.target.value)}
                onBlur={() => onChange({ oldPrice: parsePrice(oldStr) })}
              />
            </Field>
            <Field label="Promo (lei)">
              <input
                type="text"
                inputMode="decimal"
                value={newStr}
                onChange={(e) => setNewStr(e.target.value)}
                onBlur={() => onChange({ newPrice: parsePrice(newStr) })}
              />
            </Field>
          </div>
          <div className="bi-row">
            <Field label="Cantitate">
              <input
                type="text"
                inputMode="decimal"
                value={display.unitQty != null ? String(display.unitQty) : ''}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  onChange({ unitQty: v === '' ? undefined : parseFloat(v.replace(',', '.')) || 0 });
                }}
                placeholder="ex. 0.5"
              />
            </Field>
            <Field label="Unitate">
              <input type="text" value={display.unitKind || ''} onChange={(e) => onChange({ unitKind: e.target.value })} placeholder="l / kg" />
            </Field>
          </div>
        </div>

        <div className="bi-section">
          <h3>Poze pe casuță</h3>
          <p className="bi-panel__sub">Una sau două poze — doar pe această casuță din ofertă.</p>
          <div className="bi-imgs">
            {[0, 1].map((i) => (
              <div key={i} className="bi-img">
                <div className="bi-img__preview">
                  {imgs[i]
                    ? <img src={DF.assetUrl(imgs[i])} alt="" />
                    : <span>Poză {i + 1}</span>}
                </div>
                <div className="bi-img__acts">
                  <label className="bi-img__btn">
                    {imgs[i] ? 'Schimbă' : 'Adaugă'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => onFile(i, e.target.files?.[0])}
                    />
                  </label>
                  {imgs[i] ? (
                    <button type="button" className="bi-img__btn bi-img__btn--ghost" onClick={() => clearImage(i)}>Șterge</button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bi-section">
          <h3>Aspect</h3>
          <label className="bi-chk">
            <input
              type="checkbox"
              checked={!!display.priceLeft}
              onChange={(e) => {
                const next = e.target.checked;
                const text = display.textPos || { x: 0, y: 70, scale: 1 };
                const price = display.pricePos || { x: 52, y: 64, scale: 1 };
                onChange({
                  priceLeft: next,
                  textPos: { ...price },
                  pricePos: { ...text },
                });
              }}
            />
            Inversează pozițiile text ↔ preț
          </label>
        </div>
      </div>
    </aside>
  );
}
