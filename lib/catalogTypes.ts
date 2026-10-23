/* Modelul revistei pe grilă. Independent de OfferData vechi — pregătit pentru Neon. */

export type ThemeKey = 'standard' | 'paste' | 'craciun';
export type CatalogStatus = 'draft' | 'published';

/** Cele 2 tipuri de revistă pe pagina de pornire / viewer. */
export type MagazineKind = 'weekend' | 'special';

export const MAGAZINE_KINDS: MagazineKind[] = ['weekend', 'special'];

export function magazineKindLabel(kind: MagazineKind): string {
  return kind === 'weekend' ? 'Oferta de weekend' : 'Ofertă specială';
}

export function isMagazineKind(v: string): v is MagazineKind {
  return v === 'weekend' || v === 'special';
}
export type PageItemType = 'product' | 'heading' | 'banner' | 'image' | 'text';
export type MediaLayout = 'single' | 'side' | 'stack' | 'fan' | 'hero-small';

export interface ProductImage {
  src: string;
  w: number;
  h: number;
}

export interface CatalogProduct {
  id: string;
  brand: string;
  name: string;
  /** gramaj, sortimente etc. */
  details: string;
  /** unitate pentru preț/kg (ex. kg, l) */
  unit: string;
  /** cantitate numerică (ex. 0.5) */
  unitQty: number;
  normalPrice: number;
  images: ProductImage[];
}

export interface MediaSlot {
  imageIndex: number;
  /** offset orizontal în % */
  x: number;
  /** offset vertical în % */
  y: number;
  scale: number;
}

/** Transform pe o poză din casuță (mod gesturi) */
export interface ImageLayout {
  /** offset orizontal în % din lățimea zonei de poză */
  x: number;
  /** offset vertical în % din înălțimea zonei de poză */
  y: number;
  /** 1 = mărime implicită */
  scale: number;
  /** înclinare în grade (tilt) */
  rotate?: number;
}

export const DEFAULT_IMAGE_LAYOUT: ImageLayout = { x: 0, y: 0, scale: 1, rotate: 0 };

/** Poziție absolută în casuță (% din lățime/înălțime — colț stânga-sus) */
export interface BoxPos {
  x: number;
  y: number;
  /** 1 = mărime implicită (scroll resize în mod gesturi) */
  scale?: number;
}

export const DEFAULT_TEXT_POS: BoxPos = { x: 0, y: 70, scale: 1 };
export const DEFAULT_PRICE_POS: BoxPos = { x: 52, y: 64, scale: 1 };
export const DEFAULT_TEXT_POS_LEFT: BoxPos = { x: 40, y: 70, scale: 1 };
export const DEFAULT_PRICE_POS_LEFT: BoxPos = { x: 0, y: 64, scale: 1 };
/** Inimioară listă — colț dreapta-sus (mutabilă în constructor) */
export const DEFAULT_HEART_POS: BoxPos = { x: 78, y: 1, scale: 1 };

/** Copie locală pe casuță — nu modifică produsul din tab-ul Produse */
export interface PageItemDisplay {
  brand: string;
  name: string;
  size: string;
  variants: string;
  specialLabel: string;
  oldPrice: number;
  newPrice: number;
  unitQty?: number;
  unitKind?: string;
  /** 1–2 poze doar pentru această ofertă / casuță */
  images: string[];
  /** layout per poză (paralel cu images) */
  imageLayouts?: ImageLayout[];
  /** pozele pot ieși din chenarul casuței */
  overflow?: boolean;
  /** true = prețul în stânga, textul în dreapta (poziții implicite) */
  priceLeft?: boolean;
  /** poziție liberă text în chenar */
  textPos?: BoxPos;
  /** poziție liberă preț în chenar */
  pricePos?: BoxPos;
  /** poziție inimioară „Lista mea” */
  heartPos?: BoxPos;
}

export interface PageItem {
  id: string;
  type: PageItemType;
  productId?: string;
  /** 0-based pe grilă */
  col: number;
  row: number;
  w: number;
  h: number;
  /** preț promoțional — pe item, nu pe produs */
  promoPrice?: number;
  /** '-20%' calculat sau text liber (ex. '2+1') */
  label?: string;
  sponsored?: boolean;
  text?: string;
  media: MediaSlot[];
  mediaLayout: MediaLayout;
  /** pozele pot ieși puțin din căsuță */
  overflow?: boolean;
  /** detalii afișate pe casuță (temporar în ofertă) */
  display?: PageItemDisplay;
  /** stil bloc mesaj (text pe fundal colorat) */
  design?: PageItemDesign;
  /** Vedetă pe pagina de pornire (vitrină) — pe căsuță, nu pe produs */
  featured?: boolean;
}

/** Fonturi disponibile pentru bloc mesaj */
export type MessageFontId = 'cond' | 'body' | 'cond-italic' | 'serif' | 'display';

/** Stil pentru bloc mesaj pe grilă */
export interface PageItemDesign {
  background: string;
  color: string;
  /** mărime text în cqw */
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  fontWeight?: number;
  /** 0 = colțuri drepte, 50 = cerc / pastilă */
  radius?: number;
  /** 0 = margini clare, 40 = fade puternic pe margini */
  edgeFade?: number;
  fontFamily?: MessageFontId;
  /** poziție liberă text în bloc (mod gesturi) */
  textPos?: BoxPos;
  uppercase?: boolean;
}

/** Fundal foaie — id din PAGE_BG_PRESETS (șabloane / gradienturi) */
export type PageBgPresetId = string;

/** Stil bandă header pe pagină */
export type PageHeaderStyleId = 'red' | 'blue' | 'dark' | 'yellow' | 'green';

export interface PageHeader {
  enabled: boolean;
  /** Titlu categorie / pagină */
  text: string;
  /** Subtitlu opțional (ex. valabilitate) */
  subtitle?: string;
  style: PageHeaderStyleId;
}

/** Aspect pagină (fundal + header) — per foaie */
export interface PageChrome {
  bg: PageBgPresetId;
  header?: PageHeader;
}

export interface CatalogPage {
  id: string;
  items: PageItem[];
  /** grilă pe pagină (ex. 3×4 sau 2×4); lipsește → DEFAULT_GRID */
  grid?: CatalogGrid;
  /** fundal + header (design pagină) */
  chrome?: PageChrome;
}

export interface CatalogGrid {
  cols: number;
  rows: number;
}

/** Opțiuni de grilă la crearea unei pagini în constructor */
export type PageGridPresetId = '3x4' | '2x4';

export interface PageGridPreset {
  id: PageGridPresetId;
  label: string;
  cols: number;
  rows: number;
}

export const PAGE_GRID_PRESETS: PageGridPreset[] = [
  { id: '3x4', label: '3 × 4', cols: 3, rows: 4 },
  { id: '2x4', label: '2 × 4', cols: 2, rows: 4 },
];


export interface Catalog {
  id: string;
  title: string;
  start: string;
  end: string;
  theme: ThemeKey;
  status: CatalogStatus;
  grid: CatalogGrid;
  pages: CatalogPage[];
  /** Tip pe pagina de pornire; lipsă → tratat ca weekend. */
  kind?: MagazineKind;
  /** Copertă opțională (URL / path); altfel se deduce din prima pagină. */
  coverSrc?: string;
}

export type SizePresetId = 'mic' | 'lat' | 'inalt' | 'mare' | 'panoramic' | 'vedeta';

export interface SizePreset {
  id: SizePresetId;
  label: string;
  w: number;
  h: number;
}

export const SIZE_PRESETS: SizePreset[] = [
  { id: 'mic', label: 'Mic 1×2', w: 1, h: 2 },
  { id: 'lat', label: 'Lat 2×2', w: 2, h: 2 },
  { id: 'inalt', label: 'Înalt 1×3', w: 1, h: 3 },
  { id: 'mare', label: 'Mare 2×3', w: 2, h: 3 },
  { id: 'panoramic', label: 'Panoramic 4×2', w: 4, h: 2 },
  { id: 'vedeta', label: 'Vedetă 4×3', w: 4, h: 3 },
];

export const DEFAULT_GRID: CatalogGrid = { cols: 4, rows: 6 };

export interface PublishIssue {
  code: 'no-promo' | 'no-image' | 'empty-page' | 'text-overflow';
  message: string;
  pageId?: string;
  itemId?: string;
  productId?: string;
}
