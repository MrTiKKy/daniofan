/* Formular editare produs (în popup). Câmpuri necontrolate — ca înainte. */
import * as DF from '@/lib/store';
import type { Product, ProductStatus, ResolvedOffer } from '@/lib/types';

export type RowAction = 'up' | 'down' | 'del';
export type FieldKey =
  | 'name' | 'size' | 'oldPrice' | 'newPrice' | 'category' | 'validUntil'
  | 'brand' | 'unitQty' | 'unitKind' | 'specialLabel' | 'variants';

interface Props {
  p: Product;
  i: number;
  n: number;
  offer: ResolvedOffer;
  onField: (i: number, k: FieldKey, value: string) => void;
  onCheck: (i: number, k: 'hero' | 'sgr', checked: boolean) => void;
  onImage: (i: number, file: File) => void;
  onAction: (i: number, act: RowAction) => void;
}

const PILLS: Record<ProductStatus, React.ReactNode> = {
  activ: <span className="pill ok">✓ Se vede în pliant</span>,
  expirat: <span className="pill off">Expirat — ascuns automat</span>,
  pret: <span className="pill warn">Prețul promo trebuie să fie mai mic</span>,
  incomplet: <span className="pill warn">Completați numele și prețul</span>,
};

export default function ProductRow({ p, i, n, offer, onField, onCheck, onImage, onAction }: Props) {
  const d = DF.discountPct(p.oldPrice, p.newPrice);
  const st = DF.productStatus(p, offer);
  const field = (k: FieldKey) => (e: React.ChangeEvent<HTMLInputElement>) => onField(i, k, e.target.value);
  return (
    <div className={'prod' + (p.hero ? ' is-hero' : '') + (st === 'expirat' ? ' expired' : '')} data-i={i}>
      <div className="prod-img">
        <div className="thumb">{p.image ? <img src={DF.imageSrc(p.image)} alt="" /> : <span className="help">fără poză</span>}</div>
        <label className="btn-sm">{p.image ? 'Schimbă poza' : 'Adaugă poză'}<input type="file" accept="image/*" data-k="image" hidden
          onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onImage(i, f); }} /></label>
      </div>
      <div className="prod-fields">
        <label className="span2">Nume produs<input type="text" data-k="name" defaultValue={p.name} placeholder="ex. Timișoreana" onChange={field('name')} /></label>
        <label className="span2">Brand (opțional)<input type="text" data-k="brand" defaultValue={p.brand || ''} placeholder="ex. TIMIȘOREANA" onChange={field('brand')} /></label>
        <label className="span2">Gramaj / ambalaj<input type="text" data-k="size" defaultValue={p.size} placeholder="ex. 0.5L Doză" onChange={field('size')} /></label>
        <label>Preț normal (lei)<input type="text" inputMode="decimal" data-k="oldPrice" defaultValue={p.oldPrice ? DF.fmtPrice(p.oldPrice) : ''} placeholder="3.19" onChange={field('oldPrice')} /></label>
        <label>Preț promo (lei)<input type="text" inputMode="decimal" data-k="newPrice" className={st === 'pret' ? 'bad' : ''} defaultValue={p.newPrice ? DF.fmtPrice(p.newPrice) : ''} placeholder="2.99" onChange={field('newPrice')} /></label>
        <label>Cantitate (pt. preț/kg)<input type="text" inputMode="decimal" data-k="unitQty" defaultValue={p.unitQty != null ? String(p.unitQty) : ''} placeholder="ex. 0.5" onChange={field('unitQty')} /></label>
        <label>Unitate<input type="text" data-k="unitKind" list="units" defaultValue={p.unitKind || ''} placeholder="l / kg" onChange={field('unitKind')} /></label>
        <label className="m-full">Variante (opțional)<input type="text" data-k="variants" defaultValue={p.variants || ''} placeholder="ex. diverse sortimente" onChange={field('variants')} /></label>
        <label className="m-full">Etichetă specială (opțional)<input type="text" data-k="specialLabel" defaultValue={p.specialLabel || ''} placeholder="ex. 2+1, Ofertă specială" onChange={field('specialLabel')} /></label>
        <label className="m-full">Categorie<input type="text" data-k="category" list="cats" defaultValue={p.category} placeholder="Bere" onChange={field('category')} /></label>
        <label className="m-full">Valabil până la (opțional)<input type="date" data-k="validUntil" defaultValue={p.validUntil || ''} onChange={field('validUntil')} /></label>
        <label className="chk span2"><input type="checkbox" data-k="hero" defaultChecked={p.hero} onChange={(e) => onCheck(i, 'hero', e.target.checked)} /> Produs vedetă (mare, primul)</label>
        <label className="chk span2"><input type="checkbox" data-k="sgr" defaultChecked={p.sgr} onChange={(e) => onCheck(i, 'sgr', e.target.checked)} /> Afișează „Prețul nu include SGR&quot; (o dată pe pagină)</label>
      </div>
      <div className="prod-bar">
        {d ? <span className="pill pdisc">{`-${d}%`}</span> : null}{p.hero ? <span className="pill hero">Vedetă</span> : null}<span className="js-st">{PILLS[st]}</span>
        <span className="sp"></span>
        <button className="icon-btn" type="button" data-act="up" disabled={i === 0} aria-label="Mută mai sus" onClick={() => onAction(i, 'up')}>↑</button>
        <button className="icon-btn" type="button" data-act="down" disabled={i === n - 1} aria-label="Mută mai jos" onClick={() => onAction(i, 'down')}>↓</button>
        <button className="del" type="button" data-act="del" onClick={() => onAction(i, 'del')}>Șterge</button>
      </div>
    </div>
  );
}
