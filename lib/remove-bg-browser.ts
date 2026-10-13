/**
 * Eliminare fundal în browser cu U-2-Net portable (u2netp.onnx) + onnxruntime-web (CDN).
 * Apache-2.0 — vezi LICENSE-U2NET.md. Merge pe Vercel (fără API Node).
 *
 * ORT se încarcă de pe CDN ca să evităm problemele de bundling Turbopack/webpack.
 * Create/run sunt serializate (altfel: „Session already started”).
 */

const MODEL_URL = '/models/u2netp.onnx';
const INPUT_SIZE = 320;
const MEAN = [0.485, 0.456, 0.406] as const;
const STD = [0.229, 0.224, 0.225] as const;
const ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort.wasm.min.mjs';

type OrtModule = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown;
  InferenceSession: {
    create: (
      buf: ArrayBuffer,
      opts?: { executionProviders?: string[] },
    ) => Promise<{
      inputNames: string[];
      outputNames: string[];
      run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array }>>;
    }>;
  };
};

type OrtSession = Awaited<ReturnType<OrtModule['InferenceSession']['create']>>;

let ortModule: OrtModule | null = null;
let session: OrtSession | null = null;
let ortChain: Promise<unknown> = Promise.resolve();

function enqueueOrt<T>(fn: () => Promise<T>): Promise<T> {
  const next = ortChain.then(fn, fn);
  ortChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function getOrt(): Promise<OrtModule> {
  if (ortModule) return ortModule;
  const mod = (await import(/* webpackIgnore: true */ ORT_CDN)) as unknown as OrtModule;
  mod.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
  mod.env.wasm.numThreads = 1;
  ortModule = mod;
  return mod;
}

async function ensureSession(): Promise<OrtSession> {
  if (session) return session;
  const ort = await getOrt();
  const res = await fetch(MODEL_URL);
  if (!res.ok) {
    throw new Error(
      `Modelul u2netp lipsește (${res.status}). Rulează: npm run download-u2netp (sau npm run build).`,
    );
  }
  const buf = await res.arrayBuffer();
  session = await ort.InferenceSession.create(buf, {
    executionProviders: ['wasm'],
  });
  return session;
}

function drawScaled(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): ImageData {
  const c = document.createElement('canvas');
  c.width = dw;
  c.height = dh;
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0, sw, sh, 0, 0, dw, dh);
  return ctx.getImageData(0, 0, dw, dh);
}

function imageDataToTensor(ort: OrtModule, id: ImageData): unknown {
  const { data, width, height } = id;
  let maxV = 1e-6;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > maxV) maxV = data[i];
    if (data[i + 1] > maxV) maxV = data[i + 1];
    if (data[i + 2] > maxV) maxV = data[i + 2];
  }

  const plane = width * height;
  const float32 = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const o = i * 4;
    const r = data[o] / maxV;
    const g = data[o + 1] / maxV;
    const b = data[o + 2] / maxV;
    float32[i] = (r - MEAN[0]) / STD[0];
    float32[plane + i] = (g - MEAN[1]) / STD[1];
    float32[2 * plane + i] = (b - MEAN[2]) / STD[2];
  }
  return new ort.Tensor('float32', float32, [1, 3, height, width]);
}

function maskToImageData(mask: Float32Array, size: number): ImageData {
  let mi = Infinity;
  let ma = -Infinity;
  const plane = size * size;
  const offset = Math.max(0, mask.length - plane);
  for (let i = 0; i < plane; i++) {
    const v = mask[offset + i];
    if (v < mi) mi = v;
    if (v > ma) ma = v;
  }
  const range = ma - mi || 1;
  const out = new ImageData(size, size);
  for (let i = 0; i < plane; i++) {
    const a = Math.round(Math.min(1, Math.max(0, (mask[offset + i] - mi) / range)) * 255);
    const o = i * 4;
    out.data[o] = 255;
    out.data[o + 1] = 255;
    out.data[o + 2] = 255;
    out.data[o + 3] = a;
  }
  return out;
}

function applyMask(rgba: ImageData, maskCanvas: HTMLCanvasElement): ImageData {
  const w = rgba.width;
  const h = rgba.height;
  const mctx = maskCanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const mask = mctx.getImageData(0, 0, w, h);
  const out = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    out.data[o] = rgba.data[o];
    out.data[o + 1] = rgba.data[o + 1];
    out.data[o + 2] = rgba.data[o + 2];
    out.data[o + 3] = mask.data[o + 3];
  }
  return out;
}

function imageDataToPngBlob(id: ImageData): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = id.width;
  c.height = id.height;
  (c.getContext('2d') as CanvasRenderingContext2D).putImageData(id, 0, 0);
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob a eșuat'))), 'image/png');
  });
}

/**
 * Elimină fundalul dintr-un canvas (deja redimensionat). Returnează PNG cu alpha.
 */
export async function removeBackgroundBrowser(
  source: HTMLCanvasElement,
): Promise<Blob> {
  const w = source.width;
  const h = source.height;
  if (!w || !h) throw new Error('Canvas gol');

  const origCtx = source.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const origRgba = origCtx.getImageData(0, 0, w, h);
  const scaled = drawScaled(source, w, h, INPUT_SIZE, INPUT_SIZE);

  return enqueueOrt(async () => {
    const ort = await getOrt();
    const sess = await ensureSession();
    const tensor = imageDataToTensor(ort, scaled);
    const inputName = sess.inputNames[0];
    const results = await sess.run({ [inputName]: tensor });
    const output = results[sess.outputNames[0]];
    const maskData = output.data as Float32Array;

    const maskId = maskToImageData(maskData, INPUT_SIZE);
    const maskSmall = document.createElement('canvas');
    maskSmall.width = INPUT_SIZE;
    maskSmall.height = INPUT_SIZE;
    (maskSmall.getContext('2d') as CanvasRenderingContext2D).putImageData(maskId, 0, 0);

    const maskFull = document.createElement('canvas');
    maskFull.width = w;
    maskFull.height = h;
    const mctx = maskFull.getContext('2d') as CanvasRenderingContext2D;
    mctx.imageSmoothingEnabled = true;
    mctx.imageSmoothingQuality = 'high';
    mctx.drawImage(maskSmall, 0, 0, w, h);

    const cut = applyMask(origRgba, maskFull);
    return imageDataToPngBlob(cut);
  });
}
