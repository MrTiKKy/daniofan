/* Șterge din bucket-ul products pozele orfane (nefolosite de niciun produs). */
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const dbUrl = process.env.SUPABASE_DATABASE_URL;

if (!url || !key) {
  console.error('FAIL: SUPABASE_URL / SUPABASE_SECRET_KEY lipsesc');
  process.exit(1);
}
if (!dbUrl) {
  console.error('FAIL: SUPABASE_DATABASE_URL lipsește');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

function keyFromSrc(src) {
  const s = String(src || '');
  const m = /\/storage\/v1\/object\/public\/products\/([a-f0-9]{64}\.webp)/i.exec(s);
  if (m) return m[1].toLowerCase();
  if (/^[a-f0-9]{64}\.webp$/i.test(s)) return s.toLowerCase();
  return null;
}

async function listAllKeys() {
  const keys = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const { data, error } = await supabase.storage.from('products').list('', {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(error.message);
    const batch = data || [];
    for (const o of batch) {
      if (o.name && /^[a-f0-9]{64}\.webp$/i.test(o.name)) keys.push(o.name.toLowerCase());
    }
    if (batch.length < limit) break;
    offset += limit;
  }
  return keys;
}

try {
  const used = new Set();
  const rows = await pool.query(`select images from products`);
  for (const row of rows.rows) {
    const images = Array.isArray(row.images) ? row.images : [];
    for (const im of images) {
      const k = keyFromSrc(im?.src);
      if (k) used.add(k);
    }
  }

  const all = await listAllKeys();
  const orphans = all.filter((k) => !used.has(k));
  console.log(`bucket=${all.length} used=${used.size} orphans=${orphans.length}`);

  if (!orphans.length) {
    console.log('OK: nimic de șters');
    process.exit(0);
  }

  const chunk = 50;
  let deleted = 0;
  for (let i = 0; i < orphans.length; i += chunk) {
    const slice = orphans.slice(i, i + chunk);
    const { error } = await supabase.storage.from('products').remove(slice);
    if (error) throw new Error(error.message);
    deleted += slice.length;
  }
  console.log(`OK: șterse ${deleted} poze orfane`);
} catch (e) {
  console.error('FAIL:', e.message || e);
  process.exit(1);
} finally {
  await pool.end();
}
