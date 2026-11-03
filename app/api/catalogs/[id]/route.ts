/* GET / PUT / DELETE / PATCH (publish|archive) un catalog (+ pages). */
import { NextResponse } from 'next/server';
import { adminAuthorized } from '@/lib/adminAuth';
import type { Catalog } from '@/lib/catalogTypes';
import {
  archiveCatalogDb,
  deleteCatalogDb,
  getCatalogByIdDb,
  isDatabaseConfigured,
  publishCatalogDb,
  upsertCatalogDb,
} from '@/lib/db/catalogs';

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
    const item = await getCatalogByIdDb(id);
    if (!item) return jsonError('Catalog inexistent.', 404);
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
    const body = (await req.json()) as Catalog;
    const saved = await upsertCatalogDb({ ...body, id });
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
    const ok = await deleteCatalogDb(id);
    if (!ok) return jsonError('Catalog inexistent.', 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`DB: ${message}`, 500);
  }
}

/** PATCH { action: 'publish' | 'archive' } */
export async function PATCH(
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
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action === 'publish') {
      const item = await publishCatalogDb(id);
      return NextResponse.json({ ok: true, item });
    }
    if (body.action === 'archive') {
      const item = await archiveCatalogDb(id);
      return NextResponse.json({ ok: true, item });
    }
    return jsonError('action trebuie: publish | archive');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`DB: ${message}`, 500);
  }
}
