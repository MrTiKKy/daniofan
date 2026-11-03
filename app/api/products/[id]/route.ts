/* GET / PUT / DELETE un produs. */
import { NextResponse } from 'next/server';
import { adminAuthorized } from '@/lib/adminAuth';
import type { CatalogProduct } from '@/lib/catalogTypes';
import {
  deleteProductDb,
  getProductById,
  isDatabaseConfigured,
  upsertProductDb,
  validateCatalogProduct,
} from '@/lib/db/products';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (!isDatabaseConfigured()) {
      return jsonError('SUPABASE_DATABASE_URL lipsește — Postgres neconfigurat.', 503);
    }
    const { id } = await ctx.params;
    const item = await getProductById(id);
    if (!item) return jsonError('Produs inexistent.', 404);
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`DB: ${message}`, 500);
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (!adminAuthorized(req)) {
      return jsonError('Neautorizat. Lipsește sau e greșit ADMIN_SECRET.', 401);
    }
    if (!isDatabaseConfigured()) {
      return jsonError('SUPABASE_DATABASE_URL lipsește — Postgres neconfigurat.', 503);
    }
    const { id } = await ctx.params;
    const body = (await req.json()) as CatalogProduct;
    const product = { ...body, id };
    const v = validateCatalogProduct(product);
    if (v) return jsonError(v, 400);
    const saved = await upsertProductDb(product);
    return NextResponse.json({ ok: true, item: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`DB: ${message}`, 500);
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (!adminAuthorized(req)) {
      return jsonError('Neautorizat. Lipsește sau e greșit ADMIN_SECRET.', 401);
    }
    if (!isDatabaseConfigured()) {
      return jsonError('SUPABASE_DATABASE_URL lipsește — Postgres neconfigurat.', 503);
    }
    const { id } = await ctx.params;
    const ok = await deleteProductDb(id);
    if (!ok) return jsonError('Produs inexistent.', 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`DB: ${message}`, 500);
  }
}
