/* Healthcheck Postgres (Supabase) — SELECT 1. */
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    if (!process.env.SUPABASE_DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_DATABASE_URL lipsește' },
        { status: 503 },
      );
    }
    const pool = getPool();
    const ping = await pool.query<{ ok: number; now: string }>(
      'select 1::int as ok, now()::text as now',
    );

    return NextResponse.json({
      ok: true,
      provider: 'supabase',
      ping: ping.rows[0],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
