// Post-procesado local (sharp) de las imágenes que devuelve Gemini para
// dejarlas con fondo transparente. NO es un "use server" — es una utilidad
// pura que consumen los server actions de reconstrucción y remoción de fondo.
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

import sharp from "sharp";

const WHITE_THRESHOLD = 235; // por debajo de esto (más lejos de blanco): opaco
const WHITE_FEATHER = 250; // entre threshold y feather: alpha gradual (bordes suaves)

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

/** Recorta a transparente todo lo que esté cerca del blanco puro, con borde suave. */
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
 * PNG con fondo transparente: passthrough si ya trae alpha real, si no
 * remueve el fondo blanco localmente. Nunca lanza — `null` si algo falla
 * (el caller decide el fallback).
 */
export async function finalizeGeminiImageOutput(args: {
  base64: string;
  mimeType: string;
}): Promise<{ base64: string; contentType: "image/png" } | null> {
  try {
    const buffer = Buffer.from(args.base64, "base64");

    const alreadyTransparent = await hasRealAlphaTransparency(buffer);
    const finalBuffer = alreadyTransparent
      ? await sharp(buffer).png().toBuffer()
      : await removeWhiteBackgroundLocally(buffer);

    return { base64: finalBuffer.toString("base64"), contentType: "image/png" };
  } catch (err) {
    console.error("[imageBackgroundRemoval] error post-procesando imagen de Gemini:", err);
    return null;
  }
}
