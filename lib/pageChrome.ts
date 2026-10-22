/* Design pagină: fundal + bandă header (per pagină). */
import type {
  CatalogPage,
  PageBgPresetId,
  PageChrome,
  PageHeader,
  PageHeaderStyleId,
} from './catalogTypes';

export type PageBgGroup = 'foaie' | 'categorie' | 'promo' | 'textura';

export interface PageBgPreset {
  id: PageBgPresetId;
  label: string;
  group: PageBgGroup;
  /** valoare CSS `background` */
  css: string;
}

export const PAGE_BG_GROUP_LABELS: Record<PageBgGroup, string> = {
  foaie: 'Foaie pliant',
  categorie: 'Categorii',
  promo: 'Promo / ofertă',
  textura: 'Hârtie & texturi',
};

/**
 * Șabloane pe gust de revistă / pliant alimentar —
 * crem, hârtie tipărită, fresh, lactate, carne, panificație, promo.
 */
export const PAGE_BG_PRESETS: PageBgPreset[] = [
  /* —— foaie tipică de pliant —— */
  { id: 'classic', label: 'Clasic', group: 'foaie', css: 'radial-gradient(ellipse at 50% 40%,#fff 0%,#fff 42%,#FFF8D6 100%)' },
  { id: 'white', label: 'Alb tipar', group: 'foaie', css: '#ffffff' },
  { id: 'cream', label: 'Crem oferte', group: 'foaie', css: '#FFF6E4' },
  { id: 'ivory', label: 'Fildeș', group: 'foaie', css: '#FFFEF6' },
  { id: 'soft-yellow', label: 'Galben deschis', group: 'foaie', css: '#FFF9D8' },
  { id: 'warm-white', label: 'Alb cald', group: 'foaie', css: '#FFFBF2' },
  { id: 'soft-grey', label: 'Gri raft', group: 'foaie', css: '#F2F3F6' },
  { id: 'newspaper', label: 'Ziar oferte', group: 'foaie', css: 'linear-gradient(180deg,#FFFEF8 0%,#F5F0E4 100%)' },

  /* —— pe categorii de magazin —— */
  { id: 'fresh', label: 'Proaspete', group: 'categorie', css: 'linear-gradient(165deg,#F2FBF4 0%,#E4F5E8 55%,#D5EDDA 100%)' },
  { id: 'greens', label: 'Legume & fructe', group: 'categorie', css: 'linear-gradient(160deg,#F0FAE8,#E0F0D0 50%,#D0E8C0)' },
  { id: 'dairy', label: 'Lactate', group: 'categorie', css: 'linear-gradient(165deg,#F4FAFF 0%,#E6F2FC 60%,#D8EAF8 100%)' },
  { id: 'bakery', label: 'Panificație', group: 'categorie', css: 'linear-gradient(160deg,#FFF8EC,#F8E8C8 50%,#F0D8A8)' },
  { id: 'meat', label: 'Mezeluri', group: 'categorie', css: 'linear-gradient(165deg,#FFF5F4 0%,#FCE8E6 55%,#F5D8D4 100%)' },
  { id: 'fish', label: 'Pește', group: 'categorie', css: 'linear-gradient(160deg,#F0F8FC,#DCEEF8 50%,#C8E4F4)' },
  { id: 'drinks', label: 'Băuturi', group: 'categorie', css: 'linear-gradient(165deg,#F2F7FF,#E4ECFA 55%,#D4E0F5)' },
  { id: 'frozen', label: 'Congelate', group: 'categorie', css: 'linear-gradient(160deg,#F2FBFE,#E0F4FA 50%,#C8EAF4)' },
  { id: 'household', label: 'Casă & curățenie', group: 'categorie', css: 'linear-gradient(165deg,#F6F8FC,#EAEFF6 55%,#DEE5F0)' },
  { id: 'pets', label: 'Animale', group: 'categorie', css: 'linear-gradient(160deg,#FFF9F0,#F5EADB 50%,#EBDBC8)' },
  { id: 'kids', label: 'Copii', group: 'categorie', css: 'linear-gradient(165deg,#FFF8F4,#FFECE4 50%,#FFE0D4)' },
  { id: 'wine', label: 'Vin & fine', group: 'categorie', css: 'linear-gradient(170deg,#FBF6F2,#F0E6DC 55%,#E4D6C8)' },

  /* —— promo / reduceri (totuși tip pliant, nu neon) —— */
  { id: 'promo-yellow', label: 'Promo galben', group: 'promo', css: 'linear-gradient(160deg,#FFFCE8 0%,#FFF3A8 45%,#FFE86A 100%)' },
  { id: 'promo-red', label: 'Promo roșu', group: 'promo', css: 'linear-gradient(160deg,#FFF5F4 0%,#FFE0DC 50%,#FFCEC8 100%)' },
  { id: 'promo-brand', label: 'Brand market', group: 'promo', css: 'linear-gradient(155deg,#FFF8E8 0%,#FFE8A0 40%,#FFD0C8 100%)' },
  { id: 'weekend', label: 'Weekend', group: 'promo', css: 'linear-gradient(150deg,#FFF9E0,#FFE8B0 50%,#FFD8A0)' },
  { id: 'flash', label: 'Prețul zilei', group: 'promo', css: 'linear-gradient(145deg,#FFFBE8,#FFF0A0 40%,#FFE070)' },
  { id: 'season-spring', label: 'Sezon fresh', group: 'promo', css: 'linear-gradient(160deg,#F8FFF4,#E8F8E0 50%,#D8F0C8)' },
  { id: 'season-summer', label: 'Vară', group: 'promo', css: 'linear-gradient(155deg,#FFFCE8,#FFE8B8 45%,#FFD8A0)' },
  { id: 'season-autumn', label: 'Toamnă', group: 'promo', css: 'linear-gradient(160deg,#FFF6E8,#F0D8B0 50%,#E0C098)' },
  { id: 'season-winter', label: 'Iarnă / sărbători', group: 'promo', css: 'linear-gradient(165deg,#F8FAFF,#E8EEF8 50%,#D8E0F0)' },
  { id: 'bio', label: 'Eco / bio', group: 'promo', css: 'linear-gradient(160deg,#F6FAF0,#E4F0D8 55%,#D0E4C0)' },

  /* —— hârtie tipărită / texturi subtile de catalog —— */
  { id: 'paper', label: 'Hârtie catalog', group: 'textura', css: 'repeating-linear-gradient(0deg,transparent,transparent 12px,rgba(90,60,20,.035) 12px,rgba(90,60,20,.035) 13px), #FAF6EE' },
  { id: 'lines', label: 'Linii tipar', group: 'textura', css: 'repeating-linear-gradient(90deg,transparent,transparent 18px,rgba(0,0,0,.03) 18px,rgba(0,0,0,.03) 19px), #FBFBF8' },
  { id: 'dots', label: 'Puncte fine', group: 'textura', css: 'radial-gradient(circle,rgba(0,0,0,.06) 1px,transparent 1.2px) 0 0 / 12px 12px, #F8F7F4' },
  { id: 'grid', label: 'Grilă raft', group: 'textura', css: 'linear-gradient(rgba(0,0,0,.035) 1px,transparent 1px) 0 0 / 18px 18px, linear-gradient(90deg,rgba(0,0,0,.035) 1px,transparent 1px) 0 0 / 18px 18px, #FAFBFC' },
  { id: 'kraft', label: 'Kraft deschis', group: 'textura', css: 'linear-gradient(180deg,#F5EBD8,#EDE0C8)' },
  { id: 'mesh-market', label: 'Lumină magazin', group: 'textura', css: 'radial-gradient(at 50% 0%,#FFFCE8 0,transparent 55%),radial-gradient(at 100% 80%,#FFE8D8 0,transparent 40%),radial-gradient(at 0% 80%,#E8F4FF 0,transparent 40%),#FFF9F0' },
  { id: 'mesh-fresh', label: 'Lumină fresh', group: 'textura', css: 'radial-gradient(at 30% 10%,#E8FFE8 0,transparent 45%),radial-gradient(at 80% 70%,#FFF8D0 0,transparent 40%),#F6FBF4' },
  { id: 'mesh-dairy', label: 'Lumină lactate', group: 'textura', css: 'radial-gradient(at 40% 0%,#F0F8FF 0,transparent 50%),radial-gradient(at 90% 90%,#FFE8F0 0,transparent 35%),#F8FBFF' },
];

const BG_BY_ID = new Map(PAGE_BG_PRESETS.map((p) => [p.id, p]));

export function getPageBgPreset(id: PageBgPresetId | undefined | null): PageBgPreset {
  return (id && BG_BY_ID.get(id)) || PAGE_BG_PRESETS[0];
}

export function getPageBgCss(id: PageBgPresetId | undefined | null): string {
  return getPageBgPreset(id).css;
}

export const PAGE_HEADER_STYLES: {
  id: PageHeaderStyleId;
  label: string;
  swatch: string;
}[] = [
  { id: 'green', label: 'Verde fresh', swatch: '#C6E800' },
  { id: 'yellow', label: 'Galben', swatch: 'var(--yellow, #FFD200)' },
  { id: 'red', label: 'Roșu', swatch: 'var(--red, #E30613)' },
  { id: 'blue', label: 'Albastru', swatch: 'var(--blue, #1559E0)' },
  { id: 'dark', label: 'Negru', swatch: '#111111' },
];

export const DEFAULT_PAGE_HEADER: PageHeader = {
  enabled: false,
  text: 'Titlu pagină',
  subtitle: '',
  style: 'green',
};

export const DEFAULT_PAGE_CHROME: PageChrome = {
  bg: 'classic',
  header: { ...DEFAULT_PAGE_HEADER },
};

export function resolvePageChrome(page: CatalogPage | null | undefined): PageChrome {
  const c = page?.chrome;
  const bg = c?.bg && BG_BY_ID.has(c.bg) ? c.bg : DEFAULT_PAGE_CHROME.bg;
  return {
    bg,
    header: {
      ...DEFAULT_PAGE_HEADER,
      ...(c?.header || {}),
    },
  };
}

export function pageHeaderClass(style: PageHeaderStyleId): string {
  return `mag-page-header--${style}`;
}
