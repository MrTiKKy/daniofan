'use client';
/* Popup la salvare: denumire ofertă, valabilitate, opțiune permanentă. */
import { useState } from 'react';

export type SaveOfferValues = {
  title: string;
  end: string;
  permanent: boolean;
};

interface Props {
  open: boolean;
  initial?: Partial<SaveOfferValues>;
  busy?: boolean;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (values: SaveOfferValues) => void;
}

const DEFAULT_TITLE = 'Ofertele săptămânii';

function defaultEndIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function SaveOfferModal({
  open,
  initial,
  busy,
  confirmLabel = 'Salvează draft',
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <SaveOfferModalInner
      initial={initial}
      busy={busy}
      confirmLabel={confirmLabel}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function SaveOfferModalInner({
  initial,
  busy,
  confirmLabel = 'Salvează draft',
  onClose,
  onConfirm,
}: Omit<Props, 'open'>) {
  const [title, setTitle] = useState(initial?.title?.trim() || '');
  const [end, setEnd] = useState(initial?.end || defaultEndIso());
  const [permanent, setPermanent] = useState(!!initial?.permanent);
  const [err, setErr] = useState('');

  const submit = () => {
    const t = title.trim() || DEFAULT_TITLE;
    if (!permanent && !end) {
      setErr('Alege data până la care e valabilă oferta.');
      return;
    }
    setErr('');
    onConfirm({ title: t, end: permanent ? (end || defaultEndIso()) : end, permanent });
  };

  return (
    <div
      className="a-save-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a-save-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className="a-save-modal__card">
        <div className="a-save-modal__head">
          <h2 id="a-save-modal-title">Salvează oferta</h2>
          <button type="button" className="a-save-modal__x" aria-label="Închide" disabled={busy} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="a-save-modal__body">
          <label className="a-save-modal__field">
            <span>Denumirea ofertei</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={DEFAULT_TITLE}
              autoFocus
            />
          </label>
          <label className={'a-save-modal__field' + (permanent ? ' is-dim' : '')}>
            <span>Valabilă până la</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              disabled={permanent}
            />
          </label>
          <label className="a-save-modal__chk">
            <input
              type="checkbox"
              checked={permanent}
              onChange={(e) => setPermanent(e.target.checked)}
            />
            <span>
              Marchează ca permanentă (la publicare din Reviste rămâne pe site până o retragi)
            </span>
          </label>
          {err ? <p className="a-save-modal__err">{err}</p> : null}
        </div>
        <div className="a-save-modal__foot">
          <button type="button" className="btn a-ghost" disabled={busy} onClick={onClose}>
            Anulează
          </button>
          <button type="button" className="btn a-add" disabled={busy} onClick={submit}>
            {busy ? 'Se salvează…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
