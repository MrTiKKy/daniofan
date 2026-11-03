/* GET listă catalogs / POST upsert — Postgres. */
import { NextResponse } from 'next/server';
import { adminAuthorized } from '@/lib/adminAuth';
import type { Catalog } from '@/lib/catalogTypes';
import {
  isDatabaseConfigured,
  listCatalogsDb,
  upsertCatalogDb,
} from '@/lib/db/catalogs';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return jsonError('SUPABASE_DATABASE_URL lipsește — Postgres neconfigurat.', 503);
    }
    const items = await listCatalogsDb();
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`DB: ${message}`, 500);
  }
}

export async function POST(req: Request) {
  try {
    if (!adminAuthorized(req)) {
      return jsonError('Neautorizat. Lipsește sau e greșit ADMIN_SECRET.', 401);
    }
    if (!isDatabaseConfigured()) {
      return jsonError('SUPABASE_DATABASE_URL lipsește — Postgres neconfigurat.', 503);
    }
    const body = (await req.json()) as Catalog;
    if (!body?.id) return jsonError('id obligatoriu');
    const saved = await upsertCatalogDb(body);
    return NextResponse.json({ ok: true, item: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`DB: ${message}`, 500);
  }
}
