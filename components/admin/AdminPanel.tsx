'use client';
/* Panou angajați (demo): editează oferta, salvează în localStorage, generează imaginile și codul QR.
   Port din js/admin.js + admin.html al prototipului static. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import * as DF from '@/lib/store';
import * as Social from '@/lib/social';
import type { FormatKey } from '@/lib/social';
import { drawQR } from '@/lib/qr';
import { download, num, processImage } from '@/lib/image';
import type { LocalStats, OfferData, Product } from '@/lib/types';
import ProductRow, { type FieldKey, type RowAction } from './ProductRow';
import Stats from './Stats';

/** Datele salvate + momentul salvării (status, QR și imaginile se refac după salvare, ca în original). */
type Snapshot = { data: OfferData; at: Date };

export default function AdminPanel() {
  const [data, setData] = useState<OfferData | null>(null);
  const [committed, setCommitted] = useState<Snapshot | null>(null);
  const [productsKey, setProductsKey] = useState(0); // = renderProducts()
  const [offerKey, setOfferKey] = useState(0); // = renderOffer()
  const [stats, setStats] = useState<LocalStats | null>(null);
  const [saved, setSaved] = useState({ msg: '', err: false, show: false });
  const [socialUrls, setSocialUrls] = useState<Partial<Record<FormatKey, string>>>({});

  const dataRef = useRef<OfferData | null>(null);
  const socialUrlsRef = useRef<Partial<Record<FormatKey, string>>>({});
  const socialDelay = useRef(0);
  const saveT = useRef<number | undefined>(undefined);
  const flashT = useRef<number | undefined>(undefined);
  const cutBgRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const pubUrlRef = useRef<HTMLInputElement>(null);
  const posterQrRef = useRef<HTMLImageElement>(null);
  const posterUrlRef = useRef<HTMLParagraphElement>(null);

  /* ---------- salvare ---------- */
  const flash = useCallback((msg: string, err?: boolean) => {
    setSaved({ msg, err: !!err, show: true });
    window.clearTimeout(flashT.current);
    flashT.current = window.setTimeout(() => setSaved((s) => ({ ...s, show: false })), err ? 5000 : 2200);
  }, []);

  const persist = useCallback((next: OfferData) => {
    window.clearTimeout(saveT.current);
    saveT.current = window.setTimeout(() => {
      try { DF.save(next); flash('✓ Salvat. Pliantul clienților s-a actualizat.'); }
      catch { flash('Nu s-a putut salva: probabil pozele sunt prea mari pentru demo. Încercați o poză mai mică.', true); }
      socialDelay.current = 500;
      setCommitted({ data: next, at: new Date() }); // renderStatus(); renderQR(); renderSocial() după 500 ms
    }, 350);
  }, [flash]);

  /** Aplică o modificare: o arată imediat și o salvează (cu întârzierea originalului). */
  const commit = useCallback((next: OfferData, opts: { products?: boolean; offer?: boolean } = {}) => {
    dataRef.current = next;
    setData(next);
    if (opts.products) setProductsKey((k) => k + 1);
    if (opts.offer) setOfferKey((k) => k + 1);
    persist(next);
  }, [persist]);

  const renderAll = useCallback((d: OfferData) => {
    dataRef.current = d;
    setData(d);
    setProductsKey((k) => k + 1);
    setOfferKey((k) => k + 1);
    socialDelay.current = 0;
    setCommitted({ data: d, at: new Date() });
    setStats(DF.getStats());
  }, []);

  useEffect(() => {
    let alive = true;
    DF.load().then((d) => { if (alive) renderAll(d); });
    return () => { alive = false; };
  }, [renderAll]);

  /* ---------- 4. QR (+ afișul A5) ---------- */
  const renderQR = useCallback((d: OfferData) => {
    const url = DF.shareBaseUrl(d);
    if (qrRef.current) drawQR(qrRef.current, url, 360);
    if (pubUrlRef.current && document.activeElement !== pubUrlRef.current) pubUrlRef.current.value = d.store.publicUrl || '';
    const big = drawQR(document.createElement('canvas'), url, 1200);
    if (posterQrRef.current) posterQrRef.current.src = big.toDataURL('image/png');
    if (posterUrlRef.current) posterUrlRef.current.textContent = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }, []);
  useEffect(() => { if (committed) renderQR(committed.data); }, [committed, renderQR]);

  /* ---------- 3. imagini sociale ---------- */
  useEffect(() => {
    if (!committed) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      for (const k of Social.FORMAT_KEYS) {
        const canvas = await Social.render(committed.data, k);
        if (cancelled) return;
        const blob = await Social.toBlob(canvas);
        if (cancelled || !blob) return;
        const old = socialUrlsRef.current[k];
        const url = URL.createObjectURL(blob);
        socialUrlsRef.current = { ...socialUrlsRef.current, [k]: url };
        setSocialUrls(socialUrlsRef.current);
        if (old) URL.revokeObjectURL(old);
      }
      document.body.dataset.socialReady = '1';
    }, socialDelay.current);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [committed]);

  const fileName = (k: FormatKey) => {
    const o = DF.resolveOffer(dataRef.current as OfferData);
    return `daniofan-oferta-${DF.toISODate(o.start)}-${Social.FORMATS[k].size.replace('×', 'x')}.png`;
  };
  const downloadSocial = (k: FormatKey) => { const u = socialUrlsRef.current[k]; if (u) download(u, fileName(k)); };
  const downloadAll = () => (Object.keys(socialUrlsRef.current) as FormatKey[]).forEach((k, i) => setTimeout(() => downloadSocial(k), i * 400));

  const publishOgShare = async () => {
    const d = dataRef.current;
    if (!d) { flash('Nu există date de publicat.', true); return; }
    const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET || '';
    if (!secret) {
      flash('Lipsește NEXT_PUBLIC_ADMIN_SECRET (același ca ADMIN_SECRET pe server).', true);
      return;
    }
    flash('Se publică imaginea pentru share…');
    try {
      const canvas = await Social.render(d, Social.OG_FORMAT);
      const blob = await Social.toBlob(canvas);
      if (!blob) throw new Error('Nu s-a putut genera PNG-ul');
      const offer = DF.resolveOffer(d);
      const period = DF.fmtRange(offer.start, offer.end);
      const form = new FormData();
      form.append('file', blob, 'og.png');
      form.append('title', offer.title);
      form.append('period', period);
      form.append('width', String(Social.OG_WIDTH));
      form.append('height', String(Social.OG_HEIGHT));
      const res = await fetch('/api/og-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}` },
        body: form,
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; version?: number };
      if (!res.ok) throw new Error(body.error || res.statusText);
      flash('✓ Imagine publicată pentru Facebook / WhatsApp. Reîmprospătați previzualizarea în Sharing Debugger.');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Publicarea a eșuat.', true);
    }
  };

  /* ---------- 5. statistici: se reîncarcă la click-uri noi în pliant (alt tab) și la revenirea în fereastră ---------- */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === DF.STATS_KEY) setStats(DF.getStats()); };
    const onFocus = () => setStats(DF.getStats());
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', onFocus); };
  }, []);

  /* ---------- 1. oferta ---------- */
  const cur = () => dataRef.current as OfferData;
  const onTitle = (e: React.ChangeEvent<HTMLInputElement>) => { const d = cur(); commit({ ...d, offer: { ...d.offer, title: e.target.value } }); };
  const onDates = () => {
    const d = cur();
    const start = startRef.current?.value || '';
    let end = endRef.current?.value || '';
    if (end && start && end < start) { end = start; if (endRef.current) endRef.current.value = start; }
    commit({ ...d, offer: { ...d.offer, start, end, autoDates: false } }, { products: true });
  };
  const onAuto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = cur();
    const offer = { ...d.offer, autoDates: e.target.checked };
    if (!e.target.checked) { offer.start = startRef.current?.value || ''; offer.end = endRef.current?.value || ''; }
    commit({ ...d, offer }, { offer: true, products: true });
  };

  /* ---------- 2. produse ---------- */
  const setProducts = (products: Product[], opts?: { products?: boolean }) => commit({ ...cur(), products }, opts);
  const onField = (i: number, k: FieldKey, value: string) => {
    const products = cur().products.slice();
    products[i] = { ...products[i], [k]: (k === 'oldPrice' || k === 'newPrice') ? num(value) : value };
    setProducts(products);
  };
  const onCheck = (i: number, k: 'hero' | 'sgr', checked: boolean) => {
    const P = cur().products;
    if (k === 'hero') setProducts(P.map((x, j) => ({ ...x, hero: j === i ? checked : false })), { products: true });
    else setProducts(P.map((x, j) => (j === i ? { ...x, sgr: checked } : x)));
  };
  const onImage = async (i: number, file: File) => {
    const cut = !!cutBgRef.current?.checked;
    flash(cut ? 'Se taie fundalul (U-2-Net în browser)…' : 'Se prelucrează poza…');
    try {
      const image = await processImage(file, cut);
      setProducts(cur().products.map((x, j) => (j === i ? { ...x, image } : x)), { products: true });
      flash('✓ Poză actualizată.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Poza nu a putut fi prelucrată.';
      flash(msg, true);
    }
  };
  const onAction = (i: number, act: RowAction) => {
    const P = cur().products.slice();
    if (act === 'del') {
      if (!confirm(`Ștergeți „${P[i].name || 'produsul'} ${P[i].size || ''}" din ofertă?`)) return;
      P.splice(i, 1);
    } else if (act === 'up' && i > 0) [P[i - 1], P[i]] = [P[i], P[i - 1]];
    else if (act === 'down' && i < P.length - 1) [P[i + 1], P[i]] = [P[i], P[i + 1]];
    setProducts(P, { products: true });
  };
  const addProduct = (atTop: boolean) => {
    const P = cur().products;
    const p: Product = { id: 'p' + Date.now().toString(36), name: '', size: '', oldPrice: 0, newPrice: 0, category: P[0] ? P[0].category : 'Bere', hero: false, sgr: true, image: '', validUntil: '' };
    flushSync(() => setProducts(atTop ? [p, ...P] : [...P, p], { products: true }));
    const row = document.querySelector<HTMLElement>(`.prod[data-i="${atTop ? 0 : P.length}"]`);
    if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => row.querySelector<HTMLInputElement>('[data-k=name]')?.focus(), 300);
  };

  /* ---------- 4. QR: acțiuni ---------- */
  const onPubUrl = (e: React.ChangeEvent<HTMLInputElement>) => { const d = cur(); commit({ ...d, store: { ...d.store, publicUrl: e.target.value.trim() } }); };
  const printPoster = () => { renderQR(cur()); setTimeout(() => window.print(), 100); };
  const downloadQR = () => download(drawQR(document.createElement('canvas'), DF.shareBaseUrl(cur()), 1200).toDataURL('image/png'), 'daniofan-qr-pliant.png');

  /* ---------- resetări ---------- */
  const resetData = async () => {
    if (!confirm('Reveniți la oferta demo inițială? Modificările voastre se pierd.')) return;
    DF.reset(); const d = await DF.load(); renderAll(d); flash('Oferta demo a fost restaurată.');
  };
  const resetStats = () => { DF.resetStats(); setStats(DF.getStats()); flash('Click-urile locale au fost șterse.'); };

  /* ---------- 0. status (după salvare) ---------- */
  let status: React.ReactNode = null;
  if (committed) {
    const offer = DF.resolveOffer(committed.data, committed.at);
    const act = DF.activeProducts(committed.data, committed.at);
    const c = DF.countdown(offer, committed.at);
    const on = c.state !== 'ended' && act.length > 0;
    status = (
      <>
        <span className={'dot' + (on ? '' : ' off')}></span>
        <div>
          <div className="st-main">{on ? `Pliantul e live: ${act.length} ${act.length === 1 ? 'produs' : 'produse'} în ofertă` : 'Pliantul nu are oferte active acum'}</div>
          <div className="st-sub">{`${offer.title} · ${DF.fmtRange(offer.start, offer.end)} · ${c.state === 'ended' ? c.main : c.prefix + ' ' + c.lead}`}</div>
        </div>
      </>
    );
  }

  const resolved = data ? DF.resolveOffer(data) : null;
  const n = data ? data.products.length : 0;

  return (
    <>
      <header className="a-top">
        <div className="a-in">
          <div className="a-brand"><span className="mini-logo"><b>DANIOFAN</b><i>MARKET</i></span><span className="a-title">Panou angajați</span></div>
          <a className="btn a-open" href="/" target="_blank" rel="noopener">Vezi pliantul clientului →</a>
        </div>
      </header>
      <div className="demo-banner"><b>MOD DEMO</b> — fără parolă, datele se salvează doar în acest browser. În versiunea finală: cont pentru fiecare angajat și salvare pe server.</div>

      <main className="a-main">
        <section className="a-card status-card" id="status">{status}</section>

        <section className="a-card">
          <h2><span className="step">1</span>Oferta</h2>
          <div className="fields three">
            <label className="wide">Titlul ofertei<input key={'t' + offerKey} id="o-title" type="text" placeholder="Ofertă de WEEK-END" defaultValue={data ? data.offer.title || '' : ''} onChange={onTitle} /></label>
            <label>Începe<input key={'s' + offerKey} ref={startRef} id="o-start" type="date" defaultValue={resolved ? DF.toISODate(resolved.start) : ''} onChange={onDates} /></label>
            <label>Se termină<input key={'e' + offerKey} ref={endRef} id="o-end" type="date" defaultValue={resolved ? DF.toISODate(resolved.end) : ''} onChange={onDates} /></label>
          </div>
          <label className="chk"><input id="o-auto" type="checkbox" checked={!!data?.offer.autoDates} onChange={onAuto} /> Date automate pentru demo (weekendul curent: vineri–duminică)</label>
          <p className="help">După data de sfârșit, produsele dispar singure din pliant. Nu mai trebuie șters nimic manual.</p>
        </section>

        <section className="a-card">
          <div className="h-row"><h2><span className="step">2</span>Produsele din ofertă</h2><button className="btn a-add" id="add-top" type="button" onClick={() => addProduct(true)}>+ Adaugă produs</button></div>
          <label className="chk"><input ref={cutBgRef} id="cut-bg" type="checkbox" defaultChecked /> La poze noi: decupează automat fundalul</label>
          <p className="help">Fundalul se taie în browser cu U-2-Net / u2netp (Apache-2.0, comercial OK) — merge și pe Vercel. La primul upload se încarcă modelul (~5 MB).</p>
          <div id="products">
            {data && resolved ? (n
              ? data.products.map((p, i) => <ProductRow key={productsKey + ':' + i} p={p} i={i} n={n} offer={resolved} onField={onField} onCheck={onCheck} onImage={onImage} onAction={onAction} />)
              : <p className="help">Niciun produs încă. Apăsați „Adaugă produs&quot;.</p>) : null}
          </div>
          <button className="btn a-add big" id="add-bottom" type="button" onClick={() => addProduct(false)}>+ Adaugă încă un produs</button>
          <datalist id="cats"><option>Bere</option><option>Băuturi</option><option>Lactate</option><option>Carne</option><option>Fructe și legume</option><option>Dulciuri</option><option>Curățenie</option></datalist>
        </section>

        <section className="a-card">
          <div className="h-row"><h2><span className="step">3</span>Imagini pentru Facebook, gata făcute</h2><button className="btn a-dl-all" id="dl-all" type="button" onClick={downloadAll}>Descarcă toate (3 PNG)</button></div>
          <p className="help">Se refac singure la fiecare modificare. Nu mai trebuie poze făcute cu AI: scrieți produsele, iar sistemul face imaginea în stilul Daniofan.</p>
          <div className="social" id="social">
            {committed ? Social.FORMAT_KEYS.map((k) => {
              const f = Social.FORMATS[k];
              const url = socialUrls[k];
              return (
                <div className="s-item" data-k={k} key={k}><h3>{f.label}<small>{`${f.size} px · PNG`}</small></h3>
                  <div className="s-prev">{url ? <img src={url} alt={`Previzualizare ${f.size}`} /> : <div className="s-wait">Se generează…</div>}</div>
                  <button className="btn s-dl" type="button" data-k={k} onClick={() => downloadSocial(k)}>Descarcă PNG</button></div>
              );
            }) : null}
          </div>
          <div className="btns" style={{ marginTop: '1rem' }}>
            <button className="btn a-add" id="publish-og" type="button" onClick={publishOgShare}>
              Publică imaginea pentru share
            </button>
          </div>
          <p className="help">Generează aceeași imagine ca postarea pătrată (1080×1080, cu produsele din ofertă), o urcă pe Vercel Blob și o folosește Facebook / WhatsApp la previzualizarea linkului. După publicare: Facebook Sharing Debugger → Scrape Again.</p>
        </section>

        <section className="a-card">
          <h2><span className="step">4</span>Cod QR pentru casa de marcat</h2>
          <div className="qr-row">
            <canvas ref={qrRef} id="qr" width={360} height={360} aria-label="Cod QR spre pliant"></canvas>
            <div className="qr-side">
              <label>Adresa pliantului (unde duce codul QR și linkul de WhatsApp)<input ref={pubUrlRef} id="pub-url" type="url" onChange={onPubUrl} /></label>
              <p className="help">Pentru demo: adresa planificată. După publicare, aici va fi adresa reală.</p>
              <div className="btns"><button className="btn a-print" id="print-qr" type="button" onClick={printPoster}>Printează afișul pentru casă</button><button className="btn a-ghost" id="dl-qr" type="button" onClick={downloadQR}>Descarcă QR (PNG)</button></div>
            </div>
          </div>
        </section>

        <section className="a-card">
          <div className="h-row"><h2><span className="step">5</span>Statistici</h2><span className="demo-tag">DATE DEMO</span></div>
          <p className="help">Cifre simulate pentru prezentare, la care se adună click-urile reale făcute pe pliant în acest browser (vizualizări de produs, trimiteri pe WhatsApp, apăsări pe „Sună&quot; și „Cum ajung&quot;).</p>
          <div id="stats">{stats && data ? <Stats s={stats} products={data.products} /> : null}</div>
        </section>

        <section className="a-card a-reset">
          <button className="btn a-ghost" id="reset-data" type="button" onClick={resetData}>Revino la oferta demo inițială</button>
          <button className="btn a-ghost" id="reset-stats" type="button" onClick={resetStats}>Șterge click-urile locale</button>
        </section>
        <p className="a-foot">Prototip EDGE pentru Daniofan Market · fără server, totul rulează în browser</p>
      </main>

      <div className={'saved' + (saved.show ? ' show' : '') + (saved.err ? ' err' : '')} id="saved" role="status">{saved.msg}</div>

      <div id="poster" className="poster" aria-hidden="true">
        <div className="logo"><span className="l1">Daniofan</span><span className="l2">Market</span></div>
        <h1>Ofertele săptămânii,<br />pe telefonul dumneavoastră!</h1>
        <img ref={posterQrRef} id="poster-qr" alt="" />
        <p className="p-step">Deschideți camera telefonului și îndreptați-o spre cod.</p>
        <p className="p-url" id="poster-url" ref={posterUrlRef}></p>
      </div>
    </>
  );
}
