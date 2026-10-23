'use client';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import AdminStoresPanel from './AdminStoresPanel';

/** Pagină /admin/magazine — CRUD magazine + WhatsApp. */
export default function AdminStoresPage() {
  return (
    <>
      <header className="a-top">
        <div className="a-in">
          <div className="a-brand">
            <span className="mini-logo"><BrandLogo size="sm" /></span>
            <span className="a-title">Magazine</span>
          </div>
          <div className="a-top-actions">
            <a className="btn a-open" href="/" target="_blank" rel="noopener">Vezi site-ul →</a>
          </div>
        </div>
      </header>
      <div className="a-tabs" role="tablist" aria-label="Secțiuni panou">
        <Link href="/admin" className="a-tab" role="tab">
          Constructor / Produse
        </Link>
        <Link href="/admin/magazine" className="a-tab is-on" role="tab" aria-current="page">
          Magazine
        </Link>
      </div>
      <main className="a-main">
        <AdminStoresPanel />
      </main>
    </>
  );
}
