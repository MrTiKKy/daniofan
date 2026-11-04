'use client';
/* Controale stil preț — setări manuale (culoare / cifră / look). */
import type { PagePriceStyle } from '@/lib/catalogTypes';
import {
  PRICE_DIGIT_STYLES,
  PRICE_LOOKS,
  type ResolvedPriceStyle,
} from '@/lib/priceStyle';
import ColorSwatchRow from './ColorSwatchRow';

interface Props {
  value: ResolvedPriceStyle;
  onChange: (patch: PagePriceStyle) => void;
}

export default function PriceStyleControls({ value, onChange }: Props) {
  return (
    <div className="bi-price" aria-label="Setări stil preț">
      <ColorSwatchRow
        label="Culoare preț promo"
        value={value.promoColor}
        onChange={(promoColor) => onChange({ promoColor })}
      />

      <p className="bi-label">Stil cifră</p>
      <div className="bi-price-digits" role="group" aria-label="Stil cifră">
        {PRICE_DIGIT_STYLES.map((d) => {
          const on = value.digitStyle === d.id;
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={on}
              className={
                'bi-price-digit'
                + ` bi-price-digit--${d.id}`
                + (on ? ' is-on' : '')
              }
              onClick={() => onChange({ digitStyle: d.id })}
            >
              12,99
              <span>{d.label}</span>
            </button>
          );
        })}
      </div>

      {PRICE_LOOKS.length > 1 ? (
        <>
          <p className="bi-label">Stil preț</p>
          <div className="bi-price-looks" role="group" aria-label="Stil preț">
            {PRICE_LOOKS.map((l) => {
              const on = value.look === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={on}
                  className={'bi-price-look' + (on ? ' is-on' : '')}
                  onClick={() => onChange({ look: l.id })}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
