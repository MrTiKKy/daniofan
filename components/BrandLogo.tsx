/* Logo magazin — /public/logo.png, în locul textului „Daniofan / Market”. */

export const BRAND_LOGO_SRC = '/logo.png';
export const BRAND_LOGO_ALT = 'Daniofan Market';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'fluid';

interface Props {
  size?: Size;
  className?: string;
  /** Pentru copertă / foaie (scalează cu cqw) */
  fluid?: boolean;
}

export default function BrandLogo({ size = 'sm', className, fluid }: Props) {
  const sizeClass = fluid || size === 'fluid'
    ? 'brand-logo brand-logo--fluid'
    : `brand-logo brand-logo--${size}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className ? `${sizeClass} ${className}` : sizeClass}
      src={BRAND_LOGO_SRC}
      alt={BRAND_LOGO_ALT}
      width={1300}
      height={408}
      decoding="async"
    />
  );
}
