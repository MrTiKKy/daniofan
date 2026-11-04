/* Stil prețuri pe foaie (chrome) + override pe produs (display). */
import type { PageChrome, PageItemDisplay, PagePriceStyle } from './catalogTypes';

export type PriceDigitStyleId = NonNullable<PagePriceStyle['digitStyle']>;
export type PriceLookId = NonNullable<PagePriceStyle['look']>;

/** Stil rezolvat (toate câmpurile setate) — pentru render. */
export interface ResolvedPriceStyle {
  promoColor: string;
  digitStyle: PriceDigitStyleId;
  look: PriceLookId;
}

export const DEFAULT_PAGE_PRICE_STYLE: ResolvedPriceStyle = {
  promoColor: '#E30613',
  digitStyle: 'clasic',
  look: 'clasic',
};

export interface PriceStylePreset {
  id: string;
  label: string;
  style: ResolvedPriceStyle;
}

export const PRICE_STYLE_PRESETS: PriceStylePreset[] = [
  {
    id: 'brand-red',
    label: 'Roșu brand',
    style: { promoColor: '#E30613', digitStyle: 'clasic', look: 'clasic' },
  },
  {
    id: 'ink',
    label: 'Negru tipar',
    style: { promoColor: '#111111', digitStyle: 'clasic', look: 'clasic' },
  },
  {
    id: 'blue',
    label: 'Albastru',
    style: { promoColor: '#1559E0', digitStyle: 'oblic', look: 'clasic' },
  },
  {
    id: 'outline-red',
    label: 'Contour roșu',
    style: { promoColor: '#E30613', digitStyle: 'bold', look: 'clasic' },
  },
  {
    id: 'flash',
    label: 'Flash',
    style: { promoColor: '#FF9F43', digitStyle: 'bold', look: 'clasic' },
  },
];

/** Același font (--cond): clasic, oblic, bold (umflat). */
export const PRICE_DIGIT_STYLES: { id: PriceDigitStyleId; label: string }[] = [
  { id: 'clasic', label: 'Clasic' },
  { id: 'oblic', label: 'Oblic' },
  { id: 'bold', label: 'Bold' },
];

/** Stiluri bloc preț (Clasic = default cu umbră). */
export const PRICE_LOOKS: { id: PriceLookId; label: string }[] = [
  { id: 'clasic', label: 'Clasic' },
  { id: 'plat', label: 'Plat' },
  { id: 'contour', label: 'Contour' },
  { id: 'stampila', label: 'Stampilă' },
  { id: 'relief', label: 'Dublu relief' },
  { id: 'negativ', label: 'Negativ' },
];

/** Swatch-uri rapide + picker personalizat în UI. */
export const PROMO_COLOR_SWATCHES = [
  '#E30613', /* roșu brand */
  '#111111', /* negru tipar */
  '#1559E0', /* albastru ofertă */
  '#2FAE5A', /* verde fresh (deschis) */
  '#FF9F43', /* portocaliu deschis */
  '#7A1FA2', /* mov */
] as const;

function isDigit(v: unknown): v is PriceDigitStyleId {
  return v === 'clasic' || v === 'oblic' || v === 'bold';
}

const LOOK_IDS: PriceLookId[] = ['clasic', 'plat', 'contour', 'stampila', 'relief', 'negativ'];

function normalizeLook(v: unknown): PriceLookId {
  /* Vechile umbră / compact / default → clasic (cu umbră). */
  if (v === 'default' || v === 'shadow' || v === 'tight') return 'clasic';
  if (typeof v === 'string' && (LOOK_IDS as string[]).includes(v)) return v as PriceLookId;
  return DEFAULT_PAGE_PRICE_STYLE.look;
}

export function resolvePagePriceStyle(chrome?: PageChrome | null): ResolvedPriceStyle {
  const raw = chrome?.price;
  return {
    promoColor: (raw?.promoColor && String(raw.promoColor).trim()) || DEFAULT_PAGE_PRICE_STYLE.promoColor,
    digitStyle: isDigit(raw?.digitStyle) ? raw.digitStyle : DEFAULT_PAGE_PRICE_STYLE.digitStyle,
    look: normalizeLook(raw?.look),
  };
}

/**
 * Stil efectiv pe casuță.
 * Fără `display.priceStyle` → stilul paginii.
 * Cu override (bifa „produs modificat individual”) → stil izolat; Design pagină nu mai afectează.
 */
export function resolveItemPriceStyle(
  pageStyle: ResolvedPriceStyle,
  display?: PageItemDisplay | null,
): ResolvedPriceStyle {
  const o = display?.priceStyle;
  if (!o || !Object.keys(o).length) return pageStyle;
  return {
    promoColor: (o.promoColor && String(o.promoColor).trim()) || DEFAULT_PAGE_PRICE_STYLE.promoColor,
    digitStyle: isDigit(o.digitStyle) ? o.digitStyle : DEFAULT_PAGE_PRICE_STYLE.digitStyle,
    look: o.look !== undefined ? normalizeLook(o.look) : DEFAULT_PAGE_PRICE_STYLE.look,
  };
}

export function matchingPricePresetId(style: ResolvedPriceStyle): string | null {
  const hit = PRICE_STYLE_PRESETS.find(
    (p) =>
      p.style.promoColor.toLowerCase() === style.promoColor.toLowerCase()
      && p.style.digitStyle === style.digitStyle
      && p.style.look === style.look,
  );
  return hit?.id || null;
}

export function priceStyleCssVars(style: ResolvedPriceStyle): Record<string, string> {
  return { '--promo-price': style.promoColor };
}
