import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';

/**
 * cacheComponents: true (next.config) — `export const runtime` / `maxDuration`
 * pot fi respinse de segment config. Ruta rulează oricum pe Node (onnxruntime-node).
 * Dacă Next nu blochează, poți decomentă:
 *   export const runtime = 'nodejs';
 *   export const maxDuration = 60;
 */
// export const runtime = 'nodejs';
// export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
/** U-2-Net / rembg: input 320×320 */
const INPUT_SIZE = 320;
/** ImageNet — ca în rembg BaseSession.normalize */
const MEAN = [0.485, 0.456, 0.406] as const;
const STD = [0.229, 0.224, 0.225] as const;

const MODEL_PATH = join(process.cwd(), 'models', 'u2net', 'u2net.onnx');

let sessionPromise: Promise<ort.InferenceSession> | null = null;

function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    if (!existsSync(MODEL_PATH)) {
      return Promise.reject(
        new Error('Model U-2-Net lipsește. Rulează: npm run download-u2net'),
      );
    }
    sessionPromise = ort.InferenceSession.create(MODEL_PATH);
  }
  return sessionPromise;
}

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

async function readInputBuffer(req: Request): Promise<Buffer> {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file =
      form.get('file') ?? form.get('image') ?? form.get('photo');
    if (!file || typeof file === 'string') {
      throw new Error('Lipsește fișierul (câmp file / image)');
    }
    const ab = await (file as File).arrayBuffer();
    return Buffer.from(ab);
  }

  if (contentType.includes('application/json')) {
    const body = (await req.json()) as { image?: string };
    if (!body?.image || typeof body.image !== 'string') {
      throw new Error('JSON așteptat: { image: dataURI }');
    }
    const m = /^data:[^;]+;base64,([\s\S]+)$/.exec(body.image);
    if (!m) throw new Error('dataURI invalid (așteptat data:...;base64,...)');
    return Buffer.from(m[1], 'base64');
  }

  const ab = await req.arrayBuffer();
  return Buffer.from(ab);
}

/**
 * Preprocesare ca rembg U2netSession:
 * resize 320×320, /max(pixel), (x - ImageNet mean) / std, NCHW float32.
 */
async function preprocess(buf: Buffer): Promise<{
  tensor: ort.Tensor;
  width: number;
  height: number;
  rgba: Buffer;
}> {
  const { data: rgba, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  if (!width || !height) throw new Error('Imagine invalidă');

  const resized = await sharp(buf)
    .removeAlpha()
    .resize(INPUT_SIZE, INPUT_SIZE, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .raw()
    .toBuffer();

  let maxV = 1e-6;
  for (let i = 0; i < resized.length; i++) {
    if (resized[i] > maxV) maxV = resized[i];
  }

  const plane = INPUT_SIZE * INPUT_SIZE;
  const float32 = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const r = resized[i * 3] / maxV;
    const g = resized[i * 3 + 1] / maxV;
    const b = resized[i * 3 + 2] / maxV;
    float32[i] = (r - MEAN[0]) / STD[0];
    float32[plane + i] = (g - MEAN[1]) / STD[1];
    float32[2 * plane + i] = (b - MEAN[2]) / STD[2];
  }

  const tensor = new ort.Tensor('float32', float32, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  return { tensor, width, height, rgba: Buffer.from(rgba) };
}

/** Min-max pe mască (canal 0), scale la dimensiunea originală, canal alpha. */
async function postprocess(
  maskTensor: ort.Tensor,
  width: number,
  height: number,
  rgba: Buffer,
): Promise<Buffer> {
  const dims = maskTensor.dims;
  const data = maskTensor.data as Float32Array;
  // rembg: ort_outs[0][:, 0, :, :] — tipic [1,1,320,320] sau [1,N,320,320]
  const plane = INPUT_SIZE * INPUT_SIZE;
  let offset = 0;
  if (dims.length === 4 && Number(dims[1]) > 1) {
    // ia primul canal de saliency
    offset = 0;
  } else if (data.length > plane) {
    offset = 0;
  }

  let mi = Infinity;
  let ma = -Infinity;
  for (let i = 0; i < plane; i++) {
    const v = data[offset + i];
    if (v < mi) mi = v;
    if (v > ma) ma = v;
  }
  const range = ma - mi || 1;
  const maskU8 = Buffer.alloc(plane);
  for (let i = 0; i < plane; i++) {
    const t = (data[offset + i] - mi) / range;
    maskU8[i] = Math.round(Math.min(1, Math.max(0, t)) * 255);
  }

  // sharp poate promova raw 1-canal la RGB — forțăm greyscale
  const { data: maskResized, info: maskInfo } = await sharp(maskU8, {
    raw: { width: INPUT_SIZE, height: INPUT_SIZE, channels: 1 },
  })
    .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (maskInfo.channels !== 1 || maskResized.length !== width * height) {
    throw new Error(
      `Masca redimensionată invalidă: ${maskInfo.width}x${maskInfo.height}x${maskInfo.channels} (len ${maskResized.length})`,
    );
  }

  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    out[i * 4] = rgba[i * 4];
    out[i * 4 + 1] = rgba[i * 4 + 1];
    out[i * 4 + 2] = rgba[i * 4 + 2];
    out[i * 4 + 3] = maskResized[i];
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function removeBackground(buf: Buffer): Promise<Buffer> {
  const session = await getSession();
  const { tensor, width, height, rgba } = await preprocess(buf);
  const inputName = session.inputNames[0];
  const results = await session.run({ [inputName]: tensor });
  const outputName = session.outputNames[0];
  return postprocess(results[outputName], width, height, rgba);
}

export async function POST(req: Request) {
  try {
    const buf = await readInputBuffer(req);
    if (!buf.length) return jsonError('Imagine goală');
    if (buf.byteLength > MAX_BYTES) {
      return jsonError(`Imaginea depășește ${MAX_BYTES / (1024 * 1024)} MB`, 413);
    }

    const png = await removeBackground(buf);
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[remove-bg]', message);
    const status = /lipsește|Model U-2-Net/i.test(message) ? 503 : 500;
    return jsonError(message, status);
  }
}
