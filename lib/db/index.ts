/* Client Drizzle + pool pg — Supabase Postgres (SUPABASE_DATABASE_URL).
   Doar pe server (Route Handlers / scripts). */
import { attachDatabasePool } from '@vercel/functions';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  __daniofanPool?: Pool;
};

/** Decodare repetată — parolele pot veni %-encoded din .env (evită expand la `$`). */
function fullyDecode(s: string): string {
  let prev = s;
  for (let i = 0; i < 5; i++) {
    try {
      const next = decodeURIComponent(prev);
      if (next === prev) break;
      prev = next;
    } catch {
      break;
    }
  }
  return prev;
}

function createPool(): Pool {
  const connectionString = process.env.SUPABASE_DATABASE_URL;
  if (!connectionString) {
    throw new Error('SUPABASE_DATABASE_URL lipsește — verifică .env.local');
  }
  const u = new URL(connectionString);
  const pool = new Pool({
    host: u.hostname,
    port: Number(u.port || 6543),
    database: (u.pathname || '/postgres').replace(/^\//, '') || 'postgres',
    user: decodeURIComponent(u.username),
    password: fullyDecode(u.password),
    ssl: { rejectUnauthorized: false },
    max: 10,
  });
  /* Vercel Fluid: închide idle connections înainte de suspend */
  attachDatabasePool(pool);
  return pool;
}

export function getPool(): Pool {
  if (!globalForDb.__daniofanPool) {
    globalForDb.__daniofanPool = createPool();
  }
  return globalForDb.__daniofanPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export type Db = ReturnType<typeof getDb>;
