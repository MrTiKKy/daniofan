import type { Metadata, Viewport } from 'next';
import '@/styles/fonts.css';
import '@/styles/flyer.css';
import '@/styles/themes.css';

/** Title / OG vin din generateMetadata pe page.tsx (imaginea de share din Blob). */
export const metadata: Metadata = {
  icons: {
    icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2214%22 fill=%22%23E30613%22/%3E%3Ctext x=%2232%22 y=%2246%22 font-size=%2240%22 font-family=%22Arial%22 font-weight=%22900%22 fill=%22%23FFE100%22 text-anchor=%22middle%22%3ED%3C/text%3E%3C/svg%3E',
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
      <body>{children}</body>
    </html>
  );
}
