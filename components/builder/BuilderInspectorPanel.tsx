'use client';
/* Panou dreapta: Preview + tab-uri (Detalii produs | Design pagină). */
import { useEffect, useState } from 'react';
import type {
  CatalogPage,
  PageBgPresetId,
  PageChrome,
  PageHeaderStyleId,
  PageItem,
  PageItemDesign,
  PageItemDisplay,
} from '@/lib/catalogTypes';
import type { MessageFontId } from '@/lib/catalogTypes';
import {
  canAddMessage,
  isMessageItem,
  MESSAGE_COLOR_PRESETS,
  MESSAGE_FONT_PRESETS,
  resolveMessageDesign,
} from '@/lib/messageBlock';
import {
  getPageBgPreset,
  PAGE_HEADER_STYLES,
  resolvePageChrome,
} from '@/lib/pageChrome';
import * as DF from '@/lib/store';
import type { Product } from '@/lib/types';
import PageBgPickerModal from './PageBgPickerModal';

type InspectorTab = 'product' | 'design';

interface Props {
  item: PageItem | null;
  baseProduct: Product | null;
  display: PageItemDisplay | null;
  page: CatalogPage | null;
  canPreview: boolean;
  previewOn: boolean;
  onPreview: () => void;
  onChange: (patch: Partial<PageItemDisplay>) => void;
  /** Patch pe căsuță (ex. featured) — separat de display */
  onItemPatch?: (patch: Partial<PageItem>) => void;
  /** Câte căsuțe sunt deja marcate vedetă în toată revista */
  featuredCount?: number;
  onChromeChange: (patch: Partial<PageChrome>) => void;
  onAddMessage: () => void;
  onMessageChange: (patch: { text?: string; design?: Partial<PageItemDesign> }) => void;
  onRemoveMessage: () => void;
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
  item, baseProduct, display, page, canPreview, previewOn, onPreview, onChange, onItemPatch,
  featuredCount = 0, onChromeChange,
  onAddMessage, onMessageChange, onRemoveMessage, onClose,
}: Props) {
  const [tab, setTab] = useState<InspectorTab>('product');
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [oldStr, setOldStr] = useState('');
  const [newStr, setNewStr] = useState('');
  const chrome = resolvePageChrome(page);
  const header = chrome.header!;
  const bgPreset = getPageBgPreset(chrome.bg);
  const messageSelected = !!(item && isMessageItem(item));
  const msgDesign = messageSelected && item ? resolveMessageDesign(item) : null;

  /* click pe produs → Detalii; click pe bloc mesaj → Design */
  useEffect(() => {
    if (!item?.id) return;
    setTab(isMessageItem(item) ? 'design' : 'product');
  }, [item?.id]);

  const setBg = (bg: PageBgPresetId) => onChromeChange({ bg });
  const setHeader = (patch: Partial<typeof header>) => {
    onChromeChange({ header: { ...header, ...patch } });
  };

  useEffect(() => {
    if (!display || !item) return;
    setOldStr(display.oldPrice ? DF.fmtPrice(display.oldPrice) : '');
    setNewStr(display.newPrice ? DF.fmtPrice(display.newPrice) : '');
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- sync only on product switch

  const imgs = display
    ? [display.images[0] || '', display.images[1] || '']
    : ['', ''];

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

  const hasProductSelection = !!(item && baseProduct && display && !messageSelected);

  return (
    <aside className="bi-panel" aria-label="Instrumente pagină">
      <div className="bi-panel__head">
        <h2>Instrumente</h2>
        {(hasProductSelection && tab === 'product') || (messageSelected && tab === 'design') ? (
          <button type="button" className="bi-panel__x" aria-label="Deselectează" onClick={onClose}>×</button>
        ) : null}
      </div>

      <div className="bi-panel__tools">
        <button
          type="button"
          className={'bi-preview-btn' + (previewOn ? ' is-on' : '')}
          disabled={!canPreview}
          onClick={onPreview}
          aria-pressed={previewOn}
        >
          {previewOn ? 'Ieși din preview' : 'Preview pagină'}
        </button>
        <p className="bi-panel__tools-hint">
          {previewOn
            ? 'Foaia curată — fără linii și mânere. Apasă din nou ca să editezi.'
            : 'Ascunde liniile punctate și instrumentele pe foaie.'}
        </p>
      </div>

      <div className="bi-tabs" role="tablist" aria-label="Secțiuni panou">
        <button
          type="button"
          role="tab"
          id="bi-tab-product"
          className={'bi-tabs__btn' + (tab === 'product' ? ' is-on' : '')}
          aria-selected={tab === 'product'}
          aria-controls="bi-panel-product"
          onClick={() => setTab('product')}
        >
          Detalii produs
        </button>
        <button
          type="button"
          role="tab"
          id="bi-tab-design"
          className={'bi-tabs__btn' + (tab === 'design' ? ' is-on' : '')}
          aria-selected={tab === 'design'}
          aria-controls="bi-panel-design"
          onClick={() => setTab('design')}
        >
          Design pagină
        </button>
      </div>

      <div className="bi-panel__body">
        {tab === 'product' ? (
          <div
            id="bi-panel-product"
            role="tabpanel"
            aria-labelledby="bi-tab-product"
          >
            {messageSelected ? (
              <p className="bi-panel__hint">
                Ai selectat un bloc mesaj — editează-l din tab-ul <strong>Design pagină</strong>.
              </p>
            ) : !hasProductSelection || !display ? (
              <p className="bi-panel__hint">
                Click pe un produs din pagină ca să-i editezi detaliile aici. Modificările rămân doar în această ofertă.
              </p>
            ) : (
              <>
                <p className="bi-panel__note">Doar în această ofertă — nu schimbă produsul din tab-ul Produse.</p>

                <div className="bi-section">
                  <label className="bi-featured">
                    <input
                      type="checkbox"
                      checked={!!item.featured}
                      onChange={(e) => onItemPatch?.({ featured: e.target.checked })}
                    />
                    <span className="bi-featured__star" aria-hidden>★</span>
                    <span>Vedetă pe pagina de pornire</span>
                  </label>
                  {featuredCount > 10 ? (
                    <p className="bi-featured__warn" role="status">
                      Ai marcat {featuredCount} produse vedetă — ideal sunt cel mult 10.
                    </p>
                  ) : null}
                </div>

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
                            ? <img src={DF.imageSrc(imgs[i])} alt="" />
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
              </>
            )}
          </div>
        ) : (
          <div
            id="bi-panel-design"
            role="tabpanel"
            aria-labelledby="bi-tab-design"
          >
            {!page ? (
              <p className="bi-panel__hint">Creează o pagină ca să alegi fundalul și headerul.</p>
            ) : (
              <>
                <div className="bi-section">
                  <h3>Bloc mesaj</h3>
                  <p className="bi-panel__sub">Bloc colorat pe grilă — mută / redimensionează chenarul; dublu-click pentru text liber.</p>
                  <button
                    type="button"
                    className="bi-add-block"
                    disabled={!canAddMessage(page)}
                    onClick={onAddMessage}
                  >
                    + Adaugă bloc
                  </button>
                  {messageSelected && item && msgDesign ? (
                    <div className="bi-msg-edit">
                      <Field label="Text">
                        <input
                          type="text"
                          value={item.text || ''}
                          onChange={(e) => onMessageChange({ text: e.target.value })}
                          placeholder="Mesajul pe pagină"
                        />
                      </Field>
                      <label className="bi-radius">
                        <span>Colțuri (drept → cerc)</span>
                        <div className="bi-radius__row">
                          <input
                            type="range"
                            min={0}
                            max={50}
                            step={1}
                            value={msgDesign.radius ?? 18}
                            onChange={(e) => onMessageChange({ design: { radius: Number(e.target.value) } })}
                          />
                          <span className="bi-radius__val">{msgDesign.radius ?? 18}</span>
                        </div>
                      </label>
                      <label className="bi-radius">
                        <span>Fade pe margini</span>
                        <div className="bi-radius__row">
                          <input
                            type="range"
                            min={0}
                            max={40}
                            step={1}
                            value={msgDesign.edgeFade ?? 0}
                            onChange={(e) => onMessageChange({ design: { edgeFade: Number(e.target.value) } })}
                          />
                          <span className="bi-radius__val">{msgDesign.edgeFade ?? 0}</span>
                        </div>
                      </label>
                      <p className="bi-panel__sub">Font</p>
                      <div className="bi-msg-fonts" role="listbox" aria-label="Font">
                        {MESSAGE_FONT_PRESETS.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            role="option"
                            aria-selected={(msgDesign.fontFamily || 'cond') === f.id}
                            className={'bi-msg-font' + ((msgDesign.fontFamily || 'cond') === f.id ? ' is-on' : '')}
                            style={{
                              fontFamily: f.css,
                              fontWeight: f.weight,
                              fontStyle: f.italic ? 'italic' : 'normal',
                            }}
                            onClick={() => onMessageChange({
                              design: {
                                fontFamily: f.id as MessageFontId,
                                fontWeight: f.weight,
                              },
                            })}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                      <label className="bi-chk" style={{ marginTop: 4 }}>
                        <input
                          type="checkbox"
                          checked={msgDesign.uppercase !== false}
                          onChange={(e) => onMessageChange({ design: { uppercase: e.target.checked } })}
                        />
                        Majuscule
                      </label>
                      <p className="bi-panel__sub">Culoare bloc</p>
                      <div className="bi-msg-colors" role="listbox" aria-label="Culoare bloc">
                        {MESSAGE_COLOR_PRESETS.map((c) => (
                          <button
                            key={c.label}
                            type="button"
                            role="option"
                            title={c.label}
                            aria-selected={msgDesign.background === c.background}
                            className={'bi-msg-color' + (msgDesign.background === c.background ? ' is-on' : '')}
                            style={{ background: c.background, color: c.color }}
                            onClick={() => onMessageChange({ design: { background: c.background, color: c.color } })}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                      <p className="bi-panel__hint">
                        Dublu-click pe bloc: mută textul și scroll pentru mărime (ca la produs).
                      </p>
                      <button type="button" className="bi-msg-del" onClick={onRemoveMessage}>
                        Șterge blocul
                      </button>
                    </div>
                  ) : (
                    <p className="bi-panel__hint" style={{ marginTop: 8 }}>
                      Sau click pe un bloc de pe foaie ca să-i schimbi textul, fontul și colțurile.
                    </p>
                  )}
                </div>

                <div className="bi-section">
                  <h3>Fundal pagină</h3>
                  <button
                    type="button"
                    className="bi-bg-pick"
                    onClick={() => setBgPickerOpen(true)}
                  >
                    <span className="bi-bg-pick__swatch" style={{ background: bgPreset.css }} aria-hidden="true" />
                    <span className="bi-bg-pick__meta">
                      <strong>{bgPreset.label}</strong>
                      <span>Selectează șablon</span>
                    </span>
                  </button>
                  <PageBgPickerModal
                    open={bgPickerOpen}
                    selected={chrome.bg}
                    onSelect={setBg}
                    onClose={() => setBgPickerOpen(false)}
                  />
                </div>

                <div className="bi-section">
                  <h3>Header pagină</h3>
                  <label className="bi-chk">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={(e) => setHeader({ enabled: e.target.checked })}
                    />
                    Afișează bandă sus pe foaie
                  </label>
                  <Field label="Titlu pagină">
                    <input
                      type="text"
                      value={header.text}
                      disabled={!header.enabled}
                      onChange={(e) => setHeader({ text: e.target.value })}
                      placeholder="ex. Legume, fructe și plante"
                    />
                  </Field>
                  <Field label="Subtitlu (opțional)">
                    <input
                      type="text"
                      value={header.subtitle || ''}
                      disabled={!header.enabled}
                      onChange={(e) => setHeader({ subtitle: e.target.value })}
                      placeholder="ex. Valabilitate ofertă: 21.10 – 26.10"
                    />
                  </Field>
                  <p className="bi-panel__sub">Culoare header</p>
                  <div className="bi-header-styles" role="listbox" aria-label="Stil header">
                    {PAGE_HEADER_STYLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="option"
                        aria-selected={header.style === s.id}
                        className={'bi-header-style' + (header.style === s.id ? ' is-on' : '')}
                        disabled={!header.enabled}
                        onClick={() => setHeader({ style: s.id as PageHeaderStyleId })}
                        title={s.label}
                        style={{ ['--hs' as string]: s.swatch }}
                      >
                        <span className="bi-header-style__bar" aria-hidden="true" />
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
