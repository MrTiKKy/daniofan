/* Import products.csv → Postgres, cu kind=test pe toate. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    const row = {};
    headers.forEach((h, j) => { row[h] = (cols[j] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

function normalizeUnit(u) {
  const s = (u || '').trim().toLowerCase();
  if (s === 'l' || s === 'liter' || s === 'litri') return 'l';
  if (s === 'g' || s === 'gr' || s === 'gram') return 'g';
  if (s === 'kg') return 'kg';
  if (s === 'buc' || s === 'buc.') return 'buc';
  return s;
}

async function main() {
  const url = process.env.SUPABASE_DATABASE_URL;
  if (!url) throw new Error('SUPABASE_DATABASE_URL lipsește');

  const csvPath = resolve(process.cwd(), 'products.csv');
  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  if (!rows.length) throw new Error('CSV gol');

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const now = new Date().toISOString();
  let ok = 0;
  for (const r of rows) {
    const id = (r.id || '').trim();
    if (!id) continue;
    const brand = (r.brand || '').trim();
    const name = (r.name || '').trim();
    const details = (r.details || '').trim();
    const unit = normalizeUnit(r.unit);
    const unitQty = Number(String(r.unit_qty || '').replace(',', '.'));
    const price = Number(String(r.normal_price || '').replace(',', '.'));
    const filename = (r.image_filename || '').trim();
    const images = filename
      ? JSON.stringify([{ src: `img/products/${filename}`, w: 0, h: 0 }])
      : '[]';

    await client.query(
      `INSERT INTO products (
         id, brand, name, details, unit, unit_qty, normal_price, images, kind, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'test',$9,$9)
       ON CONFLICT (id) DO UPDATE SET
         brand = EXCLUDED.brand,
         name = EXCLUDED.name,
         details = EXCLUDED.details,
         unit = EXCLUDED.unit,
         unit_qty = EXCLUDED.unit_qty,
         normal_price = EXCLUDED.normal_price,
         images = EXCLUDED.images,
         kind = 'test',
         updated_at = EXCLUDED.updated_at`,
      [
        id,
        brand,
        name,
        details,
        unit,
        Number.isFinite(unitQty) && unitQty > 0 ? unitQty : null,
        Number.isFinite(price) ? price.toFixed(2) : '0.00',
        images,
        now,
      ],
    );
    ok += 1;
  }

  const count = await client.query(
    `SELECT count(*)::int AS n, count(*) FILTER (WHERE kind = 'test')::int AS tests FROM products`,
  );
  await client.end();
  console.log(`Imported ${ok} products as kind=test.`);
  console.log(`DB now: ${count.rows[0].n} total, ${count.rows[0].tests} test.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
