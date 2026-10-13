# Daniofan Market — pliant digital (prototip MVP, EDGE) · Next.js

Prototipul demonstrativ pentru întâlnirea cu Daniofan, portat în **Next.js** (App Router, TypeScript, React). Arată și funcționează identic cu varianta HTML statică: același design, aceleași fonturi, aceleași texte, aceleași funcții. Totul rulează în browser, fără server și fără conturi (fonturile, codul QR și pozele sunt incluse în proiect).

## Ce conține

| Pagina | Ce face |
|---|---|
| `/` | **Pliantul clientului.** Un singur scroll, fără meniuri, fără login. Text mare, prețuri mari, numărătoare inversă „Oferta se termină în X zile”, produs vedetă, butoane mari „Sună la magazin” / „Cum ajung” (bara fixă de jos), „Trimite pe WhatsApp” pentru tot pliantul și pentru fiecare produs. Ofertele expirate dispar singure. |
| `/admin` | **Panoul angajaților (demo, fără parolă).** Titlul și datele ofertei, produsele (adaugă / modifică / șterge / reordonează, poză cu decupare fundal U-2-Net în browser, vedetă, SGR, „valabil până la”). Se salvează automat, iar pliantul se actualizează imediat (și în alt tab deschis). |
| `/admin` → secțiunea 3 | **Imaginile pentru Facebook, generate automat** în stilul pliantului lor: 1080×1080, 1080×1350, Story 1080×1920, descărcabile ca PNG. |
| `/admin` → secțiunea 4 | **Cod QR** spre pliant + afiș A5 de printat pentru casa de marcat. |
| `/admin` → secțiunea 5 | **Statistici (DATE DEMO)**: cifre simulate + click-urile reale din acest browser (vizualizări de produs, trimiteri pe WhatsApp, „Sună”, „Cum ajung”). |

## Cum îl pornești în Cursor

Ai nevoie de **Node.js 20.9 sau mai nou** (recomandat Node 22 LTS, de pe nodejs.org).

1. Dezarhivezi proiectul și deschizi folderul `daniofan-next` în Cursor (File → Open Folder).
2. Deschizi terminalul din Cursor (Ctrl+` / Cmd+`) și rulezi:

```bash
npm install
npm run download-u2netp   # ~5 MB: u2netp pentru browser (și pe Vercel)
npm run dev
```

3. Deschizi `http://localhost:3000/` (pliantul) și `http://localhost:3000/admin` (panoul).

**Eliminarea de fundal** rulează **în browser** (onnxruntime-web + `public/models/u2netp.onnx`). Merge local și pe Vercel. La primul upload cu checkbox-ul activ se încarcă modelul (~5 MB).

Modificările din cod se văd imediat în browser, fără restart.

Alte comenzi:

```bash
npm run build            # descarcă u2netp dacă lipsește + build producție
npm start                # pornește build-ul de producție pe http://localhost:3000
npm run lint             # verificare ESLint
npm run download-u2netp  # (re)descarcă u2netp.onnx în public/models/
npm run download-u2net   # opțional: u2net full (~176 MB) pentru API Node / VPS
```

### Demo pe telefon

Cea mai simplă variantă: publici pe Vercel (mai jos) și deschizi linkul pe telefon.

În rețeaua locală (telefonul și laptopul pe același Wi-Fi):

```bash
npm run build
npx next start -H 0.0.0.0
```

Apoi deschizi pe telefon `http://IP-ul-laptopului:3000/` (IP-ul îl afli cu `ipconfig` pe Windows sau `ipconfig getifaddr en0` pe Mac).

> Datele modificate din panou stau în `localStorage`-ul browserului, deci laptopul și telefonul au fiecare datele lui. Pentru demo: editezi pe laptop și arăți pe laptop (două taburi alăturate: panou + pliant), iar pe telefon arăți pliantul cu oferta implicită.

## Eliminarea fundalului (U-2-Net în browser)

Când bifezi „decupează automat fundalul” în panou, poza e redimensionată (max. 700 px), apoi **U-2-Net u2netp** rulează în browser (WASM). Rezultatul e PNG cu alpha, apoi crop + WebP.

- Model original: [xuebinqin/U-2-Net](https://github.com/xuebinqin/U-2-Net) — **Apache-2.0**, ok pentru produs plătit / comercial (cu atribuire). Vezi `LICENSE-U2NET.md`.
- Greutăți browser: `public/models/u2netp.onnx` (~4.7 MB, via [rembg](https://github.com/danielgatis/rembg)). Se descarcă cu `npm run download-u2netp` (inclus la `npm run build` pe Vercel).
- Runtime WASM: `onnxruntime-web` de pe CDN (jsDelivr), inferență 100% în client.
- **Nu** folosim flood-fill pe alb (mănâncă ambalajele albe tip Sensodyne / Lenor). La eșec apare un mesaj în panou.
- Opțional pe VPS: `npm run download-u2net` + `POST /api/remove-bg` (u2net full ~176 MB, Node). Panoul implicit folosește browserul.

### Vercel

- Decuparea **merge pe Vercel**: modelul e asset static + inferență în client.
- Primul upload cu tăiere poate dura câteva secunde (download model + WASM).
- Pe telefoane slabe poate fi mai lent; pe laptop e ok pentru demo / magazin.

## Publicare pe Vercel

Pliantul nu are nevoie de variabile de mediu și nici de bază de date. `npm run build` descarcă automat `u2netp.onnx` dacă lipsește.

1. Urci proiectul pe GitHub (în terminal, din folderul proiectului):

```bash
git init
git add .
git commit -m "Daniofan MVP - Next.js"
git branch -M main
git remote add origin https://github.com/UTILIZATORUL-TAU/daniofan-next.git
git push -u origin main
```

(Repository-ul îl creezi întâi pe github.com → New repository, gol, fără README.)

2. Pe [vercel.com](https://vercel.com) → **Add New… → Project** → alegi repository-ul `daniofan-next` → **Import**. Vercel recunoaște singur Next.js. Apeși **Deploy**.
3. După un minut primești adresa publică (ex. `daniofan-next.vercel.app`). Pliantul e la `/`, panoul la `/admin`.

La fiecare `git push` pe `main`, Vercel publică automat noua versiune.

> Pe adresa publică, linkurile de WhatsApp și codul QR folosesc automat adresa site-ului (ex. `https://daniofan-next.vercel.app/`). Local (`localhost`) folosesc adresa planificată `https://oferte.daniofan.ro`, care se schimbă din panou, secțiunea 4. La fel ca în prototipul static.

## Previzualizare share (Open Graph) pe Facebook / WhatsApp

Când cineva dă share la linkul site-ului, Facebook și WhatsApp citesc tag-urile Open Graph din HTML — **nu** pot vedea canvas-ul din browser sau `localStorage`. Imaginea de „momeală” trebuie urcată pe server (Vercel Blob).

### Variabile de mediu

Copiați `.env.example` → `.env.local` (local) și setați aceleași valori în Vercel → Project → Settings → Environment Variables:

| Variabilă | Rol |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL public fără slash final (ex. `https://daniofan-next.vercel.app`) — `metadataBase` + linkuri OG |
| `ADMIN_SECRET` | Secret pentru `POST /api/og-image` (header `Authorization: Bearer …`) |
| `NEXT_PUBLIC_ADMIN_SECRET` | **Aceeași valoare** ca `ADMIN_SECRET` — o trimite butonul din `/admin` |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob (read/write) |

### Conectare Vercel Blob

1. Pe [vercel.com](https://vercel.com) → proiectul → **Storage** → **Create** → **Blob**.
2. Conectați store-ul la proiect; Vercel poate scrie automat `BLOB_READ_WRITE_TOKEN` în env.
3. Redeploy după ce apar variabilele.
4. În `/admin` → secțiunea 3 → **Publică imaginea pentru share** (generează 1080×1080 cu produsele din ofertă, urcă `og/current.png` + `og/meta.json`).

Dacă nu e publicată nicio imagine, se folosește `/og-default.png`.

### Reîmprospătare previzualizare Facebook

Facebook cache-uiește agresiv imaginea OG:

1. Deschideți [Sharing Debugger](https://developers.facebook.com/tools/debug/).
2. Puneți URL-ul site-ului (`NEXT_PUBLIC_SITE_URL`).
3. Apăsați **Scrape Again** (de 1–2 ori dacă tot apare poza veche).

URL-ul imaginii are `?v=<timestamp>` ca să forțeze o adresă nouă la fiecare publicare.

> Cu `cacheComponents` (Next 16), pagina nu exportă `revalidate = 0`; în schimb `generateMetadata` apelează `connection()` ca metadata OG să se rezolve la fiecare request.

### Verificare locală a tag-urilor OG

```bash
# cu npm run dev sau npm start
curl -sS http://localhost:3000/ | grep -E 'og:|twitter:'
```

Ar trebui să vedeți `og:image`, `og:title`, `twitter:card` etc. Fără Blob token, `og:image` pointează la `/og-default.png`.

## Scenariu de demo (2 minute)

1. Pe telefonul lui: pliantul (`/`). „Așa vede clientul: aceleași culori, dar cu preț mare, reducere calculată, buton de sunat și de WhatsApp.”
2. Pe laptop: panoul (`/admin`) în stânga, pliantul în dreapta. Schimbi prețul la Ursus: pliantul se actualizează pe loc, iar imaginea de Facebook se reface singură.
3. Apeși „Descarcă PNG”: „Asta e postarea de vineri. Ați scris 5 rânduri, sistemul a făcut poza.”
4. Pui „Valabil până la” pe o dată trecută: produsul dispare singur din pliant.
5. Arăți QR-ul și statisticile („ce produse se uită oamenii cel mai mult”).

## Structură

```
app/
  (client)/layout.tsx, page.tsx       pliantul (/); page.tsx = generateMetadata OG
  (admin)/admin/layout.tsx, page.tsx  panoul angajaților (/admin), fostul admin.html (<body class="admin">)
components/
  flyer/Flyer.tsx, ProductCard.tsx    pliantul: countdown, carduri, WhatsApp, bara de jos, sincronizare între taburi
  admin/AdminPanel.tsx                panoul: oferta, produsele, imaginile Facebook, QR + afiș A5, statistici
  admin/ProductRow.tsx, Stats.tsx
  icons.tsx                           iconițele SVG
lib/
  store.ts                            date, calcule (reduceri, statusuri, date automate, countdown), localStorage, statistici
  social.ts                           generatorul de imagini Facebook pe <canvas> (+ format og 1200×630)
  og-meta.ts                          citește og/meta.json din Vercel Blob
  image.ts                            micșorarea pozelor + decupare fundal (browser u2netp)
  remove-bg-browser.ts                U-2-Net u2netp + onnxruntime-web (client)
  qr.ts                               codul QR (qrcode-generator, MIT)
  types.ts                            tipurile datelor (OfferData, Product, ...)
app/api/og-image/route.ts             POST: publică PNG OG pe Vercel Blob
app/api/remove-bg/route.ts            opțional: U-2-Net full pe Node/VPS
public/og-default.png                 fallback Open Graph dacă nu e nimic publicat
public/models/u2netp.onnx             model browser (~5 MB; npm run download-u2netp)
models/u2net/                         opțional: u2net.onnx full (npm run download-u2net)
scripts/download-u2netp.mjs           descarcă u2netp pentru Vercel/browser
scripts/download-u2net.mjs            descarcă u2net full pentru API Node
LICENSE-U2NET.md                      Apache-2.0 + atribuire Xuebin Qin / U-2-Net
data/
  offer.json                          oferta implicită (cele 5 beri din pliantul lor)
  offer.ts                            încarcă oferta implicită (aici se poate lega mai târziu o bază de date sau un import CSV din SAP)
styles/   fonts.css, flyer.css, admin.css (CSS-ul original, neschimbat; doar căile fonturilor sunt /fonts/...)
public/
  fonts/              Barlow + Barlow Condensed (SIL Open Font License)
  img/products/       cele 5 poze decupate (PNG transparent); webp/ = aceleași poze folosite de panou și de imaginile Facebook
docs/comparison/      capturi comparative: prototipul static vs. Next.js
```

## Date

- `data/offer.json`: oferta implicită. O modifici și pagina se actualizează (în `npm run dev`, imediat).
- `"autoDates": true` face ca oferta demo să fie mereu „weekendul curent” (vineri–duminică), ca prototipul să fie live în ziua întâlnirii. Din panou poți pune date fixe.
- Telefonul magazinului (`+40700000000`) și programul sunt **placeholder**, de completat în `data/offer.json` → `store`.
- Adresa publică (`https://oferte.daniofan.ro`) e doar planificată pentru demo: QR-ul și linkurile de WhatsApp o folosesc când rulezi local. Se schimbă din panou, secțiunea 4.
- Pozele produselor (`public/img/products/*.png`) sunt decupate din pliantul lor de Facebook, doar pentru demo intern.
- Pentru o sursă reală de date (bază de date, export CSV din SAP): se înlocuiește `loadDefaultOffer()` din `data/offer.ts`, care întoarce aceeași formă (`OfferData` din `lib/types.ts`).

## Limitări cunoscute (e prototip)

- Fără backend: datele sunt per browser (`localStorage`), fără conturi, fără sincronizare între dispozitive. În versiunea reală: bază de date + login pentru angajați.
- Statisticile sunt simulate (marcate „DATE DEMO”), plus click-urile locale.
- Decuparea fundalului folosește U-2-Net u2netp în browser (Apache-2.0, comercial OK); merge pe Vercel.
- Linkul de WhatsApp duce la o adresă încă nepublicată (`oferte.daniofan.ro`) când rulezi local.

## Diferențe față de prototipul static

Aspectul e identic la pixel (vezi `docs/comparison/`). Câteva lucruri mici se comportă puțin diferit, intenționat:

- **Ofertele care expiră cât timp pagina e deschisă dispar singure.** În original, verificarea de la 20 de secunde compara lista cu ea însăși și nu reîmprospăta niciodată pagina. Acum o face, cum era gândit.
- **Statisticile din panou se actualizează imediat** când adaugi, redenumești sau ștergi un produs. În original se actualizau abia la revenirea în fereastră.
- Fără `index.html` / `admin.html`: adresele sunt `/` și `/admin`. Datele implicite vin din `data/offer.json` inclus în aplicație, nu dintr-un `fetch()`, iar `data/offer.js`, `data/images-embedded.js` și `tools/json-to-js.py` nu mai sunt necesare (erau doar pentru deschiderea din `file://`).
- În `npm run dev`, bulina Next.js din colțul ecranului e dezactivată (`devIndicators: false`), ca să nu acopere bara de jos. Erorile apar în continuare.
