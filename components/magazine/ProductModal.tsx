/* Fereastră produs — tap pe căsuță. */
'use client';
import { useEffect } from 'react';
import * as DF from '@/lib/store';
import type { OfferData, Product, ResolvedOffer } from '@/lib/types';
import { PhoneIcon, PinIcon, WhatsappIcon } from '@/components/icons';

interface Props {
  product: Product;
  data: OfferData;
  offer: ResolvedOffer;
  pageUrl: string;
  onClose: () => void;
}

export default function ProductModal({ product: p, data, offer, pageUrl, onClose }: Props) {
  const d = DF.discountPct(p.oldPrice, p.newPrice);
  const waText = `${p.name} ${p.size} doar ${DF.fmtPrice(p.newPrice)} lei` +
    (+p.oldPrice > 0 ? ` (în loc de ${DF.fmtPrice(p.oldPrice)} lei)` : '') +
    ` la Daniofan Market! Valabil până ${DF.fmtDayLong(offer.end)}. Vezi aici: ${pageUrl}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="mag-modal" role="dialog" aria-modal="true" aria-label={p.name} onClick={onClose}>
      <div className="mag-modal__card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mag-modal__x" aria-label="Închide" onClick={onClose}>×</button>
        <div className="mag-modal__img">
          {p.image
            ? <img src={DF.assetUrl(p.image)} alt="" width={640} height={640} />
            : <span className="mag-cell__noimg">Fără poză</span>}
          {d ? <span className="mag-cell__disc">{`-${d}%`}</span> : null}
        </div>
        <h2 className="mag-modal__name">{p.name}</h2>
        <p className="mag-modal__size">{p.size}</p>
        {+p.oldPrice > 0 ? (
          <div className="mag-cell__old mag-modal__old">
            <span className="mag-cell__lbl">PREȚ NORMAL</span>
            <span className="mag-cell__oldval">{DF.fmtPrice(p.oldPrice)}</span>
            <span className="mag-cell__unit">LEI/BUC</span>
          </div>
        ) : null}
        <div className="mag-cell__promo mag-modal__promo">
          <span className="mag-cell__lbl">PREȚ PROMOȚIONAL</span>
          <span className="mag-cell__val">{DF.fmtPrice(p.newPrice)}</span>
          <span className="mag-cell__unit">LEI/BUC</span>
        </div>
        <div className="mag-modal__meta">
          {p.sgr ? <span className="mag-back__sgr">Prețul nu include SGR</span> : null}
          <span className="mag-back__stock">În limita stocului disponibil</span>
        </div>
        <p className="mag-modal__period">Ofertă: {DF.fmtRange(offer.start, offer.end)}</p>
        <div className="mag-modal__actions">
          <a className="mag-back__btn mag-back__btn--call" href={'tel:' + data.store.phone} onClick={() => DF.track('calls')}>
            <PhoneIcon />Sună la magazin
          </a>
          <a className="mag-back__btn mag-back__btn--map" href={data.store.mapsUrl} target="_blank" rel="noopener" onClick={() => DF.track('directions')}>
            <PinIcon />Cum ajung
          </a>
          <a
            className="mag-back__btn mag-modal__wa"
            href={'https://wa.me/?text=' + encodeURIComponent(waText)}
            target="_blank"
            rel="noopener"
            onClick={() => DF.track('share', p.id)}
          >
            <WhatsappIcon />Trimite pe WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
