/* GET listă / POST upsert produs — Postgres. */
import { NextResponse } from 'next/server';
import { adminAuthorized } from '@/lib/adminAuth';
import type { CatalogProduct } from '@/lib/catalogTypes';
import {
  isDatabaseConfigured,
  listProductsDb,
  upsertProductDb,
  validateCatalogProduct,
} from '@/lib/db/products';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return jsonError('SUPABASE_DATABASE_URL lipsește — Postgres neconfigurat.', 503);
    }
    const items = await listProductsDb();
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
    const body = (await req.json()) as CatalogProduct;
    const v = validateCatalogProduct(body);
    if (v) return jsonError(v, 400);
    const saved = await upsertProductDb(body);
    return NextResponse.json({ ok: true, item: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`DB: ${message}`, 500);
  }
}
