'use client';
/* Popup: toate formele disponibile pe foaie. */
import { useEffect } from 'react';
import type { PageShapeKind } from '@/lib/catalogTypes';
import { PAGE_SHAPE_KINDS } from '@/lib/pageDecor';
import PageShapeSvg from './PageShapeSvg';

interface Props {
  open: boolean;
  fill: string;
  onSelect: (shape: PageShapeKind) => void;
  onClose: () => void;
}

export default function PageShapePickerModal({ open, fill, onSelect, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="shape-pick" role="dialog" aria-modal="true" aria-label="Alege o formă">
      <button type="button" className="shape-pick__scrim" aria-label="Închide" onClick={onClose} />
      <div className="shape-pick__panel">
        <div className="shape-pick__head">
          <h2>Toate formele</h2>
          <button type="button" className="shape-pick__x" aria-label="Închide" onClick={onClose}>×</button>
        </div>
        <div className="shape-pick__body">
          <div className="shape-pick__grid" role="listbox" aria-label="Forme">
            {PAGE_SHAPE_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                role="option"
                className="shape-pick__opt"
                title={k.label}
                aria-label={k.label}
                onClick={() => {
                  onSelect(k.id);
                  onClose();
                }}
              >
                <span className="shape-pick__icon" aria-hidden="true">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                    <PageShapeSvg shape={k.id} fill={fill} />
                  </svg>
                </span>
                <span className="shape-pick__label">{k.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
