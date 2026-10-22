/* Draft + publicare constructor revistă — localStorage (până la Neon). */
import type { CatalogPage } from './catalogTypes';

export const MAGAZINE_BUILDER_KEY = 'daniofan.magazine.builder.v1';
export const MAGAZINE_PUBLISHED_KEY = 'daniofan.magazine.published.v1';
/** Eveniment same-tab după publicare (storage event e doar cross-tab). */
export const MAGAZINE_PUBLISHED_EVENT = 'daniofan:magazine-published';

export interface MagazineBuilderDraft {
  pages: CatalogPage[];
  activeIndex: number;
  updatedAt: string;
}

export interface PublishedMagazine {
  pages: CatalogPage[];
  publishedAt: string;
}

function readDraft(): MagazineBuilderDraft | null {
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
  const data = readDraft();
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

function clonePages(pages: CatalogPage[]): CatalogPage[] {
  return JSON.parse(JSON.stringify(pages)) as CatalogPage[];
}

/** Publică foile cu grilă — apar pe pliantul clientului ca în preview. */
export function publishMagazine(pages: CatalogPage[]): PublishedMagazine {
  const ready = pages.filter((p) => !!p.grid);
  const published: PublishedMagazine = {
    pages: clonePages(ready),
    publishedAt: new Date().toISOString(),
  };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(MAGAZINE_PUBLISHED_KEY, JSON.stringify(published));
    } catch {
      throw new Error('Nu s-a putut publica (spațiu local insuficient).');
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MAGAZINE_PUBLISHED_EVENT));
  }
  return published;
}

export function loadPublishedMagazine(): PublishedMagazine | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MAGAZINE_PUBLISHED_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PublishedMagazine;
    if (!data || !Array.isArray(data.pages) || data.pages.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearPublishedMagazine(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(MAGAZINE_PUBLISHED_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MAGAZINE_PUBLISHED_EVENT));
  }
}
