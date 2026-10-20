/* Reguli de plasare pe grilă: limite + fără suprapuneri. */
import type { CatalogGrid, PageItem } from './catalogTypes';

export type Rect = { col: number; row: number; w: number; h: number };

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.col + a.w <= b.col ||
    b.col + b.w <= a.col ||
    a.row + a.h <= b.row ||
    b.row + b.h <= a.row
  );
}

export function inBounds(r: Rect, grid: CatalogGrid): boolean {
  return (
    r.col >= 0 &&
    r.row >= 0 &&
    r.w >= 1 &&
    r.h >= 1 &&
    r.col + r.w <= grid.cols &&
    r.row + r.h <= grid.rows
  );
}

export function itemRect(item: Pick<PageItem, 'col' | 'row' | 'w' | 'h'>): Rect {
  return { col: item.col, row: item.row, w: item.w, h: item.h };
}

/** true dacă poziția e validă față de celelalte item-uri (exclude ignoreId). */
export function canPlace(
  rect: Rect,
  grid: CatalogGrid,
  items: PageItem[],
  ignoreId?: string,
): boolean {
  if (!inBounds(rect, grid)) return false;
  for (const it of items) {
    if (ignoreId && it.id === ignoreId) continue;
    if (rectsOverlap(rect, itemRect(it))) return false;
  }
  return true;
}

/** Prima celulă liberă de sus în jos, stânga → dreapta. */
export function findFirstFit(
  w: number,
  h: number,
  grid: CatalogGrid,
  items: PageItem[],
): { col: number; row: number } | null {
  for (let row = 0; row <= grid.rows - h; row++) {
    for (let col = 0; col <= grid.cols - w; col++) {
      if (canPlace({ col, row, w, h }, grid, items)) return { col, row };
    }
  }
  return null;
}

/**
 * La redimensionare: dacă noua mărime se lovește de alt item sau de margine,
 * reduce w/h până la ultima mărime validă (păstrează col/row).
 */
export function clampResize(
  item: PageItem,
  nextW: number,
  nextH: number,
  grid: CatalogGrid,
  items: PageItem[],
): { w: number; h: number } {
  let w = Math.max(1, Math.min(nextW, grid.cols - item.col));
  let h = Math.max(1, Math.min(nextH, grid.rows - item.row));
  while (w >= 1 && h >= 1) {
    if (canPlace({ col: item.col, row: item.row, w, h }, grid, items, item.id)) {
      return { w, h };
    }
    // reduce pe axa care a crescut mai mult
    if (w > item.w && w >= h) w -= 1;
    else if (h > item.h) h -= 1;
    else if (w > 1) w -= 1;
    else if (h > 1) h -= 1;
    else break;
  }
  return { w: item.w, h: item.h };
}
