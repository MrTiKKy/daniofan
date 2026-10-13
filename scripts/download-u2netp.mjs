#!/usr/bin/env node
/**
 * Descarcă u2netp.onnx (rembg / U-2-Net portable, Apache-2.0) în public/models/.
 * Model ușor (~4.7 MB) pentru inferență în browser pe Vercel.
 * Vezi LICENSE-U2NET.md.
 */
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'models');
const OUT_FILE = join(OUT_DIR, 'u2netp.onnx');
const TMP_FILE = OUT_FILE + '.partial';

const URL =
  'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx';
/** md5 din rembg/sessions/u2netp.py */
const EXPECTED_MD5 = '8e83ca70e441ab06c318d82300c84806';

/** ~4.7 MB */
const MIN_BYTES = 4 * 1024 * 1024;
const MAX_ATTEMPTS = 5;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fmtMb(n) {
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

function md5File(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex');
}

async function downloadOnce() {
  mkdirSync(OUT_DIR, { recursive: true });
  if (existsSync(TMP_FILE)) {
    try { unlinkSync(TMP_FILE); } catch { /* ignore */ }
  }

  const res = await fetch(URL, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const total = Number(res.headers.get('content-length') || 0);
  let received = 0;
  let lastLog = 0;

  const src = Readable.fromWeb(res.body);
  src.on('data', (chunk) => {
    received += chunk.length;
    const now = Date.now();
    if (now - lastLog > 1500) {
      lastLog = now;
      const pct = total ? ` (${Math.round((100 * received) / total)}%)` : '';
      console.log(`  … ${fmtMb(received)}${pct}`);
    }
  });

  await pipeline(src, createWriteStream(TMP_FILE));

  const size = statSync(TMP_FILE).size;
  if (size < MIN_BYTES) {
    unlinkSync(TMP_FILE);
    throw new Error(`Fișier prea mic (${fmtMb(size)}); așteptat ≥ ${fmtMb(MIN_BYTES)}`);
  }

  const hash = md5File(TMP_FILE);
  if (hash !== EXPECTED_MD5) {
    unlinkSync(TMP_FILE);
    throw new Error(`MD5 neașteptat: ${hash} (așteptat ${EXPECTED_MD5})`);
  }

  renameSync(TMP_FILE, OUT_FILE);
  console.log(`OK: ${OUT_FILE} (${fmtMb(size)}, md5 ${hash})`);
}

async function main() {
  if (existsSync(OUT_FILE)) {
    const size = statSync(OUT_FILE).size;
    if (size >= MIN_BYTES) {
      const hash = md5File(OUT_FILE);
      if (hash === EXPECTED_MD5) {
        console.log(`Model deja prezent: ${OUT_FILE} (${fmtMb(size)})`);
        return;
      }
      console.warn(`MD5 nepotrivit (${hash}); re-descarc…`);
    } else {
      console.warn(`Model existent e prea mic (${fmtMb(size)}); re-descarc…`);
    }
    unlinkSync(OUT_FILE);
  }

  console.log('Descarc u2netp.onnx (~4.7 MB) pentru browser…');
  console.log('Sursă:', URL);

  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await downloadOnce();
      return;
    } catch (err) {
      lastErr = err;
      console.warn(`Încercarea ${attempt}/${MAX_ATTEMPTS} a eșuat:`, err?.message || err);
      if (attempt < MAX_ATTEMPTS) {
        const wait = Math.min(30_000, 1000 * 2 ** (attempt - 1));
        console.log(`Reîncerc în ${wait / 1000}s…`);
        await sleep(wait);
      }
    }
  }
  console.error('Nu am putut descărca modelul:', lastErr?.message || lastErr);
  process.exit(1);
}

main();
