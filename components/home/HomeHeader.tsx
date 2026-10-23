'use client';
import BrandLogo from '@/components/BrandLogo';
import { PhoneIcon } from '@/components/icons';

interface Props {
  phone: string;
  phoneLabel?: string;
}

export default function HomeHeader({ phone, phoneLabel }: Props) {
  const href = phone ? `tel:${phone}` : undefined;
  return (
    <header className="home-header">
      <div className="home-header__in">
        <a className="home-header__logo" href="/" aria-label="Daniofan Market">
          <BrandLogo size="sm" />
        </a>
        {href ? (
          <a
            className="home-header__call"
            href={href}
            aria-label={phoneLabel ? `Sună ${phoneLabel}` : 'Sună la magazin'}
          >
            <PhoneIcon />
          </a>
        ) : null}
      </div>
    </header>
  );
}
