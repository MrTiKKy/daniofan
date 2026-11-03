'use client';
/* Chrome comun: header + sidebar (Produse / Reviste / Setări). Constructor e pagină separată. */
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';

export type AdminNav = 'produse' | 'reviste' | 'setari';
export type SettingsTab = 'magazine';

interface Props {
  active: AdminNav;
  /** Sub-tab activ în Setări (extensibil). */
  settingsTab?: SettingsTab;
  title?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

const SETTINGS_TABS: { id: SettingsTab; label: string; href: string }[] = [
  { id: 'magazine', label: 'Magazine', href: '/admin/setari' },
  /* Viitor: contact, share OG, etc. */
];

const NAV: { id: AdminNav; label: string; href: string }[] = [
  { id: 'produse', label: 'Produse', href: '/admin' },
  { id: 'reviste', label: 'Reviste', href: '/admin/reviste' },
  { id: 'setari', label: 'Setări', href: '/admin/setari' },
];

export default function AdminShell({
  active,
  settingsTab = 'magazine',
  title = 'Panou angajați',
  headerActions,
  children,
}: Props) {
  return (
    <>
      <header className="a-top">
        <div className="a-in">
          <div className="a-brand">
            <span className="mini-logo"><BrandLogo size="sm" /></span>
            <span className="a-title">{title}</span>
          </div>
          <div className="a-top-actions">
            {headerActions}
            <Link className="btn a-constructor" href="/admin/constructor">
              Constructor revista
            </Link>
            <a className="btn a-open" href="/" target="_blank" rel="noopener">
              Vezi pliantul clientului →
            </a>
          </div>
        </div>
      </header>

      <div className="a-shell">
        <aside className="a-sidebar" aria-label="Meniu panou">
          <nav className="a-sidebar__nav" role="tablist" aria-orientation="vertical">
            {NAV.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                role="tab"
                className={'a-tab a-sidebar__tab' + (active === item.id ? ' is-on' : '')}
                aria-selected={active === item.id}
                {...(active === item.id ? { 'aria-current': 'page' as const } : {})}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="a-shell__body">
          {active === 'setari' ? (
            <nav className="a-subtabs" aria-label="Setări">
              {SETTINGS_TABS.map((t) => (
                <Link
                  key={t.id}
                  href={t.href}
                  className={'a-subtab' + (settingsTab === t.id ? ' is-on' : '')}
                  aria-current={settingsTab === t.id ? 'page' : undefined}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
          ) : null}
          <main className="a-main a-main--shell">{children}</main>
        </div>
      </div>
    </>
  );
}
