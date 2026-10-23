import type { Metadata, Viewport } from 'next';
import PublicListChrome from '@/components/list/PublicListChrome';
import '@/styles/fonts.css';
import '@/styles/brand-logo.css';
import '@/styles/flyer.css';
import '@/styles/magazine.css';
import '@/styles/themes.css';
import '@/styles/home.css';
import '@/styles/public-nav.css';
import '@/styles/shopping-list.css';

export const metadata: Metadata = {
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#E30613',
};

export default function ClientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro">
      <body>
        <PublicListChrome>{children}</PublicListChrome>
      </body>
    </html>
  );
}
