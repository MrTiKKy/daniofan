import type { Metadata } from 'next';
import AdminStoresPage from '@/components/admin/AdminStoresPage';

export const metadata: Metadata = {
  title: 'Setări — Panou angajați Daniofan',
};

export default function Page() {
  return <AdminStoresPage />;
}
