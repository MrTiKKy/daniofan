/* DELETE — șterge din bucket o poză nefolosită de niciun produs. */
import { NextResponse } from 'next/server';
import { adminAuthorized } from '@/lib/adminAuth';
import { listProductsDb } from '@/lib/db/products';
import {
  PRODUCTS_BUCKET,
  getSupabaseAdmin,
  parseProductImageKey,
} from '@/lib/storage';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(req: Request) {
  try {
    if (!adminAuthorized(req)) {
      return jsonError('Neautorizat. Lipsește sau e greșit ADMIN_SECRET.', 401);
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
      return jsonError('Storage neconfigurat.', 503);
    }

    const body = (await req.json().catch(() => ({}))) as { url?: string; path?: string };
    const key = body.path
      || (body.url ? parseProductImageKey(body.url) : null);
    if (!key || !/^[a-f0-9]{64}\.webp$/i.test(key)) {
      return jsonError('url sau path invalid (aștept products/<hash>.webp).');
    }

    const products = await listProductsDb();
    const used = products.some((p) =>
      (p.images || []).some((im) => {
        const k = parseProductImageKey(im.src);
        return k === key || im.src.endsWith(`/products/${key}`) || im.src.endsWith(key);
      }),
    );
    if (used) {
      return jsonError('Poza e folosită de cel puțin un produs — nu o șterg.', 409);
    }

    const { error } = await getSupabaseAdmin().storage.from(PRODUCTS_BUCKET).remove([key]);
    if (error) return jsonError(`Ștergere: ${error.message}`, 500);

    return NextResponse.json({ ok: true, deleted: key });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(message, 500);
  }
}
