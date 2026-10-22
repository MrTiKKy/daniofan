/* Bloc mesaj pe grilă — text pe fundal colorat, colțuri rotunjite. */
import { findFirstFit } from './collision';
import type {
  CatalogPage,
  MessageFontId,
  PageItem,
  PageItemDesign,
} from './catalogTypes';
import { DEFAULT_TEXT_POS } from './catalogTypes';

export const DEFAULT_MESSAGE_DESIGN: PageItemDesign = {
  background: '#FFD200',
  color: '#111111',
  fontSize: 2.6,
  align: 'center',
  fontWeight: 800,
  radius: 18,
  edgeFade: 0,
  fontFamily: 'cond',
  textPos: { x: 10, y: 28, scale: 1 },
  uppercase: true,
};

export const MESSAGE_COLOR_PRESETS: { label: string; background: string; color: string }[] = [
  { label: 'Galben', background: '#FFD200', color: '#111111' },
  { label: 'Roșu', background: '#E30613', color: '#ffffff' },
  { label: 'Albastru', background: '#1559E0', color: '#ffffff' },
  { label: 'Verde', background: '#0F6B30', color: '#ffffff' },
  { label: 'Lime', background: '#C6E800', color: '#1B5E20' },
  { label: 'Negru', background: '#111111', color: '#ffffff' },
  { label: 'Alb', background: '#ffffff', color: '#111111' },
  { label: 'Crem', background: '#FFF4DC', color: '#111111' },
];

export const MESSAGE_FONT_PRESETS: {
  id: MessageFontId;
  label: string;
  css: string;
  weight?: number;
  italic?: boolean;
}[] = [
  { id: 'cond', label: 'Condensed', css: 'var(--cond)', weight: 800 },
  { id: 'body', label: 'Barlow', css: 'var(--body)', weight: 700 },
  { id: 'cond-italic', label: 'Italic', css: 'var(--cond)', weight: 900, italic: true },
  { id: 'serif', label: 'Serif', css: 'Georgia,"Times New Roman",serif', weight: 700 },
  { id: 'display', label: 'Display', css: 'Impact,"Arial Black",sans-serif', weight: 700 },
];

export function messageFontCss(id: MessageFontId | undefined): string {
  return MESSAGE_FONT_PRESETS.find((f) => f.id === id)?.css || 'var(--cond)';
}

export function messageFontMeta(id: MessageFontId | undefined) {
  return MESSAGE_FONT_PRESETS.find((f) => f.id === id) || MESSAGE_FONT_PRESETS[0];
}

export function isMessageItem(item: PageItem): boolean {
  return item.type === 'text' || item.type === 'banner' || item.type === 'heading';
}

export function resolveMessageDesign(item: PageItem): PageItemDesign {
  const merged = { ...DEFAULT_MESSAGE_DESIGN, ...(item.design || {}) };
  return {
    ...merged,
    textPos: item.design?.textPos
      ? { scale: 1, ...item.design.textPos }
      : { ...DEFAULT_TEXT_POS, x: 10, y: 28, scale: 1 },
    radius: Math.min(50, Math.max(0, merged.radius ?? 18)),
    edgeFade: Math.min(40, Math.max(0, merged.edgeFade ?? 0)),
  };
}

function uid(): string {
  return `msg-${crypto.randomUUID().slice(0, 8)}`;
}

/** Preferă bandă pe toată lățimea, apoi 2×1, apoi 1×1. */
export function createMessageItem(page: CatalogPage): PageItem | null {
  const grid = page.grid;
  if (!grid) return null;

  const trySizes: [number, number][] = [
    [grid.cols, 1],
    [Math.min(2, grid.cols), 1],
    [1, 1],
  ];

  for (const [w, h] of trySizes) {
    const spot = findFirstFit(w, h, grid, page.items);
    if (!spot) continue;
    return {
      id: uid(),
      type: 'text',
      col: spot.col,
      row: spot.row,
      w,
      h,
      text: 'Mesaj pe pagină',
      media: [],
      mediaLayout: 'single',
      design: { ...DEFAULT_MESSAGE_DESIGN, textPos: { x: 10, y: 28, scale: 1 } },
    };
  }
  return null;
}

export function messageLabel(item: PageItem): string {
  const raw = (item.text || '').trim();
  if (!raw) return 'Bloc mesaj';
  return raw.length > 32 ? `${raw.slice(0, 32)}…` : raw;
}

export function canAddMessage(page: CatalogPage | null | undefined): boolean {
  if (!page?.grid) return false;
  return createMessageItem(page) !== null;
}

/**
 * Mask SVG: formă rotunjită cu blur pe alpha —
 * marginile și colțurile dispar în transparent (nu e gradient de culoare).
 */
export function buildMessageEdgeMask(edgeFade: number, radiusPct: number): string | undefined {
  if (edgeFade <= 0) return undefined;
  const blur = 0.5 + (edgeFade / 40) * 8;
  const pad = Math.min(30, blur * 2.4);
  const inner = 100 - pad * 2;
  const maxR = inner / 2;
  const r = Math.min(maxR, (Math.min(50, Math.max(0, radiusPct)) / 50) * maxR);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">`
    + `<defs><filter id="f" x="-50%" y="-50%" width="200%" height="200%">`
    + `<feGaussianBlur stdDeviation="${blur.toFixed(2)}"/></filter></defs>`
    + `<rect x="${pad.toFixed(2)}" y="${pad.toFixed(2)}" width="${inner.toFixed(2)}" height="${inner.toFixed(2)}"`
    + ` rx="${r.toFixed(2)}" ry="${r.toFixed(2)}" fill="#fff" filter="url(#f)"/>`
    + `</svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}
