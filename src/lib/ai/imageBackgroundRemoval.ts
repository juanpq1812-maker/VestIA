// Post-procesado local de las imágenes que devuelve Gemini para dejarlas con
// fondo transparente. NO es un "use server" — es una utilidad pura que
// consumen los server actions de reconstrucción y remoción de fondo.
//
// DECISIÓN BASADA EN EVIDENCIA (ver sesión de implementación): se probó
// pedirle a gemini-3.1-flash-lite-image un fondo transparente directamente.
// El modelo SIEMPRE devuelve JPEG (nunca PNG con alpha real — JPEG no puede
// tener canal alfa por formato) y lo que "parece" transparencia es un patrón
// de tablero de ajedrez pintado en los píxeles, no transparencia real. Por
// eso los prompts de Gemini piden fondo BLANCO puro (ruta probada confiable)
// y esta función hace la remoción de fondo localmente — sin gastar una
// segunda llamada a Gemini. El chequeo de "¿ya vino con alpha real?" se deja
// como red de seguridad barata por si Google cambia el comportamiento del
// modelo en el futuro.
//
// MÉTODO DE REMOCIÓN (revisado — ver sesión de investigación de viabilidad):
// el método original recortaba a transparente todo lo "cerca del blanco" por
// threshold de color (removeWhiteBackgroundLocally, más abajo). Fallaba
// cuando Gemini devolvía el fondo en crema/gris en vez de blanco puro:
// quedaban rectángulos de fondo pegados y ganchos visibles en outfits reales.
// Ahora el método primario es @imgly/background-removal-node, que segmenta
// por CONTENIDO (silueta de la prenda), no por color — no le importa el tono
// exacto del fondo. El threshold por color queda como fallback si @imgly
// falla (nunca bloqueamos el guardado de una prenda por esto).
//
// El modelo ONNX ('small', ~42MB) NO viaja en el bundle de la función
// serverless — se sirve desde Supabase Storage (bucket público
// `imgly-models`) vía `publicPath`. Bundlearlo local reventaría el límite de
// 250MB de Vercel al sumarle los binarios nativos de onnxruntime-node. Ver
// `scripts/prune-imgly-assets.js` (poda los modelos y las plataformas nativas
// no usadas en cada `npm install`) y `next.config.ts`.
//
// Costo de la primera invocación en un contenedor frío: @imgly cachea el
// modelo en memoria del proceso, así que el PRIMER removeBackground() de un
// contenedor recién levantado paga la descarga completa del modelo
// (~10-16s medido contra Supabase Storage real). Invocaciones siguientes en
// el mismo contenedor (caso común con Fluid Compute) son casi tan rápidas
// como con el modelo ya en disco (~1.5s). Por esto las rutas que llaman esta
// función declaran `maxDuration = 60`.

import sharp from "sharp";

const WHITE_THRESHOLD = 235; // por debajo de esto (más lejos de blanco): opaco
const WHITE_FEATHER = 250; // entre threshold y feather: alpha gradual (bordes suaves)

// ---------------------------------------------------------------------------
// Limpieza del matte que devuelve @imgly.
//
// MEDIDO sobre una camiseta blanca fotografiada en una tienda (prenda clara
// sobre fondo claro, el caso peor): de 1.048.320 px, el 55,65% salía
// semi-transparente, con 500 clusters sueltos sumando 35.454 px de partículas.
// Y un dato que cambia el enfoque: @imgly NO devuelve NI UN píxel en alpha
// 255 — el cuerpo de la prenda vive en 225-254. Por eso un threshold que solo
// recorta lo translúcido no alcanza: hay que EMPUJAR el alfa alto a 255, o la
// prenda queda moteada (se veían agujeritos en la card del armario y peor en
// el moodboard).
//
// Tres pasos, en este orden:
//   1. Threshold con feather: alfa bajo → 0 (mata la bruma), alfa alto → 255
//      (solidifica la prenda), y el tramo intermedio se reescala para no
//      perder el antialiasing del borde.
//   2. Despeckle: se descartan los clusters visibles chicos y aislados.
//   3. Relleno de pinholes: los huecos internos que no tocan el borde de la
//      imagen se vuelven opacos. Es más preciso que un erode+dilate, que
//      taparía los huecos pero además deformaría la silueta.
// ---------------------------------------------------------------------------

const ALPHA_LOW = 40; // <= esto → transparente
const ALPHA_HIGH = 190; // >= esto → opaco
// Un cluster que no sea el principal se descarta si es menor a este ratio del
// principal. 5% se eligió midiendo: en la foto de tienda el blob de fondo que
// sobrevivía era el 4,36% del principal, y todo lo demás legítimo estaba muy
// por encima. OJO con subirlo: un par de zapatos son dos clusters de ~50% cada
// uno (ahí no hay riesgo), pero un cinturón o una tira separada de la prenda
// podrían caer en este rango y perderse.
const MIN_CLUSTER_RATIO = 0.05;
const MIN_CLUSTER_ABS_PX = 64; // …y siempre se descarta si es más chico que esto
const MAX_HOLE_PX = 4096; // huecos internos hasta este tamaño se rellenan

/**
 * Limpia un canal alfa in-place-ish (devuelve una copia nueva). Puro
 * typed-array: ~35ms para 1MP, despreciable al lado de los 16-23s de @imgly.
 */
function cleanAlphaMatte(
  alpha: Uint8Array,
  width: number,
  height: number
): { alpha: Uint8Array; clustersDropped: number; holesFilled: number } {
  const n = width * height;
  const a = new Uint8Array(alpha);

  // ── 1. Threshold con feather ────────────────────────────────────────────
  const span = ALPHA_HIGH - ALPHA_LOW;
  for (let i = 0; i < n; i++) {
    const v = a[i];
    if (v <= ALPHA_LOW) a[i] = 0;
    else if (v >= ALPHA_HIGH) a[i] = 255;
    else a[i] = Math.round((255 * (v - ALPHA_LOW)) / span);
  }

  // Flood fill iterativo con una pila explícita — nada de recursión, que en
  // una imagen de 1MP desbordaría el stack.
  const stack = new Int32Array(n);

  // ── 2. Despeckle ────────────────────────────────────────────────────────
  const labels = new Int32Array(n).fill(-1);
  const sizes: number[] = [];
  for (let start = 0; start < n; start++) {
    if (a[start] === 0 || labels[start] !== -1) continue;
    const id = sizes.length;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = id;
    let count = 0;
    while (sp > 0) {
      const p = stack[--sp];
      count++;
      const x = p % width;
      const y = (p - x) / width;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (a[q] !== 0 && labels[q] === -1) {
            labels[q] = id;
            stack[sp++] = q;
          }
        }
      }
    }
    sizes.push(count);
  }

  let largest = 0;
  for (const s of sizes) if (s > largest) largest = s;
  const minKeep = Math.max(MIN_CLUSTER_ABS_PX, Math.floor(largest * MIN_CLUSTER_RATIO));
  const dropCluster = new Uint8Array(sizes.length);
  let clustersDropped = 0;
  for (let c = 0; c < sizes.length; c++) {
    // El cluster principal se conserva SIEMPRE, pase lo que pase con los
    // umbrales: es la prenda.
    if (sizes[c] !== largest && sizes[c] < minKeep) {
      dropCluster[c] = 1;
      clustersDropped++;
    }
  }
  if (clustersDropped > 0) {
    for (let i = 0; i < n; i++) {
      const l = labels[i];
      if (l >= 0 && dropCluster[l]) a[i] = 0;
    }
  }

  // ── 3. Relleno de pinholes ──────────────────────────────────────────────
  // Se agrupa por "no del todo opaco" (< 255), no por "totalmente
  // transparente": las motas que quedan dentro de la prenda suelen estar en el
  // tramo del feather, no en 0, y con `=== 0` se escapaban. El anillo de
  // antialiasing del borde queda a salvo porque se conecta con el fondo, que
  // toca el borde de la imagen.
  const holeLabels = new Int32Array(n).fill(-1);
  const holeSizes: number[] = [];
  const holeTouchesBorder: boolean[] = [];
  for (let start = 0; start < n; start++) {
    if (a[start] === 255 || holeLabels[start] !== -1) continue;
    const id = holeSizes.length;
    let sp = 0;
    stack[sp++] = start;
    holeLabels[start] = id;
    let count = 0;
    let border = false;
    while (sp > 0) {
      const p = stack[--sp];
      count++;
      const x = p % width;
      const y = (p - x) / width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) border = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (a[q] !== 255 && holeLabels[q] === -1) {
            holeLabels[q] = id;
            stack[sp++] = q;
          }
        }
      }
    }
    holeSizes.push(count);
    holeTouchesBorder.push(border);
  }

  let holesFilled = 0;
  for (let h = 0; h < holeSizes.length; h++) {
    if (!holeTouchesBorder[h] && holeSizes[h] <= MAX_HOLE_PX) holesFilled++;
  }
  if (holesFilled > 0) {
    for (let i = 0; i < n; i++) {
      const l = holeLabels[i];
      if (l >= 0 && !holeTouchesBorder[l] && holeSizes[l] <= MAX_HOLE_PX) a[i] = 255;
    }
  }

  return { alpha: a, clustersDropped, holesFilled };
}

/**
 * Aplica cleanAlphaMatte sobre un PNG con alfa y devuelve el PNG limpio. Si
 * algo falla, devuelve el buffer original — una limpieza fallida nunca debe
 * costar la imagen entera.
 */
async function cleanMattePng(buffer: Buffer): Promise<Buffer> {
  try {
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const n = width * height;

    const alpha = new Uint8Array(n);
    for (let i = 0; i < n; i++) alpha[i] = data[i * channels + 3];

    const { alpha: cleaned, clustersDropped, holesFilled } = cleanAlphaMatte(
      alpha,
      width,
      height
    );
    for (let i = 0; i < n; i++) data[i * channels + 3] = cleaned[i];

    if (clustersDropped > 0 || holesFilled > 0) {
      console.log(
        `[imageBackgroundRemoval] matte limpiado: ${clustersDropped} clusters descartados, ${holesFilled} huecos rellenados`
      );
    }

    return await sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  } catch (err) {
    console.error("[imageBackgroundRemoval] falló la limpieza del matte:", err);
    return buffer;
  }
}

// Bucket público de Supabase Storage con SOLO el modelo 'small' de @imgly
// (resources.json podado + sus 11 chunks, ~42MB) — ver STORAGE_SETUP.md.
// Sin esta variable, saltamos directo al fallback de threshold (nunca
// intentamos leer el modelo del filesystem local: ahí no existe, lo podamos
// en cada install).
const IMGLY_MODEL_PUBLIC_PATH = process.env.IMGLY_MODEL_PUBLIC_PATH;

// Le damos a @imgly una porción generosa del maxDuration=60 de la función,
// dejando margen para la llamada a Gemini (hasta 30s, TIMEOUT_MS en
// geminiClient.ts) que ya corrió antes en el mismo request.
const IMGLY_TIMEOUT_MS = 25_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout después de ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

// Formatos que el decoder interno de @imgly reconoce (dist/index.cjs,
// imageDecode) — cualquier otro valor de mimeType cae en su
// "Unsupported format". El pipeline de Gemini siempre devuelve JPEG (ver
// nota al inicio del archivo), pero no confiamos ciegamente en el string que
// venga de la API.
const IMGLY_SUPPORTED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Segmentación por contenido con @imgly — no le importa el color del fondo
 * que Gemini haya devuelto (blanco, crema, gris). `null` si no está
 * configurado el modelo remoto o si algo falla (el caller cae al threshold).
 */
async function removeBackgroundWithImgly(
  buffer: Buffer,
  mimeType: string
): Promise<Buffer | null> {
  if (!IMGLY_MODEL_PUBLIC_PATH) return null;

  try {
    // import() dinámico, NO estático a nivel de módulo: @imgly carga
    // onnxruntime-node (su dependencia nativa) al evaluarse, y si ese
    // require nativo falla (binario faltante, arquitectura equivocada), el
    // fallo ocurre en tiempo de import — ANTES de que corra este try/catch.
    // Con import estático eso tumbaba la request entera con 500 en vez de
    // caer al fallback de threshold de color. Con import dinámico dentro
    // del try, un fallo de carga del nativo se captura acá igual que un
    // fallo de removeBackground().
    const { removeBackground } = await import("@imgly/background-removal-node");

    // @imgly internamente envuelve un Buffer/Uint8Array crudo en
    // `new Blob([image])` SIN mimeType — con `blob.type === ""` su decoder
    // interno no matchea ningún formato y tira "Unsupported format: "
    // (confirmado leyendo dist/index.cjs). Hay que pasarle el Blob ya
    // armado con el tipo explícito.
    const safeMimeType = IMGLY_SUPPORTED_MIME_TYPES.has(mimeType) ? mimeType : "image/jpeg";
    const inputBlob = new Blob([new Uint8Array(buffer)], { type: safeMimeType });
    const blob = await withTimeout(
      removeBackground(inputBlob, {
        model: "small",
        publicPath: IMGLY_MODEL_PUBLIC_PATH,
        // No hay campo `output.type` en el Config de esta versión instalada
        // (1.4.5) pese a que el README lo documenta — removeBackground()
        // siempre extrae foreground, es su único comportamiento soportado acá.
        output: { format: "image/png", quality: 0.9 },
      }),
      IMGLY_TIMEOUT_MS
    );
    const arrayBuffer = await blob.arrayBuffer();
    // La limpieza va acá y no en finalizeGeminiImageOutput: el residuo
    // (partículas sueltas, alfa moteado) lo produce la segmentación de @imgly.
    // El fallback por threshold de color ya sale binario y no lo necesita.
    return await cleanMattePng(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("[imageBackgroundRemoval] @imgly falló, cae al threshold de color:", err);
    return null;
  }
}

/** true si la imagen ya trae un canal alfa con valores realmente variables (no todo 255). */
async function hasRealAlphaTransparency(buffer: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.hasAlpha) return false;

    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { channels } = info;

    for (let i = 3; i < data.length; i += channels) {
      if (data[i] < 250) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Fallback: recorta a transparente todo lo que esté cerca del blanco puro,
 * con borde suave. Por color, no por contenido — falla si Gemini devolvió el
 * fondo en crema/gris en vez de blanco puro (por eso ya no es el método
 * primario, ver removeBackgroundWithImgly más arriba).
 */
async function removeWhiteBackgroundLocally(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const minChannel = Math.min(r, g, b);

    let alpha = 255;
    if (minChannel >= WHITE_FEATHER) {
      alpha = 0;
    } else if (minChannel >= WHITE_THRESHOLD) {
      alpha = Math.round(
        255 * (1 - (minChannel - WHITE_THRESHOLD) / (WHITE_FEATHER - WHITE_THRESHOLD))
      );
    }
    data[i + 3] = alpha;
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

/**
 * Toma la salida cruda de Gemini (base64 + mimeType) y devuelve siempre un
 * PNG con fondo transparente: passthrough si ya trae alpha real; si no,
 * segmentación por contenido con @imgly y, si esa falla o no está
 * configurada, threshold de color local. Nunca lanza — `null` solo si TODO
 * falla (el caller decide el fallback final: guardar con
 * background_removed=false, patrón existente).
 */
export async function finalizeGeminiImageOutput(args: {
  base64: string;
  mimeType: string;
}): Promise<{ base64: string; contentType: "image/png" } | null> {
  try {
    const buffer = Buffer.from(args.base64, "base64");

    const alreadyTransparent = await hasRealAlphaTransparency(buffer);
    if (alreadyTransparent) {
      const finalBuffer = await sharp(buffer).png().toBuffer();
      return { base64: finalBuffer.toString("base64"), contentType: "image/png" };
    }

    const imglyResult = await removeBackgroundWithImgly(buffer, args.mimeType);
    const finalBuffer = imglyResult ?? (await removeWhiteBackgroundLocally(buffer));

    return { base64: finalBuffer.toString("base64"), contentType: "image/png" };
  } catch (err) {
    console.error("[imageBackgroundRemoval] error post-procesando imagen de Gemini:", err);
    return null;
  }
}
