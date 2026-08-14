// Bounding box de los píxeles no transparentes de una imagen — función pura
// sobre ImageData, sin dependencias de React ni del DOM más allá del tipo.
//
// Por qué existe: escalar una prenda por categoría (CATEGORY_SCALE en
// styleJournalLayout.ts) asume que el PNG está "lleno" del objeto real. En
// la práctica no lo está — measured sobre las 62 prendas reales de Juan, el
// 53% tiene más de 20% de margen transparente alrededor del objeto (footwear
// es lo peor: varios tenis fotografiados en ángulo dejan 3/4 del lienzo
// vacío). Sin recortar a este bbox antes de posicionar, CATEGORY_SCALE no
// puede funcionar: el tamaño final depende del padding del archivo, no del
// objeto.
//
// Reusada tal cual desde useAlphaCroppedImage.ts (pantalla) y desde
// composeStyleJournalImage.ts (export a Canvas, Fase 4) — mismo criterio en
// los dos lugares, pantalla y export nunca se desincronizan.

export type AlphaRect = { x0: number; y0: number; x1: number; y1: number };

/**
 * Escanea el canal alfa y devuelve el rectángulo [x0,y0,x1,y1] (inclusive,
 * en píxeles de `imageData`) que contiene todos los píxeles con alfa >=
 * `threshold`. `null` si la imagen es completamente transparente.
 *
 * Mismo umbral que `finalizeGeminiImageOutput` (imageBackgroundRemoval.ts)
 * usa para medir `backgroundRemoved` — un solo criterio de "qué cuenta como
 * transparente" en todo el pipeline de imagen.
 */
export function computeAlphaBBox(imageData: ImageData, threshold = 16): AlphaRect | null {
  const { data, width, height } = imageData;
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const alpha = data[rowOffset + x * 4 + 3];
      if (alpha >= threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }

  if (x1 < 0) return null;
  return { x0, y0, x1, y1 };
}

// Lado mayor del canvas usado SOLO para calcular el bbox — barato a
// propósito, la precisión de unos pocos px no importa porque se le suma
// padding igual.
const SCAN_MAX_SIDE = 160;
const CROP_PADDING_FRACTION = 0.04;

/**
 * Recorta una `HTMLImageElement` ya cargada a su bbox alfa, a resolución
 * completa (el escaneo del bbox es barato/chico, pero el recorte final usa
 * los píxeles originales). Devuelve `null` si la imagen es completamente
 * transparente o si el bbox ya ocupa casi toda la imagen (no vale la pena
 * el recorte).
 *
 * Compartida por `useAlphaCroppedImage.ts` (pantalla, la envuelve en un
 * blob URL) y `composeStyleJournalImage.ts` (export a Canvas, la dibuja
 * directo) — mismo criterio en los dos lugares, pantalla y export nunca se
 * desincronizan.
 */
export function cropImageToAlphaBBoxCanvas(
  img: HTMLImageElement,
  threshold = 16
): HTMLCanvasElement | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w === 0 || h === 0) return null;

  const scale = Math.min(1, SCAN_MAX_SIDE / Math.max(w, h));
  const scanW = Math.max(1, Math.round(w * scale));
  const scanH = Math.max(1, Math.round(h * scale));
  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = scanW;
  scanCanvas.height = scanH;
  const scanCtx = scanCanvas.getContext("2d");
  if (!scanCtx) return null;
  scanCtx.drawImage(img, 0, 0, scanW, scanH);

  const bbox = computeAlphaBBox(scanCtx.getImageData(0, 0, scanW, scanH), threshold);
  if (!bbox) return null;

  const fx0 = Math.max(0, bbox.x0 / scanW - CROP_PADDING_FRACTION);
  const fy0 = Math.max(0, bbox.y0 / scanH - CROP_PADDING_FRACTION);
  const fx1 = Math.min(1, (bbox.x1 + 1) / scanW + CROP_PADDING_FRACTION);
  const fy1 = Math.min(1, (bbox.y1 + 1) / scanH + CROP_PADDING_FRACTION);

  const sx = Math.round(fx0 * w);
  const sy = Math.round(fy0 * h);
  const sw = Math.max(1, Math.round((fx1 - fx0) * w));
  const sh = Math.max(1, Math.round((fy1 - fy0) * h));

  if (sw >= w * 0.98 && sh >= h * 0.98) return null;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = sw;
  outCanvas.height = sh;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) return null;
  outCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return outCanvas;
}
