'use client';
import Link from 'next/link';
import { whatsappUrl } from '@/lib/storeHours';

export type BottomNavId = 'reviste' | 'program' | 'locatii' | 'whatsapp';

interface Props {
  active: BottomNavId;
  whatsappNumber: string;
  whatsappMessage: string;
  onProgram: () => void;
  onLocations: () => void;
}

function IconReviste() {
  /* Revistă deschisă — două pagini */
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"
      />
    </svg>
  );
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  );
}
function IconWa() {
  /* Logo WhatsApp standard (bubble + receptor) — viewBox oficial 24×24 */
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"
      />
    </svg>
  );
}

export default function BottomNav({
  active, whatsappNumber, whatsappMessage, onProgram, onLocations,
}: Props) {
  const wa = whatsappUrl(whatsappNumber || '40700000000', whatsappMessage);

  return (
    <nav className="bnav" aria-label="Navigare principală">
      <Link
        href="/"
        className={'bnav__btn' + (active === 'reviste' ? ' is-on' : '')}
        aria-current={active === 'reviste' ? 'page' : undefined}
      >
        <IconReviste />
        <span>Reviste</span>
      </Link>
      <button
        type="button"
        className={'bnav__btn' + (active === 'program' ? ' is-on' : '')}
        aria-pressed={active === 'program'}
        onClick={onProgram}
      >
        <IconClock />
        <span>Program</span>
      </button>
      <button
        type="button"
        className={'bnav__btn' + (active === 'locatii' ? ' is-on' : '')}
        aria-pressed={active === 'locatii'}
        onClick={onLocations}
      >
        <IconPin />
        <span>Locații</span>
      </button>
      <a
        className="bnav__btn bnav__btn--wa"
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
      >
        <IconWa />
        <span>WhatsApp</span>
      </a>
    </nav>
  );
}
