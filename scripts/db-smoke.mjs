/* Smoke test Supabase — node --env-file=.env.local scripts/db-smoke.mjs */
import pg from 'pg';

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) {
  console.error('FAIL: SUPABASE_DATABASE_URL lipsește');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
const smokeId = `smoke-${Date.now()}`;
const pageId = `page-${Date.now()}`;

try {
  const ping = await pool.query('select 1::int as ok, current_database() as db, now() as now');
  console.log('PING', ping.rows[0]);

  for (const t of ['products', 'catalogs', 'catalog_pages', 'stores', 'site_settings']) {
    const r = await pool.query(
      `select 1 from information_schema.tables where table_schema='public' and table_name=$1`,
      [t],
    );
    if (!r.rows.length) {
      console.error(`FAIL: tabelul ${t} lipsește`);
      process.exit(1);
    }
  }

  await pool.query(
    `insert into products (id, brand, name, details, unit, unit_qty, normal_price, images, kind)
     values ($1, 'Smoke', 'Test Product', '', 'l', 1, 9.99, '[]'::jsonb, 'test')`,
    [smokeId],
  );
  await pool.query(`delete from products where id = $1`, [smokeId]);
  console.log('products: OK');

  await pool.query(
    `insert into catalogs (id, title, kind, status, theme, start_date, end_date, permanent, grid)
     values ($1, 'Smoke Catalog', 'weekend', 'draft', 'standard', '2026-01-01', '2026-01-07', false, '{"cols":3,"rows":4}'::jsonb)`,
    [smokeId],
  );
  await pool.query(
    `insert into catalog_pages (id, catalog_id, sort_order, grid, chrome, items)
     values ($1, $2, 0, '{"cols":3,"rows":4}'::jsonb, null, '[]'::jsonb)`,
    [pageId, smokeId],
  );
  const pages = await pool.query(
    `select id, sort_order from catalog_pages where catalog_id = $1`,
    [smokeId],
  );
  console.log('catalog_pages insert→select:', pages.rows[0]);
  await pool.query(`delete from catalogs where id = $1`, [smokeId]);
  const gone = await pool.query(`select 1 from catalog_pages where catalog_id = $1`, [smokeId]);
  if (gone.rows.length) {
    console.error('FAIL: cascade delete pages n-a mers');
    process.exit(1);
  }
  console.log('catalogs + pages cascade: OK');
  console.log('OK: Supabase smoke (products + catalogs/pages)');
} catch (e) {
  console.error('FAIL:', e.message || e);
  process.exit(1);
} finally {
  await pool.end();
}
