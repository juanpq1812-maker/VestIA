// Heurística para decidir qué recortes de una foto de outfit llegan
// pre-desmarcados en el grid de confirmación (ver OutfitCropConfirm).
//
// POR QUÉ: los bounding boxes de Claude Vision son aproximados. Medido sobre
// una foto de estudio con fondo liso — el caso más fácil posible — el modelo
// por defecto (Haiku 4.5) devolvió las 4 boxes mal, todas con valores múltiplos
// de 5: la firma de un modelo estimando coordenadas plausibles en vez de
// localizar. En fotos reales con fondo (cielo, edificios, estatuas) eso produce
// recortes que no son ropa. Se cambió el modelo de detección (ver
// DEFAULT_DETECTION_MODEL) y se endureció el prompt, pero ninguna de las dos
// cosas es garantía: esta heurística es la última red antes del armario.
//
// La señal más útil para este caso es la VARIANZA DE COLOR: el cielo y una
// pared lisa son casi de un solo tono, mientras que una prenda real tiene
// textura, costuras, sombras y pliegues. Se combina con la confianza que
// reporta Vision y con la geometría del recorte.

/** Señales medidas sobre un recorte, para explicar por qué se marcó o no. */
export type CropSignals = {
  /** Desviación estándar media de los canales RGB (0-255). Bajo = superficie lisa. */
  colorStdDev: number;
  /** Área del recorte como fracción de la foto original (0-1). */
  areaRatio: number;
  /** ancho/alto. Muy lejos de 1 = tira alargada, rara para una prenda. */
  aspectRatio: number;
};

export type CropVerdict = {
  suspicious: boolean;
  /** Motivo legible del pre-desmarcado. null si el recorte se ve bien. */
  reason: string | null;
};

// Umbrales. Deliberadamente conservadores: un falso positivo solo le cuesta al
// usuario un tap para volver a marcar la prenda, mientras que un falso negativo
// le mete una estatua al armario y encima paga Gemini por procesarla.
const MIN_COLOR_STDDEV = 18; // por debajo: superficie casi lisa (cielo, pared)
const MIN_AREA_RATIO = 0.012; // por debajo: recorte diminuto, casi seguro ruido
const MAX_ASPECT = 4.5; // fuera de [1/4.5, 4.5]: tira alargada

/**
 * Decide si un recorte llega desmarcado. El orden importa: se reporta el motivo
 * más explicativo primero, porque es el que se le muestra al usuario.
 */
export function judgeCrop(
  signals: CropSignals,
  confianza: "alta" | "media" | "baja"
): CropVerdict {
  if (confianza === "baja") {
    return { suspicious: true, reason: "la IA no está segura de esta prenda" };
  }

  if (signals.colorStdDev < MIN_COLOR_STDDEV) {
    // El caso que motivó todo esto: cielo, una pared, el costado de un edificio.
    return { suspicious: true, reason: "parece fondo, no una prenda" };
  }

  if (signals.areaRatio < MIN_AREA_RATIO) {
    return { suspicious: true, reason: "el recorte es muy pequeño" };
  }

  if (signals.aspectRatio > MAX_ASPECT || signals.aspectRatio < 1 / MAX_ASPECT) {
    return { suspicious: true, reason: "la forma del recorte es rara" };
  }

  // `media` no basta por sí sola para desmarcar — si la geometría y la textura
  // se ven bien, una confianza media suele ser una prenda legítima que
  // simplemente está parcialmente tapada.
  return { suspicious: false, reason: null };
}

/**
 * Mide las señales de un recorte en el navegador. Submuestrea a 64px de ancho:
 * la varianza de color es un estadístico global y no necesita resolución, y así
 * medir 14 recortes no bloquea el hilo principal.
 */
export async function measureCrop(
  crop: Blob,
  originalArea: number
): Promise<CropSignals> {
  const bitmap = await createImageBitmap(crop);
  try {
    const w = Math.max(1, Math.min(64, bitmap.width));
    const h = Math.max(1, Math.round((bitmap.height / bitmap.width) * w));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      // Sin canvas no hay medición posible; devolver señales "buenas" hace que
      // judgeCrop caiga solo en la confianza de Vision, que es el default seguro.
      return { colorStdDev: 999, areaRatio: 1, aspectRatio: 1 };
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const n = w * h;
    let sr = 0, sg = 0, sb = 0;
    for (let i = 0; i < n; i++) {
      sr += data[i * 4];
      sg += data[i * 4 + 1];
      sb += data[i * 4 + 2];
    }
    const mr = sr / n, mg = sg / n, mb = sb / n;

    let vr = 0, vg = 0, vb = 0;
    for (let i = 0; i < n; i++) {
      vr += (data[i * 4] - mr) ** 2;
      vg += (data[i * 4 + 1] - mg) ** 2;
      vb += (data[i * 4 + 2] - mb) ** 2;
    }
    const colorStdDev =
      (Math.sqrt(vr / n) + Math.sqrt(vg / n) + Math.sqrt(vb / n)) / 3;

    return {
      colorStdDev,
      areaRatio: originalArea > 0 ? (bitmap.width * bitmap.height) / originalArea : 1,
      aspectRatio: bitmap.width / Math.max(1, bitmap.height),
    };
  } finally {
    bitmap.close();
  }
}
