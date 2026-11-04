'use client';
/* Bandă galbenă tip ticker (ştiri) — mesaj derulant dreapta → stânga. */

/** Mesaj default; ulterior poate veni din Setări. */
export const DEFAULT_TICKER_MESSAGE =
  'Bine ați venit la Daniofan Market · Oferte noi în revistă · Verificați magazinele și programul în Setări';

interface Props {
  message?: string;
}

export default function UrgencyBanner({ message = DEFAULT_TICKER_MESSAGE }: Props) {
  const text = (message || DEFAULT_TICKER_MESSAGE).trim();
  if (!text) return null;

  /* Dublăm textul ca bucla să fie continuă. */
  const loop = `${text}  ·  ${text}  ·  `;

  return (
    <div className="home-urgency home-urgency--ticker" role="status" aria-live="off">
      <p className="sr-only">{text}</p>
      <div className="home-urgency__track" aria-hidden="true">
        <span className="home-urgency__marquee">{loop}</span>
        <span className="home-urgency__marquee">{loop}</span>
      </div>
    </div>
  );
}
