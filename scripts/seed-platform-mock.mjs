/* Seed minim pe Supabase: magazin Râmnicu Sărat + WhatsApp (editabile din /admin/setari). */
import pg from 'pg';

/* Valori aliniate cu DEMO_PRIMARY_STORE + DEFAULT_CONTACT_SETTINGS din lib/storeTypes.ts */
const DEMO = {
  id: 'demo-ramnicu-sarat-74',
  name: 'Daniofan Market (exemplu)',
  address: 'Șos. Râmnicu Sărat 74, Brăila',
  phone: '0700000000',
  whatsapp: '40700000000',
  lat: 45.2692,
  lng: 27.9575,
  sortOrder: 0,
  isPrimary: true,
};

const HOURS = {
  mon: { open: true, openTime: '07:00', closeTime: '21:00' },
  tue: { open: true, openTime: '07:00', closeTime: '21:00' },
  wed: { open: true, openTime: '07:00', closeTime: '21:00' },
  thu: { open: true, openTime: '07:00', closeTime: '21:00' },
  fri: { open: true, openTime: '07:00', closeTime: '21:00' },
  sat: { open: true, openTime: '07:00', closeTime: '21:00' },
  sun: { open: true, openTime: '08:00', closeTime: '14:00' },
};

const EXCEPTION = {
  id: 'demo-craciun',
  date: '2026-12-25',
  closed: true,
  label: 'Crăciun',
};

const SETTINGS = {
  whatsappNumber: '40700000000',
  whatsappMessage: 'Bună ziua! Am o întrebare despre oferta Daniofan.',
};

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) {
  console.error('FAIL: SUPABASE_DATABASE_URL lipsește');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

const now = new Date().toISOString();

try {
  await pool.query(
    `insert into stores (
       id, name, address, phone, whatsapp, lat, lng, sort_order, is_primary, created_at, updated_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
     on conflict (id) do update set
       name = excluded.name,
       address = excluded.address,
       phone = excluded.phone,
       whatsapp = excluded.whatsapp,
       lat = excluded.lat,
       lng = excluded.lng,
       sort_order = excluded.sort_order,
       is_primary = excluded.is_primary,
       updated_at = excluded.updated_at`,
    [
      DEMO.id,
      DEMO.name,
      DEMO.address,
      DEMO.phone,
      DEMO.whatsapp,
      DEMO.lat,
      DEMO.lng,
      DEMO.sortOrder,
      DEMO.isPrimary,
      now,
    ],
  );

  await pool.query(`delete from store_hours where store_id = $1`, [DEMO.id]);
  for (const [day, h] of Object.entries(HOURS)) {
    await pool.query(
      `insert into store_hours (id, store_id, day, open, open_time, close_time)
       values ($1,$2,$3,$4,$5,$6)`,
      [`${DEMO.id}-${day}`, DEMO.id, day, h.open, h.openTime, h.closeTime],
    );
  }

  await pool.query(`delete from store_exceptions where store_id = $1`, [DEMO.id]);
  await pool.query(
    `insert into store_exceptions (id, store_id, date, closed, open_time, close_time, label)
     values ($1,$2,$3,$4,null,null,$5)`,
    [EXCEPTION.id, DEMO.id, EXCEPTION.date, EXCEPTION.closed, EXCEPTION.label],
  );

  await pool.query(
    `insert into site_settings (key, value, updated_at)
     values ('public_contact', $1::jsonb, $2)
     on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at`,
    [JSON.stringify(SETTINGS), now],
  );

  const stores = await pool.query(`select id, name, address, is_primary from stores`);
  const settings = await pool.query(`select key, value from site_settings where key = 'public_contact'`);
  console.log('stores:', stores.rows.map((r) => ({ id: r.id, name: r.name, primary: r.is_primary })));
  console.log('settings keys:', Object.keys(settings.rows[0]?.value || {}));
  console.log('OK: mock magazin + WhatsApp pe Supabase');
} catch (e) {
  console.error('FAIL:', e.message || e);
  process.exit(1);
} finally {
  await pool.end();
}
