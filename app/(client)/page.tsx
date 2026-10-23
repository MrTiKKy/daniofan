import type { Metadata } from 'next';
import HomePage from '@/components/home/HomePage';

export const metadata: Metadata = {
  title: 'Ofertele săptămânii — Daniofan Market Brăila',
  description: 'Reviste cu oferte Daniofan Market, Brăila. Prețuri promoționale actualizate.',
};

/** Pagina de pornire publică — Faza 1. */
export default function Page() {
  return <HomePage />;
}
