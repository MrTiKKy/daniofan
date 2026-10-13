/* Cardul unui produs din pliant (port din cardHTML() — js/flyer.js). */
import * as DF from '@/lib/store';
import type { Product } from '@/lib/types';
import { StarIcon, WhatsappIcon } from '@/components/icons';

interface Props {
  p: Product;
  isHero: boolean;
  shareHref: string;
  onShare: (id: string) => void;
}

export default function ProductCard({ p, isHero, shareHref, onShare }: Props) {
  const d = DF.discountPct(p.oldPrice, p.newPrice);
  const saveAmt = +p.oldPrice > +p.newPrice ? (+p.oldPrice - +p.newPrice) : 0;
  const vu = DF.parseDate(p.validUntil);
  return (
    <article className={'card' + (isHero ? ' hero' : '')} id={'p-' + p.id} data-id={p.id}>
      {isHero ? <div className="hero-tag"><StarIcon />Super ofertă<StarIcon /></div> : null}
      <div className="card-main">
        <div className="p-img">
          {p.image
            ? <img src={DF.assetUrl(p.image)} alt={p.name + ' ' + p.size} loading={isHero ? 'eager' : 'lazy'} />
            : <span className="noimg">Fără poză</span>}
          {d ? <div className="disc" aria-label={`reducere ${d} la sută`}>{`-${d}%`}</div> : null}
        </div>
        <div className="body">
          <div className="info">
            <h3 className="p-name">{p.name}</h3>
            <div className="p-size">{p.size}</div>
            {+p.oldPrice > 0
              ? <div className="old"><span className="lbl">PREȚ NORMAL</span><span className="val"><span className="sr-only">preț normal </span>{DF.fmtPrice(p.oldPrice)}</span><span className="unit">LEI/BUC</span></div>
              : null}
          </div>
          <div className="promo"><span className="lbl">PREȚ PROMOȚIONAL</span><span className="val">{DF.fmtPrice(p.newPrice)}</span><span className="unit">LEI/BUC</span></div>
          <div className="extra">
            {saveAmt ? <p className="save">Economisiți <b>{`${DF.fmtPrice(saveAmt)} lei`}</b> la fiecare bucată</p> : null}
            <div className="meta">
              {p.sgr ? <span className="sgr">Prețul nu include SGR</span> : null}
              {vu ? <span className="until">{`Valabil până ${DF.fmtDayLong(vu)}`}</span> : null}
            </div>
            <div className="ribbon">În limita stocului disponibil</div>
            <a className="btn btn-wa js-share" href={shareHref} target="_blank" rel="noopener" data-id={p.id} onClick={() => onShare(p.id)}><WhatsappIcon />Trimite pe WhatsApp</a>
          </div>
        </div>
      </div>
    </article>
  );
}
