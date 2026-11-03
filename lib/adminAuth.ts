/* Auth minimal admin — același pattern ca /api/og-image.
 * TODO: când ADMIN_SECRET e setat, mutațiile cer Bearer / x-admin-secret.
 * Fără secret: permis doar în development (admin fără auth încă). */
export function adminAuthorized(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const header = req.headers.get('x-admin-secret') || '';
  return bearer === secret || header === secret;
}

/** Header pentru fetch din browser (Constructor / Admin). */
export function adminAuthHeaders(): HeadersInit {
  const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET || '';
  if (!secret) return {};
  return { Authorization: `Bearer ${secret}` };
}
