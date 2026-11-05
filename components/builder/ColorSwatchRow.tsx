'use client';
/* Rând swatch-uri circulare + culoare custom — același aspect ca la stil preț. */
import { PROMO_COLOR_SWATCHES } from '@/lib/priceStyle';

interface Props {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  swatches?: readonly string[];
  disabled?: boolean;
}

export default function ColorSwatchRow({
  value,
  onChange,
  label = 'Culoare',
  swatches = PROMO_COLOR_SWATCHES,
  disabled = false,
}: Props) {
  const customValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#E30613';
  return (
    <div className={'bi-price-colors-wrap' + (disabled ? ' is-disabled' : '')}>
      {label ? <p className="bi-label">{label}</p> : null}
      <div className="bi-price-colors" role="group" aria-label={label || 'Culoare'} aria-disabled={disabled || undefined}>
        {swatches.map((c) => {
          const on = value.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              className={'bi-price-color' + (on ? ' is-on' : '')}
              style={{ background: c }}
              title={c}
              onClick={() => onChange(c)}
            />
          );
        })}
        <label className="bi-price-color-custom" title="Culoare personalizată">
          <span className="sr-only">Culoare personalizată</span>
          <input
            type="color"
            value={customValue}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
