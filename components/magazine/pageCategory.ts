/* Extrage eticheta de categorie din datele unei pagini de revistă. */
import { resolvePageChrome } from '@/lib/pageChrome';
import { pageProducts, type MagPage } from './PageLayouts';

/** Prima bandă de categorie (header pagină) sau, la nevoie, categoria primului produs. */
export function pageCategoryLabel(page: MagPage | null | undefined): string | null {
  if (!page) return null;
  if (page.kind === 'catalog') {
    const chrome = resolvePageChrome(page.page);
    const band = chrome.header?.enabled ? chrome.header.text.trim() : '';
    if (band) return band;
  }
  const fromProduct = pageProducts(page).find((p) => p.category?.trim())?.category?.trim();
  return fromProduct || null;
}
