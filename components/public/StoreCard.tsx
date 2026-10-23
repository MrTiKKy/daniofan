'use client';
import { PhoneIcon, PinIcon } from '@/components/icons';
import { isOpenNow, mapsDirectionsUrl } from '@/lib/storeHours';
import type { StoreLocation } from '@/lib/storeTypes';

interface Props {
  store: StoreLocation;
  now?: Date;
}

export default function StoreCard({ store, now }: Props) {
  const status = isOpenNow(store, now || new Date());
  const maps = mapsDirectionsUrl(store.lat, store.lng);
  const tel = store.phone.replace(/\s/g, '');

  return (
    <article className="store-card">
      <h3 className="store-card__name">{store.name}</h3>
      <p className="store-card__addr">{store.address}</p>
      <p className={'store-card__status' + (status.open ? ' is-open' : ' is-closed')}>
        <span aria-hidden>●</span>
        {status.open
          ? `Deschis acum ${status.untilLabel}`
          : `Închis · ${status.untilLabel}`}
      </p>
      <div className="store-card__acts">
        <a className="store-card__btn store-card__btn--call" href={`tel:${tel}`}>
          <PhoneIcon /> Sună
        </a>
        <a
          className="store-card__btn store-card__btn--map"
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
        >
          <PinIcon /> Cum ajung
        </a>
      </div>
    </article>
  );
}
