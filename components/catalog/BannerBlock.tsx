'use client';
import type { PageItem } from '@/lib/catalogTypes';

export default function BannerBlock({ item }: { item: PageItem }) {
  return <div className="cat-banner">{item.text || 'Banner'}</div>;
}
