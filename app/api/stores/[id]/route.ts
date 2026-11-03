import { NextResponse } from 'next/server';
import { adminAuthorized } from '@/lib/adminAuth';
import { deleteStoreDb, isDatabaseConfigured } from '@/lib/db/stores';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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
    const ok = await deleteStoreDb(id);
    if (!ok) return jsonError('Magazin inexistent.', 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`DB: ${message}`, 500);
  }
}
