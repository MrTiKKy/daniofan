'use client';
import type { PageItem } from '@/lib/catalogTypes';

export default function TextBlock({ item }: { item: PageItem }) {
  return <div className="cat-text">{item.text || ''}</div>;
}
