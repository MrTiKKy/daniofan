/* Card produs tip catalog (afișare); editarea e în popup. */
import * as DF from '@/lib/store';
import type { Product, ResolvedOffer } from '@/lib/types';

interface Props {
  p: Product;
  offer: ResolvedOffer;
  onEdit: () => void;
}

export default function ProductCard({ p, offer, onEdit }: Props) {
  const d = DF.discountPct(p.oldPrice, p.newPrice);
  const st = DF.productStatus(p, offer);
  const { brand, title } = DF.productBrandTitle(p);
  const label = [brand, title].filter(Boolean).join(' ') || 'Fără nume';
  const unit = DF.unitPriceLine(p);

  return (
    <article className={'p-card' + (p.hero ? ' is-hero' : '') + (st === 'expirat' ? ' is-expired' : '')}>
      <div className="p-card__media">
        {d ? <span className="p-card__disc">{`-${d}%`}</span> : null}
        {p.hero ? <span className="p-card__badge">Vedetă</span> : null}
        <div className="p-card__img">
          {p.image
            ? <img src={DF.imageSrc(p.image)} alt="" loading="lazy" decoding="async" />
            : <span className="p-card__noimg">Fără poză</span>}
        </div>
      </div>
      <div className="p-card__body">
        <h3 className="p-card__name" title={label}>{label}</h3>
        {p.size ? <p className="p-card__meta" title={p.size}>{p.size}</p> : null}
        {unit ? <p className="p-card__unit" title={unit}>{unit}</p> : null}
        <div className="p-card__prices">
          {+p.oldPrice > 0 ? <span className="p-card__was">{DF.fmtPriceRo(p.oldPrice)} lei</span> : null}
          <span className="p-card__now">{+p.newPrice > 0 ? `${DF.fmtPriceRo(p.newPrice)} lei` : '—'}</span>
        </div>
        {st !== 'activ' ? (
          <p className={'p-card__st p-card__st--' + st}>
            {st === 'expirat' ? 'Expirat' : st === 'pret' ? 'Preț invalid' : 'Incomplet'}
          </p>
        ) : null}
        <button type="button" className="p-card__edit" onClick={onEdit}>Editează</button>
      </div>
    </article>
  );
}
