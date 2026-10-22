'use client';
/* Popup compact: alegere șablon fundal (multe solide + gradienturi). */
import { useEffect, useMemo, useRef } from 'react';
import type { PageBgPresetId } from '@/lib/catalogTypes';
import {
  PAGE_BG_GROUP_LABELS,
  PAGE_BG_PRESETS,
  type PageBgGroup,
  type PageBgPreset,
} from '@/lib/pageChrome';

interface Props {
  open: boolean;
  selected: PageBgPresetId;
  onSelect: (id: PageBgPresetId) => void;
  onClose: () => void;
}

const GROUP_ORDER: PageBgGroup[] = ['foaie', 'categorie', 'promo', 'textura'];

export default function PageBgPickerModal({ open, selected, onSelect, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current.querySelector<HTMLElement>('.bg-pick__opt.is-on');
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, selected]);

  const byGroup = useMemo(() => {
    const m = new Map<PageBgGroup, PageBgPreset[]>();
    for (const g of GROUP_ORDER) m.set(g, []);
    for (const p of PAGE_BG_PRESETS) {
      m.get(p.group)?.push(p);
    }
    return m;
  }, []);

  if (!open) return null;

  return (
    <div className="bg-pick" role="dialog" aria-modal="true" aria-label="Selectează șablon fundal">
      <button type="button" className="bg-pick__scrim" aria-label="Închide" onClick={onClose} />
      <div className="bg-pick__panel" ref={panelRef}>
        <div className="bg-pick__head">
          <h2>Șabloane fundal</h2>
          <button type="button" className="bg-pick__x" aria-label="Închide" onClick={onClose}>×</button>
        </div>
        <div className="bg-pick__body">
          {GROUP_ORDER.map((group) => {
            const list = byGroup.get(group) || [];
            if (list.length === 0) return null;
            return (
              <section key={group} className="bg-pick__section">
                <h3>{PAGE_BG_GROUP_LABELS[group]}</h3>
                <div className="bg-pick__grid" role="listbox" aria-label={PAGE_BG_GROUP_LABELS[group]}>
                  {list.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={selected === p.id}
                      className={'bg-pick__opt' + (selected === p.id ? ' is-on' : '')}
                      title={p.label}
                      onClick={() => {
                        onSelect(p.id);
                        onClose();
                      }}
                    >
                      <span className="bg-pick__swatch" style={{ background: p.css }} aria-hidden="true" />
                      <span className="bg-pick__label">{p.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
