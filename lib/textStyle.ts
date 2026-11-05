/* Stil text pe foaie (culoare brand/nume) — Design pagină ± override pe produs. */
import type { PageChrome, PageItemDisplay, PageTextStyle } from './catalogTypes';

export type TextColorId = 'white' | 'black';

export type ResolvedTextStyle = {
  color: TextColorId;
};

export const DEFAULT_PAGE_TEXT_STYLE: ResolvedTextStyle = {
  color: 'black',
};

export const TEXT_COLORS: {
  id: TextColorId;
  label: string;
  hex: string;
}[] = [
  { id: 'black', label: 'Negru', hex: '#111111' },
  { id: 'white', label: 'Alb', hex: '#FFFFFF' },
];

function normalizeColor(v: unknown): TextColorId {
  if (v === 'white' || v === 'black') return v;
  if (typeof v === 'string') {
    const h = v.trim().toLowerCase();
    if (h === '#fff' || h === '#ffffff' || h === 'white') return 'white';
    if (h === '#000' || h === '#000000' || h === '#111' || h === '#111111' || h === 'black') {
      return 'black';
    }
  }
  return DEFAULT_PAGE_TEXT_STYLE.color;
}

export function resolvePageTextStyle(chrome?: PageChrome | null): ResolvedTextStyle {
  const raw = chrome?.text;
  /* Compat: shadowColor vechi → color */
  const fromLegacy = raw && 'shadowColor' in raw
    ? (raw as { shadowColor?: unknown }).shadowColor
    : undefined;
  return {
    color: normalizeColor(raw?.color ?? fromLegacy),
  };
}

/**
 * Stil efectiv pe casuță.
 * Fără `display.textStyle` → stilul paginii.
 * Cu override (bifa „produs modificat individual”) → stil izolat.
 */
export function resolveItemTextStyle(
  pageStyle: ResolvedTextStyle,
  display?: PageItemDisplay | null,
): ResolvedTextStyle {
  const o = display?.textStyle;
  if (!o || !Object.keys(o).length) return pageStyle;
  const fromLegacy = 'shadowColor' in o
    ? (o as { shadowColor?: unknown }).shadowColor
    : undefined;
  return {
    color: o.color !== undefined || fromLegacy !== undefined
      ? normalizeColor(o.color ?? fromLegacy)
      : DEFAULT_PAGE_TEXT_STYLE.color,
  };
}

export function textStyleCssVars(style: ResolvedTextStyle): Record<string, string> {
  const hex = style.color === 'white' ? '#ffffff' : '#111111';
  return { '--text-ink': hex };
}
