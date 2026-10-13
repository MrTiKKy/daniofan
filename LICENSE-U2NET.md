# Licență U-2-Net (Apache-2.0)

Acest proiect folosește familia **U-2-Net** pentru eliminarea fundalului la pozele încărcate în panoul admin.

## Atribuire

- Lucrare originală: **Xuebin Qin et al.** — [U-2-Net](https://github.com/xuebinqin/U-2-Net)
- Articol: *U²-Net: Going Deeper with Nested U-Structure for Salient Object Detection* (Pattern Recognition, 2020)
- Licență: **Apache License 2.0** — potrivită pentru produs comercial (inclusiv Daniofan), cu păstrarea atribuirii.

## Greutăți din proiect

### Browser / Vercel (implicit)

- Fișier: `public/models/u2netp.onnx` (~4.7 MB)
- Variantă **u2netp** (portable) — inferență în browser cu `onnxruntime-web`
- Distribuție ONNX: [rembg](https://github.com/danielgatis/rembg)  
  `https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx`
- Descărcare: `npm run download-u2netp` (rulată și la `npm run build`)

### Server local / VPS (opțional)

- Fișier: `models/u2net/u2net.onnx` (~176 MB)
- Variantă **u2net** full — API `POST /api/remove-bg` (onnxruntime-node)
- Descărcare: `npm run download-u2net`

Weights-urile provin din U-2-Net (Apache-2.0). Trebuie păstrată atribuirea către autori.

Textul complet al Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0
