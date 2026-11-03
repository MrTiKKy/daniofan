'use client';
/* Panou dreapta: Preview + tab-uri (Detalii produs | Design pagină). */
import { useEffect, useMemo, useState } from 'react';
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
import type { Product } from '@/lib/types';
import PageBgPickerModal from './PageBgPickerModal';
import ProductShelfModal, { type ShelfDraft } from './ProductShelfModal';

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
  /** Actualizează produsul din catalog (preț normal, categorie, etc.). */
  onProductUpdate?: (productId: string, patch: Partial<Product>) => void;
  categories?: string[];
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

export default function BuilderInspectorPanel({
  item, baseProduct, display, page, canPreview, previewOn, onPreview, onChange,
  onProductUpdate, categories = [], onChromeChange,
  onAddMessage, onMessageChange, onRemoveMessage, onClose,
}: Props) {
  const [tab, setTab] = useState<InspectorTab>('product');
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const chrome = resolvePageChrome(page);
  const header = chrome.header!;
  const bgPreset = getPageBgPreset(chrome.bg);
  const messageSelected = !!(item && isMessageItem(item));
  const msgDesign = messageSelected && item ? resolveMessageDesign(item) : null;

  /* click pe produs → tab Detalii; eticheta doar din „Editează eticheta”. Mesaj → Design. */
  useEffect(() => {
    if (!item?.id) return;
    if (isMessageItem(item)) {
      setTab('design');
      setShelfOpen(false);
    } else {
      setTab('product');
      setShelfOpen(false);
    }
  }, [item?.id]);

  const setBg = (bg: PageBgPresetId) => onChromeChange({ bg });
  const setHeader = (patch: Partial<typeof header>) => {
    onChromeChange({ header: { ...header, ...patch } });
  };

  const hasProductSelection = !!(item && baseProduct && display && !messageSelected);

  const shelfInitial: ShelfDraft = useMemo(() => {
    if (!display) {
      return {
        brand: '', name: '', size: '', oldPrice: 0, newPrice: 0, category: '', image: '',
      };
    }
    return {
      brand: display.brand || '',
      name: display.name || '',
      size: display.size || '',
      unitQty: display.unitQty,
      unitKind: display.unitKind,
      oldPrice: +display.oldPrice || 0,
      newPrice: +display.newPrice || 0,
      category: baseProduct?.category || '',
      image: display.images[0] || '',
    };
  }, [display, baseProduct?.category, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- re-seed on product switch

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
                Click pe un produs din pagină ca să editezi eticheta (brand, preț, poză).
              </p>
            ) : (
              <>
                <p className="bi-panel__note">
                  {display.brand ? `${display.brand} · ` : ''}{display.name || 'Produs'}
                </p>
                <button
                  type="button"
                  className="bi-add-block"
                  onClick={() => setShelfOpen(true)}
                >
                  Editează eticheta
                </button>

                <ProductShelfModal
                  open={shelfOpen}
                  title="Editează produs"
                  initial={shelfInitial}
                  categories={categories}
                  showPromoPrice
                  onClose={() => setShelfOpen(false)}
                  onSave={(d) => {
                    const restImgs = (display.images || []).slice(1);
                    onChange({
                      brand: d.brand,
                      name: d.name,
                      size: d.size,
                      unitQty: d.unitQty,
                      unitKind: d.unitKind,
                      oldPrice: d.oldPrice,
                      newPrice: d.newPrice,
                      images: d.image ? [d.image, ...restImgs] : restImgs,
                    });
                    if (baseProduct?.id && onProductUpdate) {
                      onProductUpdate(baseProduct.id, {
                        brand: d.brand || undefined,
                        size: d.size,
                        oldPrice: d.oldPrice,
                        unitQty: d.unitQty,
                        unitKind: d.unitKind,
                        category: d.category || baseProduct.category,
                        image: d.image || baseProduct.image,
                      });
                    }
                  }}
                />
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
