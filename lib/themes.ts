/* Teme de sezon pentru pliant + imaginile Facebook. Aceeași structură, alte culori și decoruri. */
export type ThemeKey = 'standard' | 'paste' | 'craciun';

export interface ThemePalette {
  red: string; redDark: string; yellow: string; yellowDeep: string;
  blue: string; blueDark: string; ink: string; sgr: string;
  /** razele din fundal */
  burst: string;
  /** banda de sărbătoare */
  band: string; bandDark: string; bandText: string; bandAccent: string;
}

export interface Theme {
  key: ThemeKey;
  label: string;
  /** textul mare din banda de sus (gol = fără bandă) */
  banner: [string, string] | null;
  pal: ThemePalette;
}

const BASE: ThemePalette = {
  red: '#E30613', redDark: '#A8000C', yellow: '#FFE100', yellowDeep: '#FFC400',
  blue: '#1559E0', blueDark: '#0A2A82', ink: '#121212', sgr: '#1B4FD6',
  burst: '#FFF1A0', band: '#E30613', bandDark: '#A8000C', bandText: '#FFE100', bandAccent: '#fff',
};

export const THEMES: Record<ThemeKey, Theme> = {
  standard: { key: 'standard', label: 'Standard', banner: null, pal: BASE },
  paste: {
    key: 'paste', label: 'Paște', banner: ['PAȘTE FERICIT!', 'OFERTE DE SĂRBĂTOARE'],
    pal: { ...BASE, blue: '#0E8A2E', blueDark: '#055A1B', burst: '#E6F89A', band: '#22B33A', bandDark: '#0E7A24', bandText: '#FFE100', bandAccent: '#fff' },
  },
  craciun: {
    key: 'craciun', label: 'Crăciun', banner: ['CRĂCIUN FERICIT!', 'OFERTE DE SĂRBĂTOARE'],
    pal: { ...BASE, red: '#D0021B', redDark: '#7E0010', yellow: '#FFD84A', yellowDeep: '#E8B21E', blue: '#0B6B36', blueDark: '#063D1F', burst: '#F7E3B0', band: '#0B5B2E', bandDark: '#05341A', bandText: '#FFD84A', bandAccent: '#fff' },
  },
};
export const THEME_KEYS: ThemeKey[] = ['standard', 'paste', 'craciun'];
export function getTheme(k: string | null | undefined): Theme {
  return THEMES[(k as ThemeKey)] || THEMES.standard;
}
