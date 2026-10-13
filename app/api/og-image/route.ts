import { put } from '@vercel/blob';
import type { OgMeta } from '@/lib/og-meta';

/**
 * cacheComponents: true — `export const runtime` poate fi respins.
 * Ruta rulează pe Node (Blob SDK).
 */
// export const runtime = 'nodejs';

const PNG_PATH = 'og/current.png';
const META_PATH = 'og/meta.json';
const MAX_BYTES = 8 * 1024 * 1024;

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function adminAuthorized(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const header = req.headers.get('x-admin-secret') || '';
  return bearer === secret || header === secret;
}

export async function POST(req: Request) {
  try {
    if (!adminAuthorized(req)) {
      return jsonError('Neautorizat. Lipsește sau e greșit ADMIN_SECRET.', 401);
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return jsonError('BLOB_READ_WRITE_TOKEN lipsește din env.', 503);
    }

    const form = await req.formData();
    const file = form.get('file') ?? form.get('image');
    if (!file || typeof file === 'string') {
      return jsonError('Lipsește fișierul PNG (câmp file)');
    }
    const ab = await (file as File).arrayBuffer();
    const buf = Buffer.from(ab);
    if (!buf.length) return jsonError('Imagine goală');
    if (buf.byteLength > MAX_BYTES) {
      return jsonError(`Imaginea depășește ${MAX_BYTES / (1024 * 1024)} MB`, 413);
    }

    const title = String(form.get('title') || 'Ofertele săptămânii — Daniofan Market').trim();
    const period = String(form.get('period') || '').trim();
    const width = Number(form.get('width')) || 1080;
    const height = Number(form.get('height')) || 1080;
    const version = Date.now();

    const image = await put(PNG_PATH, buf, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'image/png',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const meta: OgMeta = {
      version,
      title,
      period,
      imageUrl: image.url,
      width,
      height,
    };

    await put(META_PATH, JSON.stringify(meta, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return Response.json({ ok: true, ...meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[og-image]', message);
    return jsonError(message, 500);
  }
}
