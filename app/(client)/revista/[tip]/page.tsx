import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isMagazineKind, magazineKindLabel, MAGAZINE_KINDS, type MagazineKind } from '@/lib/catalogTypes';
import RevistaViewer from '@/components/home/RevistaViewer';

interface Props {
  params: Promise<{ tip: string }>;
}

export function generateStaticParams() {
  return MAGAZINE_KINDS.map((tip) => ({ tip }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tip } = await params;
  const label = isMagazineKind(tip) ? magazineKindLabel(tip) : 'Revista';
  return {
    title: `${label} — Daniofan Market`,
    description: 'Citește revista de oferte Daniofan Market.',
  };
}

async function RevistaBody({ params }: Props) {
  const { tip } = await params;
  if (!isMagazineKind(tip)) notFound();
  return <RevistaViewer tip={tip as MagazineKind} />;
}

export default function RevistaPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="home__loading" style={{ paddingTop: 40 }}>Se deschide revista…</div>}>
      <RevistaBody params={params} />
    </Suspense>
  );
}
