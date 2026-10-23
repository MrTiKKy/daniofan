'use client';

interface Props {
  /** mesaj mare, centrat (când nu e nicio ofertă) */
  large?: boolean;
}

export default function NoOfferCard({ large }: Props) {
  return (
    <div className={'home-empty' + (large ? ' home-empty--large' : '')} role="status">
      <p className="home-empty__title">Oferta nouă apare în curând</p>
      <p className="home-empty__sub">Revino vineri!</p>
    </div>
  );
}
