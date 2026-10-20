/* Cuprins: miniaturi pe spread, panou dreapta (desktop) / jos (mobil). */
'use client';
import MagazinePage from './MagazinePage';
import type { MagPage } from './PageLayouts';
import type { MagView } from './useFlip';
import { counterLabel } from './useFlip';

interface Props {
  open: boolean;
  pages: MagPage[];
  views: MagView[];
  viewIndex: number;
  onClose: () => void;
  onJump: (page1: number) => void;
}

export default function TocPanel({ open, pages, views, viewIndex, onClose, onJump }: Props) {
  if (!open) return null;
  const total = pages.length;

  return (
    <>
      <button type="button" className="mag-drawer__scrim" aria-label="Închide cuprinsul" onClick={onClose} />
      <aside className="mag-drawer mag-drawer--toc" role="dialog" aria-label="Cuprins">
        <div className="mag-drawer__head">
          <h2>Cuprins</h2>
          <button type="button" className="mag-drawer__close" aria-label="Închide" onClick={onClose}>×</button>
        </div>
        <div className="mag-toc">
          {views.map((v, i) => {
            const label = counterLabel(v, total).split(' / ')[0];
            const active = i === viewIndex;
            return (
              <button
                key={v.pages.join('-')}
                type="button"
                className={'mag-toc__item' + (active ? ' is-active' : '')}
                onClick={() => { onJump(v.pages[0]); onClose(); }}
                aria-current={active ? 'page' : undefined}
              >
                <div className="mag-toc__thumbs">
                  {v.pages.map((p) => (
                    <div key={p} className="mag-toc__thumb">
                      <MagazinePage page={pages[p - 1]} pageNumber={p} mini />
                    </div>
                  ))}
                </div>
                <span className="mag-toc__label">{label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
