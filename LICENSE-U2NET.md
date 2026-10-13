# Licență U-2-Net (Apache-2.0)

Acest proiect folosește modelul **U-2-Net** pentru eliminarea fundalului la pozele încărcate în panoul admin.

## Atribuire

- Lucrare originală: **Xuebin Qin et al.** — [U-2-Net](https://github.com/xuebinqin/U-2-Net)
- Articol: *U<sup>2</sup>-Net: Going Deeper with Nested U-Structure for Salient Object Detection* (Pattern Recognition, 2020)
- Licență: **Apache License 2.0** — potrivită pentru produs comercial (inclusiv Daniofan), cu păstrarea atribuirii și a textului licenței.

## Greutăți ONNX din proiect

- Fișier: `models/u2net/u2net.onnx`
- Convertire / distribuție ONNX folosită aici: ecosistemul [rembg](https://github.com/danielgatis/rembg)
  (`https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx`)
- Weights-urile provin din U-2-Net (Apache-2.0). Trebuie păstrată atribuirea către autori.

Textul complet al Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0

## Descărcare locală

```bash
npm run download-u2net
```

Nu redistribuim greutățile în git (~176 MB). Descarcă-le pe mașina de dezvoltare / serverul Node.
