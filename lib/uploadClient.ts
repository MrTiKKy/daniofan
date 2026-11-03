/* Client-side: urcă o poză deja prelucrată (data-URI / Blob) la /api/images/upload. */
import { adminAuthHeaders } from '@/lib/adminAuth';

export type UploadedImage = { url: string; hash: string; deduped: boolean };

function dataUrlToBlob(dataUrl: string): Blob {
  const m = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) throw new Error('Format data-URI invalid.');
  const mime = m[1];
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Acceptă data-URI WebP/JPEG/PNG sau Blob/File. */
export async function uploadProductImage(source: string | Blob): Promise<UploadedImage> {
  const blob = typeof source === 'string' ? dataUrlToBlob(source) : source;
  const type = blob.type || 'image/webp';
  const ext = type.includes('png') ? 'png' : type.includes('jpeg') || type.includes('jpg') ? 'jpg' : 'webp';
  const form = new FormData();
  form.append('file', blob, `product.${ext}`);

  const res = await fetch('/api/images/upload', {
    method: 'POST',
    headers: { ...adminAuthHeaders() },
    body: form,
  });
  const body = await res.json().catch(() => ({})) as {
    error?: string;
    url?: string;
    hash?: string;
    deduped?: boolean;
  };
  if (!res.ok) throw new Error(body.error || `Upload eșuat (${res.status}).`);
  if (!body.url || !body.hash) throw new Error('Răspuns upload incomplet.');
  return { url: body.url, hash: body.hash, deduped: !!body.deduped };
}
