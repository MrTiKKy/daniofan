'use client';
import { urgencyBannerText } from '@/lib/catalogStore';

interface Props {
  start: Date;
  end: Date;
  now?: Date;
}

export default function UrgencyBanner({ start, end, now }: Props) {
  const { range, suffix, lastDay } = urgencyBannerText(start, end, now || new Date());
  return (
    <div
      className={'home-urgency' + (lastDay ? ' is-last' : '')}
      role="status"
      aria-live="polite"
    >
      <p className="home-urgency__text">
        <span className="home-urgency__main">Oferte valabile {range}</span>
        <span className="home-urgency__dot" aria-hidden>·</span>
        <span className="home-urgency__sub">{suffix}</span>
      </p>
    </div>
  );
}
