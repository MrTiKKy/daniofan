/* Slide final după ultima pagină — nu e din constructor. */
'use client';
import Link from 'next/link';
import type { HomeMagazineSlot } from '@/lib/catalogStore';
import { usePublicChrome } from '@/components/public/PublicChrome';

interface Props {
  title: string;
  period: string;
  /** Zile rămase până la finalul ofertei (inclusiv azi); null = nu afișa banda */
  daysLeft: number | null;
  otherMagazine: HomeMagazineSlot | null;
  shareUrl: string;
  onBackToFirst: () => void;
}

function CheckBadge() {
  return (
    <svg className="end-page__check" viewBox="0 0 88 88" width="88" height="88" aria-hidden="true">
      <circle
        className="end-page__check-ring"
        cx="44"
        cy="44"
        r="38"
        fill="none"
        stroke="#1B9E4B"
        strokeWidth="5"
      />
      <path
        className="end-page__check-mark"
        d="M26 45.5 L38.5 58 L63 32"
        fill="none"
        stroke="#1B9E4B"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function EndPage({
  title, period, daysLeft, otherMagazine, shareUrl, onBackToFirst,
}: Props) {
  const { openLocations } = usePublicChrome();
  const waHref = `https://wa.me/?text=${encodeURIComponent(
    `Uite ce oferte are Daniofan săptămâna asta: ${shareUrl}`,
  )}`;

  return (
    <div className="end-page">
      <div className="end-page__sheet">
        <CheckBadge />
        <h2 className="end-page__title">Ai văzut toate ofertele!</h2>
        <p className="end-page__sub">
          {title}
          {period ? ` · valabilă ${period}` : ''}
        </p>
        {daysLeft != null && daysLeft >= 0 && daysLeft <= 2 ? (
          <p className="end-page__urgent" role="status">
            {daysLeft === 0 ? 'Ultima zi!' : `Mai sunt ${daysLeft} ${daysLeft === 1 ? 'zi' : 'zile'}!`}
          </p>
        ) : null}

        <div className="end-page__actions">
          {otherMagazine ? (
            <Link
              href={`/revista/${otherMagazine.kind}`}
              className="end-page__btn end-page__btn--primary"
              aria-label={`Vezi cealaltă revistă: ${otherMagazine.label}`}
            >
              {otherMagazine.coverSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="end-page__other-cover"
                  src={otherMagazine.coverSrc.startsWith('http') || otherMagazine.coverSrc.startsWith('/')
                    ? otherMagazine.coverSrc
                    : `/${otherMagazine.coverSrc}`}
                  alt=""
                  width={40}
                  height={56}
                />
              ) : (
                <span className="end-page__other-ph" aria-hidden />
              )}
              <span>Vezi cealaltă revistă →</span>
            </Link>
          ) : null}

          <button
            type="button"
            className="end-page__btn end-page__btn--outline"
            aria-label="Vezi magazinele"
            onClick={openLocations}
          >
            📍 Vezi magazinele
          </button>

          <a
            className="end-page__btn end-page__btn--wa"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Trimite oferta pe WhatsApp"
          >
            💬 Trimite oferta pe WhatsApp
          </a>

          <button
            type="button"
            className="end-page__btn end-page__btn--ghost"
            aria-label="Înapoi la prima pagină"
            onClick={onBackToFirst}
          >
            ↺ Înapoi la prima pagină
          </button>
        </div>

        <p className="end-page__foot">Revista nouă apare în fiecare vineri</p>
      </div>
    </div>
  );
}
