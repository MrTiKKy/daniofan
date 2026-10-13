/** Tipuri + citire meta Open Graph din Vercel Blob (server-only). */

export type OgMeta = {
  version: number;
  title: string;
  period: string;
  imageUrl: string;
  width: number;
  height: number;
};

export async function loadOgMeta(): Promise<OgMeta | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    const { head } = await import('@vercel/blob');
    const info = await head('og/meta.json', { token });
    const res = await fetch(info.url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as OgMeta;
    if (!data?.imageUrl || !data?.version) return null;
    return data;
  } catch {
    return null;
  }
}
