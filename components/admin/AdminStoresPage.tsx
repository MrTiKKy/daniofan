'use client';
import AdminShell from './AdminShell';
import AdminStoresPanel from './AdminStoresPanel';

/** Setări → sub-tab Magazine (CRUD magazine + WhatsApp). */
export default function AdminStoresPage() {
  return (
    <AdminShell active="setari" settingsTab="magazine">
      <AdminStoresPanel />
    </AdminShell>
  );
}
