'use client';
/* Pliantul clientului: antet + revistă digitală + subsol / bară contact.
   Port din js/flyer.js + index.html al prototipului static — grila de carduri → Magazine. */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as DF from '@/lib/store';
import type { OfferData, Product, ResolvedOffer } from '@/lib/types';
import { CartIcon, ClockIcon, PhoneIcon, PinIcon, WhatsappIcon } from '@/components/icons';
import Magazine from '@/components/magazine/Magazine';
import { HolidayBand, HolidayBg, Snowfall } from './HolidayDecor';

/** Datele + momentul la care s-a făcut ultima randare completă (ca render() din original). */
type View = { data: OfferData; at: Date };

const waLink = (text: string) => 'https://wa.me/?text=' + encodeURIComponent(text);

function flyerShareText(data: OfferData, offer: ResolvedOffer, list: Product[]) {
  const top = list.slice(0, 3).map((p) => `${p.name} ${p.size} la ${DF.fmtPrice(p.newPrice)} lei`).join(', ');
  return `${offer.title} la Daniofan Market (${DF.fmtRange(offer.start, offer.end)}): ${top}${list.length > 3 ? ' și altele' : ''}. Vezi toate ofertele aici: ${DF.shareBaseUrl(data)}`;
}

export default function Flyer() {
  const [view, setView] = useState<View | null>(null);
  const [cdNow, setCdNow] = useState<Date | null>(null);
  const [toast, setToast] = useState({ msg: '', show: false });
  const toastT = useRef<number | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true });
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  }, []);

  useEffect(() => {
    let alive = true;
    DF.load().then((data) => {
      if (!alive) return;
      const at = new Date();
      setView({ data, at }); setCdNow(at);
      DF.track('visits');
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onStorage = async (e: StorageEvent) => {
      if (e.key !== DF.DATA_KEY) return;
      const data = await DF.load();
      const at = new Date();
      setView({ data, at }); setCdNow(at);
      showToast('Oferta a fost actualizată');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [showToast]);

  useEffect(() => {
    if (!view) return;
    const before = DF.activeProducts(view.data, view.at).length;
    const id = window.setInterval(() => {
      const now = new Date();
      setCdNow(now);
      if (DF.activeProducts(view.data, now).length !== before) setView({ data: view.data, at: now });
    }, 20000);
    return () => window.clearInterval(id);
  }, [view]);

  useEffect(() => {
    if (!view) return;
    const offer = DF.resolveOffer(view.data, view.at);
    document.title = `${offer.title} ${DF.fmtRange(offer.start, offer.end)} — Daniofan Market`;
  }, [view]);

  const data = view?.data ?? null;
  const themeKey = data?.offer.theme || 'standard';
  useEffect(() => { document.body.dataset.theme = themeKey; }, [themeKey]);
  const offer = view ? DF.resolveOffer(view.data, view.at) : null;
  const list = view ? DF.activeProducts(view.data, view.at) : [];
  const c = offer && cdNow ? DF.countdown(offer, cdNow) : null;
  const [small, big] = offer ? DF.splitTitle(offer.title) : ['Ofertă de', 'WEEK-END'];

  return (
    <>
      <HolidayBand theme={data?.offer.theme} />
      <Snowfall theme={data?.offer.theme} />
      <header className="top">
        <div className="burst-bg"></div>
        <HolidayBg theme={data?.offer.theme} />
        <div className="wrap">
          <div className="logo" role="img" aria-label="Daniofan Market">
            <span className="l1">Daniofan</span>
            <span className="l2">Market<span className="cart"><CartIcon /></span></span>
          </div>
          <div>
            <h1 className="title"><span className="rays l"><i></i><i></i><i></i></span><span className="rays r"><i></i><i></i><i></i></span>
              <span className="t-small" id="t-small" hidden={!small}>{small}</span><span className="t-big" id="t-big">{big}</span><span className="t-dates" id="t-dates">{offer ? DF.fmtRange(offer.start, offer.end) : ''}</span></h1>
          </div>
          <div className={'countdown' + (c && c.state === 'last' ? ' last' : '')} id="countdown" role="status" aria-live="polite">
            {c ? (c.state === 'ended'
              ? <><ClockIcon /><div><div className="c-main">{c.main}</div><div className="c-sub">{c.sub}</div></div></>
              : <><ClockIcon /><div><div className="c-main">{c.prefix + ' '}<b>{c.lead}</b></div><div className="c-sub">{(c.detail ? c.detail + ' · ' : '') + c.sub}</div></div></>) : null}
          </div>
          <a className="btn btn-wa big" id="share-all" href={data && offer ? waLink(flyerShareText(data, offer, list)) : '#'} target="_blank" rel="noopener" hidden={!!view && !list.length}
            onClick={() => { DF.track('share', '_pliant'); showToast('Se deschide WhatsApp…'); }}><WhatsappIcon /><span className="b-txt">Trimite pe WhatsApp<small>toate ofertele, la familie și prieteni</small></span></a>
        </div>
      </header>

      <main className="wrap wrap--mag" id="offers" aria-label="Revista ofertelor">
        {view ? <Magazine data={view.data} at={view.at} /> : null}
      </main>

      <footer className="wrap foot">
        <h2>Daniofan Market</h2>
        <p className="addr" id="addr">{data?.store.address}</p>
        <p id="hours">{data?.store.hours}</p>
        <p>Telefon: <a id="foot-call" href={data ? 'tel:' + data.store.phone : '#'} onClick={() => DF.track('calls')}>{data ? (data.store.phoneLabel || data.store.phone) : ''}</a></p>
        <p className="small">Prețurile sunt valabile în limita stocului disponibil. Imaginile au caracter de prezentare.<br />
          Prototip demonstrativ realizat de EDGE · <a href="/admin">Pentru angajați</a></p>
      </footer>

      <nav className="bar" aria-label="Contact rapid">
        <div className="in">
          <a className="btn btn-call" id="call" href={data ? 'tel:' + data.store.phone : '#'} onClick={() => DF.track('calls')}><PhoneIcon />Sună la magazin</a>
          <a className="btn btn-map" id="map" href={data ? data.store.mapsUrl : '#'} target="_blank" rel="noopener" onClick={() => DF.track('directions')}><PinIcon />Cum ajung</a>
        </div>
      </nav>
      <div className={'toast' + (toast.show ? ' show' : '')} id="toast" role="status">{toast.msg}</div>
    </>
  );
}
