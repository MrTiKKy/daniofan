'use client';
/* Controale stil text — culoare alb/negru. Aceleași pe Design pagină și override produs. */
import type { PageTextStyle } from '@/lib/catalogTypes';
import {
  TEXT_COLORS,
  type ResolvedTextStyle,
  type TextColorId,
} from '@/lib/textStyle';

interface Props {
  value: ResolvedTextStyle;
  onChange: (patch: PageTextStyle) => void;
}

export default function TextStyleControls({ value, onChange }: Props) {
  return (
    <div className="bi-text-style" aria-label="Setări stil text">
      <p className="bi-label">Culoare text</p>
      <div className="bi-price-colors" role="group" aria-label="Culoare text">
        {TEXT_COLORS.map((c) => {
          const on = value.color === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              title={c.label}
              className={
                'bi-price-color'
                + (c.id === 'white' ? ' is-light' : '')
                + (on ? ' is-on' : '')
              }
              style={{ background: c.hex }}
              onClick={() => onChange({ color: c.id as TextColorId })}
            />
          );
        })}
      </div>
    </div>
  );
}
