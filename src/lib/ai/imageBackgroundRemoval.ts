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
import { removeBackground } from "@imgly/background-removal-node";

const WHITE_THRESHOLD = 235; // por debajo de esto (más lejos de blanco): opaco
const WHITE_FEATHER = 250; // entre threshold y feather: alpha gradual (bordes suaves)

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
    return Buffer.from(arrayBuffer);
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
