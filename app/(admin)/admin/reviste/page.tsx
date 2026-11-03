import type { Metadata } from 'next';
import AdminRevistePage from '@/components/admin/AdminRevistePage';

export const metadata: Metadata = {
  title: 'Reviste — Panou angajați Daniofan',
};

export default function Page() {
  return <AdminRevistePage />;
}
