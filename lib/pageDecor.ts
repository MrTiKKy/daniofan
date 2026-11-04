/* Decorațiuni pe foaie (forme + text pe planul din spate). */
import type {
  DecorFontId,
  PageDecorItem,
  PageDecorShape,
  PageDecorText,
  PageShapeKind,
} from './catalogTypes';

export const PAGE_SHAPE_KINDS: { id: PageShapeKind; label: string }[] = [
  { id: 'rect', label: 'Dreptunghi' },
  { id: 'roundRect', label: 'Rotunjit' },
  { id: 'ellipse', label: 'Oval' },
  { id: 'triangle', label: 'Triunghi' },
  { id: 'diamond', label: 'Romb' },
  { id: 'line', label: 'Linie' },
  { id: 'arrow', label: 'Săgeată' },
  { id: 'star', label: 'Stea' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'pentagon', label: 'Pentagon' },
  { id: 'octagon', label: 'Octogon' },
  { id: 'burst', label: 'Explozie' },
  { id: 'heart', label: 'Inimă' },
  { id: 'cross', label: 'Cruce' },
  { id: 'plus', label: 'Plus' },
  { id: 'chevron', label: 'Chevron' },
  { id: 'parallelogram', label: 'Paralelogram' },
  { id: 'trapezoid', label: 'Trapez' },
  { id: 'semicircle', label: 'Semicerc' },
  { id: 'ring', label: 'Inel' },
  { id: 'badge', label: 'Badge' },
  { id: 'ribbon', label: 'Panglică' },
  { id: 'cloud', label: 'Nor' },
  { id: 'speech', label: 'Balon' },
];

/** Formele rapide pe un rând în Design pagină. */
export const PAGE_SHAPE_QUICK: PageShapeKind[] = [
  'rect', 'roundRect', 'ellipse', 'triangle', 'star', 'arrow',
];

/** Paletă tip Paint — multe culori gata de folosit. */
export const PAGE_SHAPE_COLORS: string[] = [
  '#E30613', '#FF4D6A', '#FF9F43', '#FFE100', '#C6E800',
  '#2FAE5A', '#0F6B30', '#20C997', '#1559E0', '#4C8DFF',
  '#7A1FA2', '#E91E8C', '#111111', '#555555', '#9AA0A6',
  '#FFFFFF', '#FFF6E4', '#FFE0DC', '#E8F4FF', '#E4F5E8',
  '#8B4513', '#00BCD4', '#FF5722', '#3F51B5', '#009688',
];

/** Culori principale text — un rând + custom. */
export const PAGE_TEXT_COLORS: string[] = [
  '#111111', '#E30613', '#1559E0', '#0F6B30', '#FFE100', '#FFFFFF',
];

export const PAGE_TEXT_FONT_PRESETS: {
  id: DecorFontId;
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

export function decorFontCss(id: DecorFontId | undefined): string {
  return PAGE_TEXT_FONT_PRESETS.find((f) => f.id === id)?.css || 'var(--cond)';
}

export function decorFontMeta(id: DecorFontId | undefined) {
  return PAGE_TEXT_FONT_PRESETS.find((f) => f.id === id) || PAGE_TEXT_FONT_PRESETS[0];
}

export function createPageShape(
  shape: PageShapeKind,
  fill = '#E30613',
): PageDecorShape {
  return {
    id: `decor-${crypto.randomUUID().slice(0, 8)}`,
    kind: 'shape',
    shape,
    fill,
    x: 20,
    y: 30,
    w: shape === 'line' || shape === 'arrow' || shape === 'chevron' ? 42 : 28,
    h: shape === 'line' ? 8 : shape === 'arrow' || shape === 'chevron' ? 18 : 22,
    rotate: 0,
    opacity: 1,
  };
}

export function createPageText(fill = '#111111'): PageDecorText {
  return {
    id: `decor-${crypto.randomUUID().slice(0, 8)}`,
    kind: 'text',
    text: 'Text',
    fill,
    fontFamily: 'cond',
    fontWeight: 800,
    italic: false,
    uppercase: true,
    x: 18,
    y: 28,
    w: 50,
    h: 14,
    rotate: 0,
    opacity: 1,
  };
}

export function clampDecorBox(
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  /* Permite ieșirea din foaie (bleed); doar mărime minimă + plafon ca să nu dispară complet. */
  const ww = Math.min(180, Math.max(4, w));
  const hh = Math.min(180, Math.max(3, h));
  const xx = Math.min(140, Math.max(-100, x));
  const yy = Math.min(140, Math.max(-100, y));
  return {
    x: Math.round(xx * 10) / 10,
    y: Math.round(yy * 10) / 10,
    w: Math.round(ww * 10) / 10,
    h: Math.round(hh * 10) / 10,
  };
}

export function isPageShapeKind(v: string): v is PageShapeKind {
  return PAGE_SHAPE_KINDS.some((k) => k.id === v);
}

export function isDecorShape(item: PageDecorItem): item is PageDecorShape {
  return item.kind === 'shape';
}

export function isDecorText(item: PageDecorItem): item is PageDecorText {
  return item.kind === 'text';
}
