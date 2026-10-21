/* Draft constructor revistă — localStorage (până la Neon). */
import type { CatalogPage } from './catalogTypes';

export const MAGAZINE_BUILDER_KEY = 'daniofan.magazine.builder.v1';

export interface MagazineBuilderDraft {
  pages: CatalogPage[];
  activeIndex: number;
  updatedAt: string;
}

function read(): MagazineBuilderDraft | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MAGAZINE_BUILDER_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as MagazineBuilderDraft;
    if (!data || !Array.isArray(data.pages)) return null;
    return data;
  } catch {
    return null;
  }
}

export function loadMagazineBuilderDraft(): MagazineBuilderDraft | null {
  const data = read();
  if (!data || data.pages.length === 0) return null;
  const activeIndex = Math.max(0, Math.min(data.activeIndex || 0, data.pages.length - 1));
  return { ...data, activeIndex };
}

export function saveMagazineBuilderDraft(pages: CatalogPage[], activeIndex: number): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const draft: MagazineBuilderDraft = {
      pages,
      activeIndex,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(MAGAZINE_BUILDER_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode — ignoră */
  }
}

export function clearMagazineBuilderDraft(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(MAGAZINE_BUILDER_KEY);
}
