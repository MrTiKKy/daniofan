'use client';
import { useRef, useState } from 'react';
import { processImage } from '@/lib/image';
import type { CatalogProduct, ProductImage } from '@/lib/catalogTypes';
import { uid } from '@/lib/autoLayout';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (product: CatalogProduct) => void;
}

export default function NewProductModal({ open, onClose, onSave }: Props) {
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [unit, setUnit] = useState('l');
  const [unitQty, setUnitQty] = useState(0.5);
  const [normalPrice, setNormalPrice] = useState(0);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [cut, setCut] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setBrand(''); setName(''); setDetails(''); setUnit('l'); setUnitQty(0.5);
    setNormalPrice(0); setImages([]); setErr('');
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setErr('');
    try {
      const next: ProductImage[] = [...images];
      for (const file of Array.from(files)) {
        const src = await processImage(file, cut);
        const im = await new Promise<HTMLImageElement>((res, rej) => {
          const el = new Image();
          el.onload = () => res(el);
          el.onerror = rej;
          el.src = src;
        });
        next.push({ src, w: im.width, h: im.height });
      }
      setImages(next);
    } catch {
      setErr('Nu am putut încărca poza. Încercați altă imagine.');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!brand.trim()) { setErr('Introduceți brandul.'); return; }
    if (!(normalPrice > 0)) { setErr('Introduceți prețul normal.'); return; }
    onSave({
      id: uid('prod'),
      brand: brand.trim(),
      name: name.trim(),
      details: details.trim(),
      unit: unit.trim(),
      unitQty: +unitQty || 0,
      normalPrice: +normalPrice,
      images,
    });
    reset();
    onClose();
  };

  return (
    <div className="b-modal" role="dialog" aria-modal="true" aria-label="Produs nou">
      <div className="b-modal__card">
        <div className="b-modal__head">
          <h2>Produs nou</h2>
          <button type="button" className="b-btn" onClick={() => { reset(); onClose(); }}>Închide</button>
        </div>
        <div className="b-modal__body">
          <label className="b-field"><span>Brand</span>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </label>
          <label className="b-field"><span>Nume</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="b-field"><span>Detalii (gramaj, sortimente)</span>
            <input value={details} onChange={(e) => setDetails(e.target.value)} />
          </label>
          <div className="b-field-row">
            <label className="b-field"><span>Cantitate</span>
              <input type="number" step="0.01" value={unitQty} onChange={(e) => setUnitQty(+e.target.value)} />
            </label>
            <label className="b-field"><span>Unitate</span>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </label>
            <label className="b-field"><span>Preț normal</span>
              <input type="number" step="0.01" value={normalPrice || ''} onChange={(e) => setNormalPrice(+e.target.value)} />
            </label>
          </div>

          <label className="b-chk">
            <input type="checkbox" checked={cut} onChange={(e) => setCut(e.target.checked)} />
            Decupează fundalul pozei
          </label>

          <div
            className="b-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void onFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Se prelucrează…' : 'Trageți pozele aici sau apăsați pentru a alege'}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => void onFiles(e.target.files)}
            />
          </div>
          {images.length ? (
            <div className="b-inspect__thumbs">
              {images.map((img, i) => (
                <div key={i} className="b-inspect__thumb is-on">
                  <img src={img.src} alt="" />
                </div>
              ))}
            </div>
          ) : null}
          {err ? <p className="b-modal__err">{err}</p> : null}
        </div>
        <div className="b-modal__foot">
          <button type="button" className="b-btn b-btn--primary" onClick={submit} disabled={busy}>Salvează produsul</button>
        </div>
      </div>
    </div>
  );
}
