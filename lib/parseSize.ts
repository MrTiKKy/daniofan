/* Extrage cantitate + unitate din textul de gramaj/ambalaj (ex. „0.5L Doză”). */

export type ParsedSize = {
  unitQty: number;
  unitKind: string;
};

const UNIT_RE = /(\d+[.,]?\d*)\s*(kg|g|ml|l|buc)\b/i;

export function parseSizeText(size: string): ParsedSize | null {
  const m = UNIT_RE.exec(size || '');
  if (!m) return null;
  let qty = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(qty) || !(qty > 0)) return null;
  let kind = m[2].toLowerCase();
  if (kind === 'g') { qty /= 1000; kind = 'kg'; }
  else if (kind === 'ml') { qty /= 1000; kind = 'l'; }
  return { unitQty: qty, unitKind: kind };
}

export function formatUnitPrice(price: number, unitQty?: number, unitKind?: string): string | null {
  if (!(price > 0)) return null;
  let qty = unitQty != null ? +unitQty : 0;
  let kind = (unitKind || '').trim().toLowerCase();
  if (!(qty > 0) || !kind) return null;
  if (kind === 'g') { qty /= 1000; kind = 'kg'; }
  else if (kind === 'ml') { qty /= 1000; kind = 'l'; }
  const per = price / qty;
  if (!(per > 0) || !Number.isFinite(per)) return null;
  const ro = (Math.round(per * 100) / 100).toFixed(2).replace('.', ',');
  return `${ro} lei/${kind}`;
}

export function parsePriceInput(raw: string): number {
  const v = parseFloat(String(raw || '').replace(',', '.').trim());
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}
