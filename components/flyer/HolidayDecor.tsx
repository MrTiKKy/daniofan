/* Banda de sărbătoare + decoruri SVG (ouă încondeiate / fulgi de zăpadă). Desenate în cod, fără imagini externe. */
import { getTheme, type ThemeKey } from '@/lib/themes';

const EGGS: [string, string][] = [['#E30613', '#FFE100'], ['#1559E0', '#fff'], ['#22B33A', '#FFE100'], ['#FF7A00', '#fff'], ['#B620C9', '#FFE100']];

export function Egg({ c = EGGS[0], className, style }: { c?: [string, string]; className?: string; style?: React.CSSProperties }) {
  const id = 'e' + c[0].slice(1) + c[1].slice(1);
  return (
    <svg className={className} style={style} viewBox="0 0 74 100" aria-hidden="true">
      <defs><clipPath id={id}><path d="M37 2C78 2 78 62 70 74 58 96 16 96 4 74-4 62-4 2 37 2Z" /></clipPath></defs>
      <path d="M37 2C78 2 78 62 70 74 58 96 16 96 4 74-4 62-4 2 37 2Z" fill={c[0]} stroke="#fff" strokeWidth="3" />
      <g clipPath={`url(#${id})`} fill={c[1]} stroke={c[1]}>
        <polyline points="0,50 10,42 21,56 32,42 42,56 53,42 63,56 74,44" fill="none" strokeWidth="4.5" strokeLinejoin="round" />
        <rect x="0" y="27" width="74" height="5" stroke="none" /><rect x="0" y="68" width="74" height="5" stroke="none" />
        <circle cx="19" cy="17" r="4" stroke="none" /><circle cx="37" cy="15" r="4" stroke="none" /><circle cx="55" cy="17" r="4" stroke="none" />
        <circle cx="24" cy="82" r="3.5" stroke="none" /><circle cx="37" cy="84" r="3.5" stroke="none" /><circle cx="50" cy="82" r="3.5" stroke="none" />
      </g>
      <ellipse cx="22" cy="24" rx="5" ry="10" fill="rgba(255,255,255,.45)" transform="rotate(20 22 24)" />
    </svg>
  );
}

export function Flake({ className, style, color = '#fff' }: { className?: string; style?: React.CSSProperties; color?: string }) {
  const arm = 'M0 0V-40M0-22L11-32M0-22L-11-32M0-12L7-18M0-12L-7-18';
  return (
    <svg className={className} style={style} viewBox="-44 -44 88 88" aria-hidden="true">
      <g stroke={color} strokeWidth="5" strokeLinecap="round" fill="none">
        {[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d={arm} transform={`rotate(${a})`} />)}
      </g>
    </svg>
  );
}

/** Banda mare de sus („PAȘTE FERICIT! OFERTE DE SĂRBĂTOARE") */
export function HolidayBand({ theme }: { theme?: ThemeKey }) {
  const t = getTheme(theme);
  if (!t.banner) return null;
  const easter = t.key === 'paste';
  return (
    <div className={'holiday-band hb-' + t.key} role="img" aria-label={t.banner.join(' ')}>
      <span className="hb-side l">{easter ? <><Egg c={EGGS[0]} className="hb-i a" /><Egg c={EGGS[1]} className="hb-i b" /></> : <><Flake className="hb-i a" /><Flake className="hb-i b" color="#FFD84A" /></>}</span>
      <span className="hb-txt"><b>{t.banner[0]}</b><small>{t.banner[1]}</small></span>
      <span className="hb-side r">{easter ? <><Egg c={EGGS[3]} className="hb-i b" /><Egg c={EGGS[4]} className="hb-i a" /></> : <><Flake className="hb-i b" color="#FFD84A" /><Flake className="hb-i a" /></>}</span>
    </div>
  );
}

/** Decorurile din fundalul antetului */
/** Zăpadă care cade (Crăciun). Ascunsă cu prefers-reduced-motion. */
export function Snowfall({ theme }: { theme?: ThemeKey }) {
  if (theme !== 'craciun') return null;
  return <div className="snowfall" aria-hidden="true"><i /><i /><i /></div>;
}

export function HolidayBg({ theme }: { theme?: ThemeKey }) {
  const t = getTheme(theme);
  if (!t.banner) return null;
  return (
    <div className={'holiday-deco hd-' + t.key} aria-hidden="true">
      {t.key === 'paste'
        ? <><Egg c={EGGS[2]} className="d1" /><Egg c={EGGS[0]} className="d2" /><Egg c={EGGS[3]} className="d3" /><Egg c={EGGS[1]} className="d4" /></>
        : <><Flake className="d1" color="#9EC9E8" /><Flake className="d2" color="#9EC9E8" /><Flake className="d3" color="#C8E2F4" /><Flake className="d4" color="#9EC9E8" /><Flake className="d5" color="#C8E2F4" /></>}
    </div>
  );
}
