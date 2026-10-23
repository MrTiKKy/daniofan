import type { Metadata, Viewport } from 'next';
import '@/styles/fonts.css';
import '@/styles/brand-logo.css';
import '@/styles/flyer.css';
import '@/styles/themes.css';
import '@/styles/admin.css';
import '@/styles/catalog.css';
import '@/styles/builder.css';
import '@/styles/magazine.css';
import '@/styles/shopping-list.css';

export const metadata: Metadata = {
  title: 'Panou angajați (demo) — Daniofan Market',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/* Layout rădăcină separat: <body class="admin">, ca în admin.html. Între pliant și panou se face o încărcare completă de pagină, ca în original. */
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro">
      <body className="admin">{children}</body>
    </html>
  );
}
