'use client';
/* Panou angajați (demo): editează oferta, salvează în localStorage, generează imaginile și codul QR.
   Port din js/admin.js + admin.html al prototipului static. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import * as DF from '@/lib/store';
import * as Social from '@/lib/social';
import type { FormatKey } from '@/lib/social';
import { drawQR } from '@/lib/qr';
import { download, num, processImage } from '@/lib/image';
import type { LocalStats, OfferData, Product } from '@/lib/types';
import BrandLogo from '@/components/BrandLogo';
import MagazineBuilder from '@/components/builder/MagazineBuilder';
import type { CatalogPage } from '@/lib/catalogTypes';
import {
  loadMagazineBuilderDraft,
  publishMagazine,
  saveMagazineBuilderDraft,
} from '@/lib/magazineBuilderStore';
import {
  getHomeMagazines,
  saveCatalog,
} from '@/lib/catalogStore';
import ProductCard from './ProductCard';
import ProductRow, { type FieldKey, type RowAction } from './ProductRow';
import Stats from './Stats';
/** Datele salvate + momentul salvării (status, QR și imaginile se refac după salvare, ca în original). */
type Snapshot = { data: OfferData; at: Date };

function stripQ(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export default function AdminPanel() {
  const [data, setData] = useState<OfferData | null>(null);
  const [committed, setCommitted] = useState<Snapshot | null>(null);
  const [productsKey, setProductsKey] = useState(0); // = renderProducts()
  const [stats, setStats] = useState<LocalStats | null>(null);
  const [saved, setSaved] = useState({ msg: '', err: false, show: false });
  const [socialUrls, setSocialUrls] = useState<Partial<Record<FormatKey, string>>>({});
  const [tab, setTab] = useState<'constructor' | 'produse'>('produse');
  const [productQuery, setProductQuery] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const publishSourceRef = useRef<(() => { pages: CatalogPage[]; activeIndex: number }) | null>(null);
  const bindPublishSource = useCallback(
    (getState: (() => { pages: CatalogPage[]; activeIndex: number }) | null) => {
      publishSourceRef.current = getState;
    },
    [],
  );

  const dataRef = useRef<OfferData | null>(null);
  const socialUrlsRef = useRef<Partial<Record<FormatKey, string>>>({});
  const socialDelay = useRef(0);
  const saveT = useRef<number | undefined>(undefined);
  const flashT = useRef<number | undefined>(undefined);
  const cutBgRef = useRef<HTMLInputElement>(null);
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

  const publishRevista = useCallback(() => {
    const live = publishSourceRef.current?.();
    const pages = live?.pages ?? loadMagazineBuilderDraft()?.pages ?? [];
    const activeIndex = live?.activeIndex ?? loadMagazineBuilderDraft()?.activeIndex ?? 0;
    const withGrid = pages.filter((p) => !!p.grid);
    if (!withGrid.length) {
      flash('Adaugă cel puțin o pagină în Constructor înainte de publicare.', true);
      if (tab !== 'constructor') setTab('constructor');
      return;
    }
    void (async () => {
      try {
        saveMagazineBuilderDraft(pages, activeIndex);
        publishMagazine(pages);
        /* Sync pe slotul weekend — coperta de pe home = prima foaie ca în preview */
        const slots = await getHomeMagazines();
        const weekend = slots.find((s) => s.kind === 'weekend')?.catalog;
        if (weekend) {
          await saveCatalog({
            ...weekend,
            status: 'published',
            kind: 'weekend',
            grid: withGrid[0].grid || weekend.grid,
            pages: withGrid,
          });
        }
        flash('✓ Revista a fost publicată. Deschide pliantul clientului.');
      } catch (err) {
        flash(err instanceof Error ? err.message : 'Publicarea a eșuat.', true);
      }
    })();
  }, [flash, tab]);

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
  const commit = useCallback((next: OfferData, opts: { products?: boolean } = {}) => {
    dataRef.current = next;
    setData(next);
    if (opts.products) setProductsKey((k) => k + 1);
    persist(next);
  }, [persist]);

  const renderAll = useCallback((d: OfferData) => {
    dataRef.current = d;
    setData(d);
    setProductsKey((k) => k + 1);
    socialDelay.current = 0;
    setCommitted({ data: d, at: new Date() });
    setStats(DF.getStats());
  }, []);

  useEffect(() => {
    let alive = true;
    DF.load().then((d) => { if (alive) renderAll(d); });
    return () => { alive = false; };
  }, [renderAll]);

  /* Constructor: fără scroll pe pagină — doar zoom pe foaie / scroll în panoul de produse */
  useEffect(() => {
    if (tab !== 'constructor') return;
    document.documentElement.classList.add('admin-builder-lock');
    document.body.classList.add('admin-builder-lock');
    const syncChrome = () => {
      const top = document.querySelector('.a-top');
      const tabs = document.querySelector('.a-tabs');
      const h = Math.ceil(
        (top?.getBoundingClientRect().height || 0) + (tabs?.getBoundingClientRect().height || 0),
      );
      document.documentElement.style.setProperty('--admin-chrome', `${h || 128}px`);
    };
    syncChrome();
    window.addEventListener('resize', syncChrome);
    return () => {
      window.removeEventListener('resize', syncChrome);
      document.documentElement.classList.remove('admin-builder-lock');
      document.body.classList.remove('admin-builder-lock');
      document.documentElement.style.removeProperty('--admin-chrome');
    };
  }, [tab]);

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
    flash('Se publică poza de Facebook pentru share…');
    try {
      // Exact PNG-ul din «Postare Facebook — pătrat» (preview-ul din secțiunea 3)
      let blob: Blob | null = null;
      const squareUrl = socialUrlsRef.current.square;
      if (squareUrl) {
        const res = await fetch(squareUrl);
        blob = await res.blob();
      }
      if (!blob || !blob.size) {
        const canvas = await Social.render(d, 'square');
        blob = await Social.toBlob(canvas);
      }
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
      flash('✓ Aceeași poză ca postarea pătrată e acum preview-ul la share (Facebook / WhatsApp). Sharing Debugger → Scrape Again.');
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

  /* ---------- 1. produse ---------- */
  const cur = () => dataRef.current as OfferData;

  const setProducts = (products: Product[], opts?: { products?: boolean }) => commit({ ...cur(), products }, opts);
  const onField = (i: number, k: FieldKey, value: string) => {
    const products = cur().products.slice();
    const next = { ...products[i] };
    if (k === 'oldPrice' || k === 'newPrice') next[k] = num(value);
    else if (k === 'unitQty') {
      if (value.trim() === '') delete next.unitQty;
      else next.unitQty = num(value);
    } else next[k] = value;
    products[i] = next;
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
      setEditIndex(null);
    } else if (act === 'up' && i > 0) {
      [P[i - 1], P[i]] = [P[i], P[i - 1]];
      setEditIndex(i - 1);
    } else if (act === 'down' && i < P.length - 1) {
      [P[i + 1], P[i]] = [P[i], P[i + 1]];
      setEditIndex(i + 1);
    }
    setProducts(P, { products: true });
  };
  const addProduct = (atTop: boolean) => {
    const P = cur().products;
    const id = 'p' + crypto.randomUUID().slice(0, 8);
    const p: Product = { id, name: '', size: '', oldPrice: 0, newPrice: 0, category: P[0] ? P[0].category : 'Bere', hero: false, sgr: true, image: '', validUntil: '' };
    flushSync(() => setProducts(atTop ? [p, ...P] : [...P, p], { products: true }));
    setProductQuery('');
    setEditIndex(atTop ? 0 : P.length);
  };

  useEffect(() => {
    if (editIndex == null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditIndex(null); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('.prod-modal [data-k=name]')?.focus();
    }, 40);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [editIndex]);

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
  const filtered = useMemo(() => {
    if (!data) return [] as { p: Product; i: number }[];
    const q = stripQ(productQuery.trim());
    return data.products
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => {
        if (!q) return true;
        const hay = stripQ([p.name, p.brand || '', p.size, p.category, p.variants || '', p.specialLabel || ''].join(' '));
        return hay.includes(q);
      });
  }, [data, productQuery]);
  const editProduct = editIndex != null && data ? data.products[editIndex] : null;

  return (
    <>
      <header className="a-top">
        <div className="a-in">
          <div className="a-brand"><span className="mini-logo"><BrandLogo size="sm" /></span><span className="a-title">Panou angajați</span></div>
          <div className="a-top-actions">
            <button type="button" className="btn a-publish" onClick={publishRevista}>
              Publică revista
            </button>
            <a className="btn a-open" href="/" target="_blank" rel="noopener">Vezi pliantul clientului →</a>
          </div>
        </div>
      </header>
      <div className="a-tabs" role="tablist" aria-label="Secțiuni panou">
        <button
          type="button"
          role="tab"
          id="tab-constructor"
          className={'a-tab' + (tab === 'constructor' ? ' is-on' : '')}
          aria-selected={tab === 'constructor'}
          onClick={() => setTab('constructor')}
        >
          Constructor Revista
        </button>
        <button
          type="button"
          role="tab"
          id="tab-produse"
          className={'a-tab' + (tab === 'produse' ? ' is-on' : '')}
          aria-selected={tab === 'produse'}
          onClick={() => setTab('produse')}
        >
          Produse
        </button>
        <a
          href="/admin/magazine"
          role="tab"
          className="a-tab"
          id="tab-magazine"
        >
          Magazine
        </a>
      </div>

      {tab === 'constructor' ? (
        <main className="a-main a-main--builder" aria-labelledby="tab-constructor">
          <MagazineBuilder
            products={data?.products || []}
            offer={resolved}
            onBindPublishSource={bindPublishSource}
          />
        </main>
      ) : (
      <main className="a-main" aria-labelledby="tab-produse">
        <section className="a-card status-card" id="status">{status}</section>

        <section className="a-card">
          <div className="h-row"><h2><span className="step">1</span>Produsele din ofertă</h2><button className="btn a-add" id="add-top" type="button" onClick={() => addProduct(true)}>+ Adaugă produs</button></div>
          <label className="chk"><input ref={cutBgRef} id="cut-bg" type="checkbox" defaultChecked /> La poze noi: decupează automat fundalul</label>
          <p className="help">Fundalul se taie în browser cu U-2-Net / u2netp (Apache-2.0, comercial OK) — merge și pe Vercel. La primul upload se încarcă modelul (~5 MB).</p>
          <label className="p-search">
            <span className="sr-only">Caută produse</span>
            <input
              type="search"
              id="prod-search"
              placeholder="Caută după nume, brand, gramaj, categorie…"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div id="products" className="prod-grid">
            {data && resolved ? (n
              ? (filtered.length
                ? filtered.map(({ p, i }) => (
                  <ProductCard key={p.id} p={p} offer={resolved} onEdit={() => setEditIndex(i)} />
                ))
                : <p className="help prod-grid__empty">Niciun produs nu potrivește căutarea.</p>)
              : <p className="help prod-grid__empty">Niciun produs încă. Apăsați „Adaugă produs&quot;.</p>) : null}
          </div>
          <button className="btn a-add big" id="add-bottom" type="button" onClick={() => addProduct(false)}>+ Adaugă încă un produs</button>
          <datalist id="cats"><option>Bere</option><option>Băuturi</option><option>Lactate</option><option>Carne</option><option>Fructe și legume</option><option>Dulciuri</option><option>Curățenie</option></datalist>
          <datalist id="units"><option>l</option><option>kg</option><option>buc</option></datalist>
        </section>

        <section className="a-card">
          <div className="h-row"><h2><span className="step">2</span>Imagini pentru Facebook, gata făcute</h2><button className="btn a-dl-all" id="dl-all" type="button" onClick={downloadAll}>Descarcă toate (3 PNG)</button></div>
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
              Publică poza de Facebook pentru share
            </button>
          </div>
          <p className="help">Urcă pe server <b>exact</b> poza din «Postare Facebook — pătrat» (cea pe care o vezi mai sus, cu prețuri și produse). Asta apare când cineva partajează linkul pe Facebook / WhatsApp. După publicare: Facebook Sharing Debugger → Scrape Again.</p>
        </section>

        <section className="a-card">
          <h2><span className="step">3</span>Cod QR pentru casa de marcat</h2>
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
          <div className="h-row"><h2><span className="step">4</span>Statistici</h2><span className="demo-tag">DATE DEMO</span></div>
          <p className="help">Cifre simulate pentru prezentare, la care se adună click-urile reale făcute pe pliant în acest browser (vizualizări de produs, trimiteri pe WhatsApp, apăsări pe „Sună&quot; și „Cum ajung&quot;).</p>
          <div id="stats">{stats && data ? <Stats s={stats} products={data.products} /> : null}</div>
        </section>

        <section className="a-card a-reset">
          <button className="btn a-ghost" id="reset-data" type="button" onClick={resetData}>Revino la oferta demo inițială</button>
          <button className="btn a-ghost" id="reset-stats" type="button" onClick={resetStats}>Șterge click-urile locale</button>
        </section>
        <p className="a-foot">Prototip EDGE pentru Daniofan Market · fără server, totul rulează în browser</p>
      </main>
      )}

      {editIndex != null && editProduct && resolved ? (
        <div
          className="prod-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prod-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setEditIndex(null); }}
        >
          <div className="prod-modal__panel">
            <div className="prod-modal__head">
              <h2 id="prod-modal-title">Editează produs</h2>
              <button type="button" className="prod-modal__x" aria-label="Închide" onClick={() => setEditIndex(null)}>×</button>
            </div>
            <div className="prod-modal__body">
              <ProductRow
                key={productsKey + ':' + editProduct.id}
                p={editProduct}
                i={editIndex}
                n={n}
                offer={resolved}
                onField={onField}
                onCheck={onCheck}
                onImage={onImage}
                onAction={onAction}
              />
            </div>
            <div className="prod-modal__foot">
              <button type="button" className="btn a-add" onClick={() => setEditIndex(null)}>Gata</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={'saved' + (saved.show ? ' show' : '') + (saved.err ? ' err' : '')} id="saved" role="status">{saved.msg}</div>

      <div id="poster" className="poster" aria-hidden="true">
        <div className="logo brand-logo-wrap"><BrandLogo size="xl" /></div>
        <h1>Ofertele săptămânii,<br />pe telefonul dumneavoastră!</h1>
        <img ref={posterQrRef} id="poster-qr" alt="" />
        <p className="p-step">Deschideți camera telefonului și îndreptați-o spre cod.</p>
        <p className="p-url" id="poster-url" ref={posterUrlRef}></p>
      </div>
    </>
  );
}
