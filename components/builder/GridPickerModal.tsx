'use client';
/* Popup: alege grila paginii noi — 3×4 sau 2×4. */
import { useEffect, useState } from 'react';
import {
  PAGE_GRID_PRESETS,
  type CatalogGrid,
  type PageGridPresetId,
} from '@/lib/catalogTypes';

interface Props {
  open: boolean;
  /** false = nu poți închide fără alegere (prima pagină) */
  allowCancel?: boolean;
  onConfirm: (grid: CatalogGrid) => void;
  onCancel: () => void;
}

function GridPreview({ cols, rows }: { cols: number; rows: number }) {
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  return (
    <div
      className="grid-pick__preview"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      aria-hidden="true"
    >
      {cells.map((i) => <span key={i} className="grid-pick__cell" />)}
    </div>
  );
}

export default function GridPickerModal({ open, allowCancel = true, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<PageGridPresetId>('3x4');

  useEffect(() => {
    if (!open) return;
    setSelected('3x4');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && allowCancel) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, allowCancel, onCancel]);

  if (!open) return null;

  const preset = PAGE_GRID_PRESETS.find((p) => p.id === selected) || PAGE_GRID_PRESETS[0];

  return (
    <div
      className="grid-pick"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grid-pick-title"
      onClick={(e) => { if (e.target === e.currentTarget && allowCancel) onCancel(); }}
    >
      <div className="grid-pick__panel">
        <div className="grid-pick__head">
          <h2 id="grid-pick-title">Alege grila paginii</h2>
          {allowCancel ? (
            <button type="button" className="grid-pick__x" aria-label="Închide" onClick={onCancel}>×</button>
          ) : null}
        </div>
        <p className="grid-pick__help">Câte căsuțe pe pagină: 3 coloane × 4 rânduri, sau 2 coloane × 4 rânduri.</p>
        <div className="grid-pick__opts" role="radiogroup" aria-label="Tip grilă">
          {PAGE_GRID_PRESETS.map((p) => {
            const on = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={'grid-pick__opt' + (on ? ' is-on' : '')}
                onClick={() => setSelected(p.id)}
              >
                <GridPreview cols={p.cols} rows={p.rows} />
                <span className="grid-pick__opt-label">{p.label}</span>
                <span className="grid-pick__opt-sub">{p.cols} coloane · {p.rows} rânduri</span>
              </button>
            );
          })}
        </div>
        <div className="grid-pick__foot">
          {allowCancel ? (
            <button type="button" className="b-btn" onClick={onCancel}>Anulează</button>
          ) : null}
          <button
            type="button"
            className="b-btn b-btn--primary"
            onClick={() => onConfirm({ cols: preset.cols, rows: preset.rows })}
          >
            Creează pagina
          </button>
        </div>
      </div>
    </div>
  );
}
