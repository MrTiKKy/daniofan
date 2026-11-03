/* Client Supabase Storage — doar pe server (secret key). */
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const PRODUCTS_BUCKET = 'products';

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY lipsesc — verifică .env.local');
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function productObjectPath(hash: string): string {
  return `${hash}.webp`;
}

export function productPublicUrl(hash: string): string {
  const { data } = getSupabaseAdmin().storage.from(PRODUCTS_BUCKET).getPublicUrl(productObjectPath(hash));
  return data.publicUrl;
}

/** Extrage cheia din URL public (…/object/public/products/<hash>.webp). */
export function parseProductImageKey(url: string): string | null {
  const s = (url || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const m = /\/storage\/v1\/object\/public\/products\/([a-f0-9]{64}\.webp)$/i.exec(u.pathname);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
