/* POST — urcă poză produs în Supabase Storage (bucket products), dedup pe SHA-256. */
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminAuthorized } from '@/lib/adminAuth';
import {
  PRODUCTS_BUCKET,
  getSupabaseAdmin,
  productObjectPath,
  productPublicUrl,
} from '@/lib/storage';

const MAX_BYTES = 1024 * 1024; /* 1 MB */
const ALLOWED = new Set(['image/webp', 'image/jpeg', 'image/png', 'image/jpg']);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeMime(type: string, name: string): string {
  const t = (type || '').toLowerCase().trim();
  if (t === 'image/jpg') return 'image/jpeg';
  if (ALLOWED.has(t)) return t;
  const lower = (name || '').toLowerCase();
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return t;
}

export async function POST(req: Request) {
  try {
    if (!adminAuthorized(req)) {
      return jsonError('Neautorizat. Lipsește sau e greșit ADMIN_SECRET.', 401);
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
      return jsonError('Storage neconfigurat (SUPABASE_URL / SUPABASE_SECRET_KEY).', 503);
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      return jsonError('Lipsește câmpul file.');
    }
    const name = file instanceof File ? file.name : 'upload.webp';
    const mime = normalizeMime(file.type, name);
    if (!ALLOWED.has(mime)) {
      return jsonError('Tip invalid — doar webp, jpeg sau png.');
    }
    if (file.size <= 0) return jsonError('Fișier gol.');
    if (file.size > MAX_BYTES) return jsonError('Poza depășește 1 MB.');

    const buf = Buffer.from(await file.arrayBuffer());
    const hash = createHash('sha256').update(buf).digest('hex');
    const path = productObjectPath(hash); /* <hash>.webp în bucket products */
    const supabase = getSupabaseAdmin();
    const publicUrl = productPublicUrl(hash);

    /* Dedup: dacă obiectul există, nu re-urcăm. */
    const probe = await supabase.storage.from(PRODUCTS_BUCKET).download(path);
    if (probe.data && !probe.error) {
      return NextResponse.json({ ok: true, url: publicUrl, hash, deduped: true });
    }

    const { error: upErr } = await supabase.storage.from(PRODUCTS_BUCKET).upload(path, buf, {
      contentType: mime,
      upsert: false,
      cacheControl: '31536000',
    });

    if (upErr) {
      const msg = upErr.message || String(upErr);
      if (/already exists|Duplicate|The resource already exists|409/i.test(msg)) {
        return NextResponse.json({ ok: true, url: publicUrl, hash, deduped: true });
      }
      return jsonError(`Upload: ${msg}`, 500);
    }

    return NextResponse.json({ ok: true, url: publicUrl, hash, deduped: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(message, 500);
  }
}
