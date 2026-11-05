'use client';
/* Pop-up tip etichetă de raft — editare inline (constructor / produs nou). */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { processImage } from '@/lib/image';
import { formatUnitPrice, parsePriceInput, parseSizeText } from '@/lib/parseSize';
import { uploadProductImage } from '@/lib/uploadClient';
import { assetUrl } from '@/lib/store';

export type ShelfDraft = {
  brand: string;
  name: string;
  size: string;
  unitQty?: number;
  unitKind?: string;
  oldPrice: number;
  newPrice: number;
  category: string;
  image: string;
};

interface Props {
  open: boolean;
  title?: string;
  initial: ShelfDraft;
  categories?: string[];
  /** Dacă false, ascunde prețul promo (ex. doar catalog). Default true. */
  showPromoPrice?: boolean;
  onClose: () => void;
  onSave: (draft: ShelfDraft) => void | Promise<void>;
  /** Opțional: buton Șterge în footer (ex. panou Admin). */
  onDelete?: () => void;
  /** Decupare fundal la upload (default true). Poate fi funcție citită la click. */
  cutBackground?: boolean | (() => boolean);
}

function PriceParts({ value, big }: { value: number; big?: boolean }) {
  const [lei, ban] = (Math.round((+value || 0) * 100) / 100).toFixed(2).replace('.', ',').split(',');
  return (
    <span className={'shelf-price' + (big ? ' is-big' : ' is-old')}>
      <span className="shelf-price__lei">{lei}</span>
      <span className="shelf-price__ban">,{ban}</span>
      <span className="shelf-price__cur">lei</span>
    </span>
  );
}

function PriceEdit({
  id,
  value,
  str,
  setStr,
  big,
  placeholder,
  invalid,
  onCommit,
  onEnter,
}: {
  id: string;
  value: number;
  str: string;
  setStr: (s: string) => void;
  big?: boolean;
  placeholder: string;
  invalid?: boolean;
  onCommit: (n: number) => void;
  onEnter: (e: KeyboardEvent) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className={'shelf-price-hit' + (big ? ' is-big' : ' is-old') + (invalid ? ' is-bad' : '')}>
      {editing ? (
        <input
          id={id}
          className="shelf-inline shelf-inline--price"
          inputMode="decimal"
          autoFocus
          value={str}
          placeholder={placeholder}
          aria-label={big ? 'Preț promo' : 'Preț normal'}
          aria-invalid={invalid}
          onChange={(e) => {
            setStr(e.target.value);
            onCommit(parsePriceInput(e.target.value));
          }}
          onBlur={() => {
            setEditing(false);
            setStr(value > 0 ? String(value).replace('.', ',') : '');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              setEditing(false);
              setStr(value > 0 ? String(value).replace('.', ',') : '');
              onEnter(e);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="shelf-price-hit__btn"
          onClick={() => setEditing(true)}
        >
          {value > 0 ? <PriceParts value={value} big={big} /> : (
            <span className="shelf-price-hit__ph">{placeholder}</span>
          )}
        </button>
      )}
    </div>
  );
}

export default function ProductShelfModal({
  open,
  title = 'Editează produs',
  initial,
  categories = [],
  showPromoPrice = true,
  onClose,
  onSave,
  onDelete,
  cutBackground = true,
}: Props) {
  const formId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ShelfDraft>(initial);
  const [oldStr, setOldStr] = useState('');
  const [newStr, setNewStr] = useState('');
  const [unitManual, setUnitManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ name?: string; price?: string; general?: string }>({});
  const dirtyRef = useRef(false);
  const baseline = useRef(JSON.stringify(initial));
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (!open) return;
    setDraft(initial);
    setOldStr(initial.oldPrice > 0 ? String(initial.oldPrice).replace('.', ',') : '');
    setNewStr(initial.newPrice > 0 ? String(initial.newPrice).replace('.', ',') : '');
    setUnitManual(false);
    setErr({});
    dirtyRef.current = false;
    baseline.current = JSON.stringify(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (dirtyRef.current || busy) {
        if (!confirm('Închizi fără să salvezi modificările?')) return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const markDirty = (next: ShelfDraft) => {
    dirtyRef.current = JSON.stringify(next) !== baseline.current;
    setDraft(next);
  };

  const patch = (p: Partial<ShelfDraft>) => markDirty({ ...draftRef.current, ...p });

  const onSizeChange = (size: string) => {
    const parsed = parseSizeText(size);
    if (!unitManual && parsed) {
      patch({ size, unitQty: parsed.unitQty, unitKind: parsed.unitKind });
    } else {
      patch({ size });
    }
  };

  const requestClose = () => {
    if (dirtyRef.current || busy) {
      if (!confirm('Închizi fără să salvezi modificările?')) return;
    }
    onClose();
  };

  const canSave = draft.name.trim().length > 0
    && (showPromoPrice ? draft.newPrice > 0 : draft.oldPrice > 0);

  const submit = async () => {
    const nextErr: typeof err = {};
    if (!draft.name.trim()) nextErr.name = 'Scrie numele produsului.';
    if (showPromoPrice) {
      if (!(draft.newPrice > 0)) nextErr.price = 'Scrie prețul promo.';
    } else if (!(draft.oldPrice > 0)) {
      nextErr.price = 'Scrie prețul.';
    }
    setErr(nextErr);
    if (nextErr.name || nextErr.price) return;
    setBusy(true);
    try {
      let image = draft.image.trim();
      /* Upload în Storage doar la confirmare — nu la alegerea pozei. */
      if (image.startsWith('data:')) {
        const uploaded = await uploadProductImage(image);
        image = uploaded.url;
      }
      await onSave({
        ...draft,
        brand: draft.brand.trim(),
        name: draft.name.trim(),
        size: draft.size.trim(),
        category: draft.category.trim(),
        image,
      });
      dirtyRef.current = false;
      onClose();
    } catch (e) {
      setErr({ general: e instanceof Error ? e.message : 'Salvare eșuată.' });
    } finally {
      setBusy(false);
    }
  };

  const onPickImage = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setErr({});
    try {
      const cut = typeof cutBackground === 'function' ? cutBackground() : cutBackground;
      /* Doar preprocesare locală (resize / fundal / WebP); Storage la „Gata”. */
      const dataUrl = await processImage(file, cut);
      patch({ image: dataUrl });
    } catch (e) {
      setErr({ general: e instanceof Error ? e.message : 'Poza nu a putut fi prelucrată.' });
    } finally {
      setBusy(false);
    }
  };

  const unitLine = formatUnitPrice(
    showPromoPrice ? draft.newPrice : draft.oldPrice,
    draft.unitQty,
    draft.unitKind,
  );

  const onEnterNext = (e: KeyboardEvent, nextId: string) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    document.getElementById(nextId)?.focus();
  };

  return (
    <div
      className="shelf-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) requestClose(); }}
    >
      <div className="shelf-modal__panel">
        <header className="shelf-modal__head">
          <h2>{title}</h2>
          <button type="button" className="shelf-modal__x" aria-label="Închide" onClick={requestClose}>×</button>
        </header>

        <div className="shelf-modal__body">
          <div className="shelf-label">
            <div className="shelf-label__media">
              <div className={'shelf-label__frame' + (draft.image ? '' : ' is-empty')}>
                {draft.image
                  ? <img src={assetUrl(draft.image)} alt="" />
                  : <span className="shelf-label__ph">Fără poză</span>}
              </div>
              <button
                type="button"
                className="shelf-modal__img-btn"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {draft.image ? 'Schimbă poza' : 'Adaugă poză'}
              </button>
              <a
                className="shelf-modal__img-alt"
                href="https://huggingface.co/spaces/briaai/BRIA-RMBG-1.4"
                target="_blank"
                rel="noopener noreferrer"
              >
                Alternativă eliminare fundal
              </a>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void onPickImage(e.target.files?.[0])}
              />
            </div>

            <div className="shelf-label__info">
              <input
                id={`${formId}-brand`}
                className="shelf-inline shelf-inline--brand"
                value={draft.brand}
                placeholder="BRAND"
                aria-label="Brand"
                onChange={(e) => patch({ brand: e.target.value.toUpperCase() })}
                onKeyDown={(e) => onEnterNext(e, `${formId}-name`)}
              />
              <input
                id={`${formId}-name`}
                className="shelf-inline shelf-inline--name"
                value={draft.name}
                placeholder="Nume produs"
                aria-label="Nume produs"
                aria-invalid={!!err.name}
                onChange={(e) => { setErr((x) => ({ ...x, name: undefined })); patch({ name: e.target.value }); }}
                onKeyDown={(e) => onEnterNext(e, `${formId}-size`)}
              />
              {err.name ? <p className="shelf-err">{err.name}</p> : null}

              <input
                id={`${formId}-size`}
                className="shelf-inline shelf-inline--size"
                value={draft.size}
                placeholder="ex. 0.5L Doză"
                aria-label="Gramaj / ambalaj"
                onChange={(e) => onSizeChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  document.getElementById(`${formId}-old`)?.click();
                }}
              />

              <div className="shelf-unit">
                <label>
                  <span>Cant.</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft.unitQty != null && draft.unitQty > 0 ? String(draft.unitQty) : ''}
                    placeholder="0.5"
                    onChange={(e) => {
                      setUnitManual(true);
                      const v = e.target.value.trim();
                      patch({ unitQty: v === '' ? undefined : parseFloat(v.replace(',', '.')) || 0 });
                    }}
                  />
                </label>
                <label>
                  <span>Unit.</span>
                  <select
                    value={['g', 'kg', 'ml', 'l', 'buc'].includes((draft.unitKind || '').toLowerCase())
                      ? (draft.unitKind || '').toLowerCase()
                      : ''}
                    aria-label="Unitate"
                    onChange={(e) => {
                      setUnitManual(true);
                      patch({ unitKind: e.target.value || undefined });
                    }}
                  >
                    <option value="">—</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="buc">buc</option>
                  </select>
                </label>
              </div>

              <div className="shelf-prices">
                <PriceEdit
                  id={`${formId}-old`}
                  value={draft.oldPrice}
                  str={oldStr}
                  setStr={setOldStr}
                  placeholder="0,00"
                  onCommit={(n) => patch({ oldPrice: n })}
                  onEnter={(e) => {
                    if (showPromoPrice) document.getElementById(`${formId}-new`)?.click();
                    else onEnterNext(e, `${formId}-cat`);
                  }}
                />
                {showPromoPrice ? (
                  <PriceEdit
                    id={`${formId}-new`}
                    value={draft.newPrice}
                    str={newStr}
                    setStr={setNewStr}
                    big
                    placeholder="0,00"
                    invalid={!!err.price}
                    onCommit={(n) => {
                      setErr((x) => ({ ...x, price: undefined }));
                      patch({ newPrice: n });
                    }}
                    onEnter={(e) => onEnterNext(e, `${formId}-cat`)}
                  />
                ) : null}
              </div>
              {err.price ? <p className="shelf-err">{err.price}</p> : null}

              <div className="shelf-meta">
                <span className="shelf-meta__unit">{unitLine || '—'}</span>
                <label className="shelf-meta__cat">
                  <span className="sr-only">Categorie</span>
                  <select
                    id={`${formId}-cat`}
                    value={draft.category}
                    onChange={(e) => patch({ category: e.target.value })}
                  >
                    <option value="">Categorie</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
          {err.general ? <p className="shelf-err shelf-err--block">{err.general}</p> : null}
        </div>

        <footer className="shelf-modal__foot">
          {onDelete ? (
            <button
              type="button"
              className="shelf-modal__delete"
              disabled={busy}
              onClick={onDelete}
            >
              Șterge
            </button>
          ) : null}
          <span className="shelf-modal__foot-sp" />
          <button type="button" className="shelf-modal__cancel" disabled={busy} onClick={requestClose}>
            Anulează
          </button>
          <button
            type="button"
            className="shelf-modal__done"
            disabled={busy || !canSave}
            onClick={() => void submit()}
          >
            {busy ? '…' : 'Gata'}
          </button>
        </footer>
      </div>
    </div>
  );
}
