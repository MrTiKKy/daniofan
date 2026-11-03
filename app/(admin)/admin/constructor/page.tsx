import type { Metadata } from 'next';
import AdminConstructorPage from '@/components/admin/AdminConstructorPage';

export const metadata: Metadata = {
  title: 'Constructor revista — Panou angajați Daniofan',
};

export default function Page() {
  return <AdminConstructorPage />;
}
