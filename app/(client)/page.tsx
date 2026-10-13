import { Suspense } from 'react';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import Flyer from '@/components/flyer/Flyer';
import { loadOgMeta } from '@/lib/og-meta';

/**
 * cacheComponents: true blochează `export const dynamic` / `revalidate`.
 * Marker-ul din Suspense + `connection()` în generateMetadata → metadata OG la request
 * (echivalent revalidate = 0).
 */

const FALLBACK_TITLE = 'Ofertele săptămânii — Daniofan Market Brăila';
const FALLBACK_DESC = 'Ofertele de weekend Daniofan Market, Brăila. Prețuri promoționale actualizate.';

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const base = siteUrl();
  const meta = await loadOgMeta();

  const title = meta?.title
    ? `${meta.title}${meta.period ? ` (${meta.period})` : ''} — Daniofan Market`
    : FALLBACK_TITLE;
  const description = meta
    ? [meta.title, meta.period].filter(Boolean).join(' · ') || FALLBACK_DESC
    : FALLBACK_DESC;

  const width = meta?.width || 1080;
  const height = meta?.height || 1080;
  const imageUrl = meta?.imageUrl
    ? `${meta.imageUrl}${meta.imageUrl.includes('?') ? '&' : '?'}v=${meta.version}`
    : `${base}/og-default.png`;

  return {
    metadataBase: new URL(base),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'ro_RO',
      url: base,
      siteName: 'Daniofan Market',
      images: [{ url: imageUrl, width, height, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

/** Semnalează rutei că e request-time (necesar cu cacheComponents + generateMetadata dinamic). */
async function RequestTimeMarker() {
  await connection();
  return null;
}

/** Pliantul clientului (fostul index.html). */
export default function Page() {
  return (
    <>
      <Suspense fallback={null}>
        <RequestTimeMarker />
      </Suspense>
      <Flyer />
    </>
  );
}
