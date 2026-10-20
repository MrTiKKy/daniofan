'use client';
import type { Catalog, ThemeKey } from '@/lib/catalogTypes';
import { THEME_KEYS, THEMES } from '@/lib/themes';

interface Props {
  catalog: Catalog;
  canUndo: boolean;
  canRedo: boolean;
  saveMsg: string;
  publishIssues: string[];
  onPatch: (patch: Partial<Catalog>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onAutoLayout: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onIssueClick: (index: number) => void;
  onAddBlock: (type: 'heading' | 'banner' | 'image' | 'text') => void;
}

export default function BuilderToolbar({
  catalog, canUndo, canRedo, saveMsg, publishIssues,
  onPatch, onUndo, onRedo, onAutoLayout, onDuplicate, onPreview, onPublish, onIssueClick, onAddBlock,
}: Props) {
  return (
    <header className="b-top">
      <div className="b-top__row">
        <label className="b-field b-field--inline">
          <span>Titlu</span>
          <input
            type="text"
            value={catalog.title}
            onChange={(e) => onPatch({ title: e.target.value })}
          />
        </label>
        <label className="b-field b-field--inline">
          <span>De la</span>
          <input type="date" value={catalog.start} onChange={(e) => onPatch({ start: e.target.value })} />
        </label>
        <label className="b-field b-field--inline">
          <span>Până la</span>
          <input type="date" value={catalog.end} onChange={(e) => onPatch({ end: e.target.value })} />
        </label>
        <label className="b-field b-field--inline">
          <span>Temă</span>
          <select
            value={catalog.theme}
            onChange={(e) => onPatch({ theme: e.target.value as ThemeKey })}
          >
            {THEME_KEYS.map((k) => (
              <option key={k} value={k}>{THEMES[k].label}</option>
            ))}
          </select>
        </label>
        <span className={`b-top__status b-top__status--${catalog.status}`}>
          {catalog.status === 'published' ? 'Publicată' : 'Ciornă'}
        </span>
        {saveMsg ? <span className="b-top__save">{saveMsg}</span> : null}
      </div>

      <div className="b-top__actions">
        <button type="button" className="b-btn" onClick={onUndo} disabled={!canUndo}>Anulează</button>
        <button type="button" className="b-btn" onClick={onRedo} disabled={!canRedo}>Refă</button>
        <button type="button" className="b-btn" onClick={onAutoLayout}>Așază automat</button>
        <button type="button" className="b-btn" onClick={onDuplicate}>Duplică revista</button>
        <button type="button" className="b-btn" onClick={onPreview}>Previzualizare client</button>
        <button type="button" className="b-btn b-btn--primary" onClick={onPublish}>Publică</button>
      </div>

      <div className="b-top__blocks">
        <span>Adaugă:</span>
        <button type="button" className="b-btn b-btn--sm" onClick={() => onAddBlock('heading')}>Titlu</button>
        <button type="button" className="b-btn b-btn--sm" onClick={() => onAddBlock('banner')}>Banner</button>
        <button type="button" className="b-btn b-btn--sm" onClick={() => onAddBlock('image')}>Imagine</button>
        <button type="button" className="b-btn b-btn--sm" onClick={() => onAddBlock('text')}>Text</button>
      </div>

      {publishIssues.length ? (
        <div className="b-top__issues" role="alert">
          <strong>Nu se poate publica:</strong>
          <ul>
            {publishIssues.map((msg, i) => (
              <li key={i}>
                <button type="button" onClick={() => onIssueClick(i)}>{msg}</button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
