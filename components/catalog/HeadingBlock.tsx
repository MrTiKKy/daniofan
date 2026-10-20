'use client';
import type { PageItem } from '@/lib/catalogTypes';

export default function HeadingBlock({ item }: { item: PageItem }) {
  return <div className="cat-heading">{item.text || 'Titlu categorie'}</div>;
}
