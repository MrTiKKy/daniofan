'use client';
/* Panou dreapta: Preview + tab-uri (Detalii produs | Design pagină). */
import { useEffect, useMemo, useState } from 'react';
import type {
  CatalogPage,
  DecorFontId,
  PageBgPresetId,
  PageChrome,
  PageDecorItem,
  PageHeaderStyleId,
  PageItem,
  PageItemDisplay,
  PageShapeKind,
} from '@/lib/catalogTypes';
import {
  getPageBgPreset,
  PAGE_HEADER_STYLES,
  resolvePageChrome,
} from '@/lib/pageChrome';
import {
  decorFontMeta,
  isDecorShape,
  isDecorText,
  PAGE_SHAPE_KINDS,
  PAGE_SHAPE_QUICK,
  PAGE_TEXT_FONT_PRESETS,
} from '@/lib/pageDecor';
import {
  resolveItemPriceStyle,
  resolvePagePriceStyle,
} from '@/lib/priceStyle';
import type { Product } from '@/lib/types';
import ColorSwatchRow from './ColorSwatchRow';
import PageBgPickerModal from './PageBgPickerModal';
import PageShapePickerModal from './PageShapePickerModal';
import PageShapeSvg from './PageShapeSvg';
import PriceStyleControls from './PriceStyleControls';
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
  selectedDecorId?: string | null;
  onSelectDecor?: (id: string | null) => void;
  onAddShape?: (shape: PageShapeKind, fill: string) => void;
  onAddText?: () => void;
  onDecorChange?: (id: string, patch: Partial<PageDecorItem>) => void;
  onRemoveDecor?: (id: string) => void;
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
  selectedDecorId = null, onSelectDecor, onAddShape, onAddText, onDecorChange, onRemoveDecor,
  onClose,
}: Props) {
  const [tab, setTab] = useState<InspectorTab>('product');
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [shapePickerOpen, setShapePickerOpen] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [shapeFill, setShapeFill] = useState('#E30613');
  const [textFill, setTextFill] = useState('#111111');
  const quickShapes = PAGE_SHAPE_QUICK
    .map((id) => PAGE_SHAPE_KINDS.find((k) => k.id === id))
    .filter((k): k is (typeof PAGE_SHAPE_KINDS)[number] => !!k);
  const chrome = resolvePageChrome(page);
  const header = chrome.header!;
  const bgPreset = getPageBgPreset(chrome.bg);
  const pagePrice = resolvePagePriceStyle(chrome);
  const hasPriceOverride = !!(display?.priceStyle && Object.keys(display.priceStyle).length);
  const itemPrice = resolveItemPriceStyle(pagePrice, display);
  const decorItems = page?.decor || [];
  const selectedDecor = decorItems.find((d) => d.id === selectedDecorId) || null;
  const selectedShape = selectedDecor && isDecorShape(selectedDecor) ? selectedDecor : null;
  const selectedText = selectedDecor && isDecorText(selectedDecor) ? selectedDecor : null;
  const textItems = decorItems.filter(isDecorText);
  const shapeItems = decorItems.filter(isDecorShape);
  const shapeLabel = (shape: PageShapeKind) =>
    PAGE_SHAPE_KINDS.find((k) => k.id === shape)?.label || shape;

  /* click pe produs → tab Detalii */
  useEffect(() => {
    if (!item?.id) return;
    setTab('product');
    setShelfOpen(false);
  }, [item?.id]);

  const setBg = (bg: PageBgPresetId) => onChromeChange({ bg });
  const setHeader = (patch: Partial<typeof header>) => {
    onChromeChange({ header: { ...header, ...patch } });
  };

  const hasProductSelection = !!(item && baseProduct && display);

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
        {hasProductSelection && tab === 'product' ? (
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
            {!hasProductSelection || !display ? (
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

                <div className="bi-section" style={{ marginTop: 14, paddingBottom: 0, borderBottom: 0 }}>
                  <label className="bi-chk">
                    <input
                      type="checkbox"
                      checked={!!display.showUnitPrice}
                      onChange={(e) => onChange({ showUnitPrice: e.target.checked })}
                    />
                    Afișează informații suplimentare (preț/kg sau /l)
                  </label>
                  <p className="bi-panel__sub" style={{ marginTop: 6 }}>
                    Doar pe această casuță.
                  </p>
                </div>

                <div className="bi-section" style={{ marginTop: 14 }}>
                  <h3>Stil preț</h3>
                  <label className="bi-chk">
                    <input
                      type="checkbox"
                      checked={hasPriceOverride}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onChange({
                            priceStyle: {
                              promoColor: pagePrice.promoColor,
                              digitStyle: pagePrice.digitStyle,
                              look: pagePrice.look,
                            },
                          });
                        } else {
                          onChange({ priceStyle: undefined });
                        }
                      }}
                    />
                    produs modificat individual
                  </label>
                  {hasPriceOverride ? (
                    <PriceStyleControls
                      value={itemPrice}
                      onChange={(patch) => onChange({
                        priceStyle: {
                          promoColor: itemPrice.promoColor,
                          digitStyle: itemPrice.digitStyle,
                          look: itemPrice.look,
                          ...patch,
                        },
                      })}
                    />
                  ) : null}
                </div>

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
                <section className="bi-card">
                  <h3 className="bi-card__title">Fundal</h3>
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
                </section>

                <section className="bi-card">
                  <h3 className="bi-card__title">Header</h3>
                  <label className="bi-chk">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={(e) => setHeader({ enabled: e.target.checked })}
                    />
                    Afișează bandă sus pe foaie
                  </label>
                  <Field label="Titlu">
                    <input
                      type="text"
                      value={header.text}
                      disabled={!header.enabled}
                      onChange={(e) => setHeader({ text: e.target.value })}
                      placeholder="ex. Legume, fructe și plante"
                    />
                  </Field>
                  <Field label="Subtitlu">
                    <input
                      type="text"
                      value={header.subtitle || ''}
                      disabled={!header.enabled}
                      onChange={(e) => setHeader({ subtitle: e.target.value })}
                      placeholder="ex. Valabilitate ofertă"
                    />
                  </Field>
                  <p className="bi-label">Culoare</p>
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
                </section>

                <section className="bi-card">
                  <h3 className="bi-card__title">Decor</h3>

                  <div className="bi-decor-block">
                    <div className="bi-decor-block__head">
                      <p className="bi-label">Text</p>
                      <button
                        type="button"
                        className="bi-add-text"
                        disabled={!onAddText}
                        aria-label="Adaugă text"
                        title="Adaugă text"
                        onClick={() => onAddText?.()}
                      >
                        <span aria-hidden="true">+</span>
                      </button>
                    </div>
                    {selectedText ? (
                      <div className="bi-edit-box">
                        <Field label="Conținut">
                          <input
                            type="text"
                            value={selectedText.text || ''}
                            onChange={(e) => onDecorChange?.(selectedText.id, { text: e.target.value })}
                            placeholder="Text pe pagină"
                          />
                        </Field>
                        <p className="bi-label">Font</p>
                        <div className="bi-text-fonts" role="listbox" aria-label="Font">
                          {PAGE_TEXT_FONT_PRESETS.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              role="option"
                              title={f.label}
                              aria-label={f.label}
                              aria-selected={(selectedText.fontFamily || 'cond') === f.id}
                              className={'bi-text-font' + ((selectedText.fontFamily || 'cond') === f.id ? ' is-on' : '')}
                              style={{
                                fontFamily: f.css,
                                fontWeight: f.weight,
                                fontStyle: f.italic ? 'italic' : 'normal',
                              }}
                              onClick={() => {
                                const meta = decorFontMeta(f.id);
                                onDecorChange?.(selectedText.id, {
                                  fontFamily: f.id as DecorFontId,
                                  fontWeight: meta.weight,
                                  italic: !!meta.italic,
                                });
                              }}
                            >
                              A
                            </button>
                          ))}
                        </div>
                        <label className="bi-chk">
                          <input
                            type="checkbox"
                            checked={selectedText.uppercase !== false}
                            onChange={(e) => onDecorChange?.(selectedText.id, { uppercase: e.target.checked })}
                          />
                          Majuscule
                        </label>
                        <ColorSwatchRow
                          label="Culoare"
                          value={selectedText.fill || textFill}
                          onChange={(c) => {
                            setTextFill(c);
                            onDecorChange?.(selectedText.id, { fill: c });
                          }}
                        />
                        <label className="bi-radius">
                          <span>Opacitate</span>
                          <div className="bi-radius__row">
                            <input
                              type="range"
                              min={15}
                              max={100}
                              step={1}
                              value={Math.round((selectedText.opacity ?? 1) * 100)}
                              onChange={(e) => onDecorChange?.(selectedText.id, {
                                opacity: Number(e.target.value) / 100,
                              })}
                            />
                            <span className="bi-radius__val">
                              {Math.round((selectedText.opacity ?? 1) * 100)}%
                            </span>
                          </div>
                        </label>
                        <label className="bi-radius">
                          <span>Rotație</span>
                          <div className="bi-radius__row">
                            <input
                              type="range"
                              min={-45}
                              max={45}
                              step={1}
                              value={selectedText.rotate ?? 0}
                              onChange={(e) => onDecorChange?.(selectedText.id, {
                                rotate: Number(e.target.value),
                              })}
                            />
                            <span className="bi-radius__val">{selectedText.rotate ?? 0}°</span>
                          </div>
                        </label>
                        <button
                          type="button"
                          className="bi-msg-del"
                          onClick={() => onRemoveDecor?.(selectedText.id)}
                        >
                          Șterge textul
                        </button>
                      </div>
                    ) : textItems.length > 0 ? (
                      <div className="bi-decor-list" role="listbox" aria-label="Texte pe pagină">
                        {textItems.map((d) => (
                          <div key={d.id} className="bi-decor-row">
                            <button
                              type="button"
                              role="option"
                              aria-selected={false}
                              className="bi-decor-row__pick"
                              onClick={() => onSelectDecor?.(d.id)}
                            >
                              <span
                                className="bi-decor-row__swatch"
                                style={{ background: d.fill }}
                                aria-hidden="true"
                              />
                              <span>{(d.text || 'Text').slice(0, 24)}</span>
                            </button>
                            <button
                              type="button"
                              className="bi-decor-row__del"
                              aria-label="Șterge text"
                              onClick={() => onRemoveDecor?.(d.id)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="bi-decor-block">
                    <div className="bi-decor-block__head">
                      <p className="bi-label">Forme</p>
                      <button
                        type="button"
                        className="bi-shape-more"
                        title="Mai multe forme"
                        aria-label="Mai multe forme"
                        disabled={!onAddShape}
                        onClick={() => setShapePickerOpen(true)}
                      >
                        <span aria-hidden="true">+</span>
                      </button>
                    </div>
                    <div className="bi-shapes-row" role="listbox" aria-label="Forme rapide">
                      {quickShapes.map((k) => (
                        <button
                          key={k.id}
                          type="button"
                          role="option"
                          title={k.label}
                          aria-label={k.label}
                          className="bi-shape-quick"
                          disabled={!onAddShape}
                          onClick={() => onAddShape?.(k.id, shapeFill)}
                        >
                          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                            <PageShapeSvg shape={k.id} fill={shapeFill} />
                          </svg>
                        </button>
                      ))}
                    </div>
                    <PageShapePickerModal
                      open={shapePickerOpen}
                      fill={shapeFill}
                      onSelect={(shape) => onAddShape?.(shape, shapeFill)}
                      onClose={() => setShapePickerOpen(false)}
                    />
                    <ColorSwatchRow
                      label="Culoare"
                      value={selectedShape?.fill || shapeFill}
                      onChange={(c) => {
                        setShapeFill(c);
                        if (selectedShape && onDecorChange) {
                          onDecorChange(selectedShape.id, { fill: c });
                        }
                      }}
                    />
                    {selectedShape ? (
                      <div className="bi-edit-box">
                        <p className="bi-label">{shapeLabel(selectedShape.shape)}</p>
                        <label className="bi-radius">
                          <span>Opacitate</span>
                          <div className="bi-radius__row">
                            <input
                              type="range"
                              min={15}
                              max={100}
                              step={1}
                              value={Math.round((selectedShape.opacity ?? 1) * 100)}
                              onChange={(e) => onDecorChange?.(selectedShape.id, {
                                opacity: Number(e.target.value) / 100,
                              })}
                            />
                            <span className="bi-radius__val">
                              {Math.round((selectedShape.opacity ?? 1) * 100)}%
                            </span>
                          </div>
                        </label>
                        <label className="bi-radius">
                          <span>Rotație</span>
                          <div className="bi-radius__row">
                            <input
                              type="range"
                              min={-45}
                              max={45}
                              step={1}
                              value={selectedShape.rotate ?? 0}
                              onChange={(e) => onDecorChange?.(selectedShape.id, {
                                rotate: Number(e.target.value),
                              })}
                            />
                            <span className="bi-radius__val">{selectedShape.rotate ?? 0}°</span>
                          </div>
                        </label>
                        <button
                          type="button"
                          className="bi-msg-del"
                          onClick={() => onRemoveDecor?.(selectedShape.id)}
                        >
                          Șterge forma
                        </button>
                      </div>
                    ) : shapeItems.length > 0 ? (
                      <div className="bi-decor-list" role="listbox" aria-label="Forme pe pagină">
                        {shapeItems.map((d) => (
                          <div key={d.id} className="bi-decor-row">
                            <button
                              type="button"
                              role="option"
                              aria-selected={false}
                              className="bi-decor-row__pick"
                              onClick={() => onSelectDecor?.(d.id)}
                            >
                              <span
                                className="bi-decor-row__swatch"
                                style={{ background: d.fill }}
                                aria-hidden="true"
                              />
                              <span>{shapeLabel(d.shape)}</span>
                            </button>
                            <button
                              type="button"
                              className="bi-decor-row__del"
                              aria-label={`Șterge ${shapeLabel(d.shape)}`}
                              onClick={() => onRemoveDecor?.(d.id)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="bi-card">
                  <h3 className="bi-card__title">Stil prețuri</h3>
                  <PriceStyleControls
                    value={pagePrice}
                    onChange={(patch) => onChromeChange({
                      price: { ...(chrome.price || {}), ...patch },
                    })}
                  />
                </section>
              </>
            )}

          </div>
        )}
      </div>
    </aside>
  );
}
