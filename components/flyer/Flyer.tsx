'use client';
/* Pliantul clientului: un singur scroll, randat din date (data/offer.json + modificările din panoul angajaților).
   Port din js/flyer.js + index.html al prototipului static. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as DF from '@/lib/store';
import type { OfferData, Product, ResolvedOffer } from '@/lib/types';
import { CartIcon, ClockIcon, DownIcon, PhoneIcon, PinIcon, WhatsappIcon } from '@/components/icons';
import ProductCard from './ProductCard';
import { HolidayBand, HolidayBg, Snowfall } from './HolidayDecor';

/** Datele + momentul la care s-a făcut ultima randare completă (ca render() din original). */
type View = { data: OfferData; at: Date };

const waLink = (text: string) => 'https://wa.me/?text=' + encodeURIComponent(text);

function flyerShareText(data: OfferData, offer: ResolvedOffer, list: Product[]) {
  const top = list.slice(0, 3).map((p) => `${p.name} ${p.size} la ${DF.fmtPrice(p.newPrice)} lei`).join(', ');
  return `${offer.title} la Daniofan Market (${DF.fmtRange(offer.start, offer.end)}): ${top}${list.length > 3 ? ' și altele' : ''}. Vezi toate ofertele aici: ${DF.shareBaseUrl(data)}`;
}
function productShareText(data: OfferData, offer: ResolvedOffer, p: Product) {
  const old = +p.oldPrice > 0 ? ` (în loc de ${DF.fmtPrice(p.oldPrice)} lei)` : '';
  return `${p.name} ${p.size} doar ${DF.fmtPrice(p.newPrice)} lei${old} la Daniofan Market! Valabil până ${DF.fmtDayLong(offer.end)}. Vezi aici: ${DF.shareBaseUrl(data)}#p-${p.id}`;
}

// numele lungi (ex. TIMIȘOREANA) se micșorează ca să încapă pe un rând
function fitNames() {
  document.querySelectorAll<HTMLElement>('.p-name').forEach((el) => {
    el.style.fontSize = '';
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 1 && size > 22) { size -= 1; el.style.fontSize = size + 'px'; }
  });
}

export default function Flyer() {
  const [view, setView] = useState<View | null>(null);
  const [cdNow, setCdNow] = useState<Date | null>(null);
  const [toast, setToast] = useState({ msg: '', show: false });
  const toastT = useRef<number | undefined>(undefined);
  const seen = useRef(new Set<string>());
  const hashDone = useRef(false);
  const mainRef = useRef<HTMLElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true });
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  }, []);

  /* pornire: datele + o vizită */
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

  // panoul angajaților salvează în localStorage -> pliantul deschis în alt tab se actualizează singur
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

  /* numărătoarea inversă: la fiecare 20 s; dacă s-a schimbat lista de oferte active, randare completă */
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

  /* titlul paginii */
  useEffect(() => {
    if (!view) return;
    const offer = DF.resolveOffer(view.data, view.at);
    document.title = `${offer.title} ${DF.fmtRange(offer.start, offer.end)} — Daniofan Market`;
  }, [view]);

  /* numele lungi pe un rând */
  useLayoutEffect(() => {
    if (!view) return;
    fitNames();
    // fontul cardurilor începe să se încarce abia acum: re-măsurăm după ce s-a încărcat
    if (document.fonts) document.fonts.ready.then(() => fitNames());
  }, [view]);
  useEffect(() => {
    const onResize = () => fitNames();
    window.addEventListener('resize', onResize);
    if (document.fonts) document.fonts.ready.then(() => fitNames());
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* vizualizări de produs: card vizibil 60% timp de 1 secundă */
  useEffect(() => {
    if (!view || !('IntersectionObserver' in window) || !mainRef.current) return;
    const timers = new Map<string, number>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const id = (e.target as HTMLElement).dataset.id || '';
        if (e.isIntersecting) {
          if (seen.current.has(id)) return;
          timers.set(id, window.setTimeout(() => { seen.current.add(id); DF.track('view', id); io.unobserve(e.target); }, 1000));
        } else { window.clearTimeout(timers.get(id)); }
      });
    }, { threshold: 0.6 });
    mainRef.current.querySelectorAll('.card').forEach((c) => io.observe(c));
    return () => { io.disconnect(); timers.forEach((t) => window.clearTimeout(t)); };
  }, [view]);

  /* link direct spre un produs (#p-...) */
  useEffect(() => {
    if (!view || hashDone.current) return;
    hashDone.current = true;
    const h = location.hash.replace('#', '');
    if (h) { const el = document.getElementById(h); if (el) setTimeout(() => { el.scrollIntoView({ block: 'start' }); el.classList.add('flash'); }, 150); }
  }, [view]);

  const onShare = useCallback((id: string) => { DF.track('share', id); showToast('Se deschide WhatsApp…'); }, [showToast]);

  /* ---------- date derivate ---------- */
  const data = view?.data ?? null;
  const themeKey = data?.offer.theme || 'standard';
  // tema se aplică pe <body> (culori, fundal, decoruri din styles/themes.css)
  useEffect(() => { document.body.dataset.theme = themeKey; }, [themeKey]);
  const offer = view ? DF.resolveOffer(view.data, view.at) : null;
  const list = view ? DF.activeProducts(view.data, view.at) : [];
  const hero = DF.heroOf(list);
  const c = offer && cdNow ? DF.countdown(offer, cdNow) : null;
  const [small, big] = offer ? DF.splitTitle(offer.title) : ['Ofertă de', 'WEEK-END'];

  // vedeta primul, apoi pe categorii (fără meniuri: titluri mari în același scroll)
  const cats: { name: string; items: Product[] }[] = [];
  list.filter((p) => p !== hero).forEach((p) => {
    const name = (p.category || 'Alte oferte').trim();
    let g = cats.find((x) => x.name === name);
    if (!g) cats.push(g = { name, items: [] });
    g.items.push(p);
  });

  const card = (p: Product, isHero: boolean) => (
    <ProductCard key={p.id + (isHero ? '-hero' : '')} p={p} isHero={isHero} shareHref={data && offer ? waLink(productShareText(data, offer, p)) : '#'} onShare={onShare} />
  );

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
          <p className="hint" id="hint" hidden={!!view && list.length < 2}><DownIcon />Dați în jos pentru toate ofertele</p>
        </div>
      </header>

      <main className="wrap" id="offers" aria-label="Produse în ofertă" ref={mainRef}>
        {view && !list.length ? (
          <div className="empty"><h2>Oferta s-a încheiat</h2><p>Ofertele noi apar în curând, chiar aici.</p><p>Întrebări? Sunați-ne, vă răspundem cu drag.</p></div>
        ) : null}
        {hero ? <div className="grid">{card(hero, true)}</div> : null}
        {cats.map((g) => [
          <h2 className="section-h" key={'h-' + g.name}>{g.name + ' '}<span className="count">{`${g.items.length} ${g.items.length === 1 ? 'ofertă' : 'oferte'}`}</span></h2>,
          <div className="grid" key={'g-' + g.name}>{g.items.map((p) => card(p, false))}</div>,
        ])}
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
