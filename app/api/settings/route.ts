/* GET / PUT setări contact (WhatsApp). */
import { NextResponse } from 'next/server';
import { adminAuthorized } from '@/lib/adminAuth';
import type { PublicContactSettings } from '@/lib/storeTypes';
import {
  getSettingsDb,
  isDatabaseConfigured,
  saveSettingsDb,
} from '@/lib/db/stores';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return jsonError('SUPABASE_DATABASE_URL lipsește — Postgres neconfigurat.', 503);
    }
    const item = await getSettingsDb();
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`DB: ${message}`, 500);
  }
}

export async function PUT(req: Request) {
  try {
    if (!adminAuthorized(req)) {
      return jsonError('Neautorizat. Lipsește sau e greșit ADMIN_SECRET.', 401);
    }
    if (!isDatabaseConfigured()) {
      return jsonError('SUPABASE_DATABASE_URL lipsește — Postgres neconfigurat.', 503);
    }
    const body = (await req.json()) as PublicContactSettings;
    const item = await saveSettingsDb(body);
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(`DB: ${message}`, 500);
  }
}
