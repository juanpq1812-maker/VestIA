// Hook client-side: recorta una imagen de prenda a su bounding box alfa
// (ver alphaBBox.ts) antes de usarla en Style Journal, para que
// CATEGORY_SCALE escale sobre el tamaño real del objeto y no sobre el
// margen transparente del PNG.
//
// TODO(alpha-bbox-column): esto recalcula el bbox en cada visita porque el
// cache es solo en memoria (no sobrevive un refresh de página). Lo correcto
// a mediano plazo es una columna `alpha_bbox` calculada una vez en el
// pipeline de subida (junto a `background_removed` en
// imageBackgroundRemoval.ts) + backfill para las prendas existentes, mismo
// patrón que scripts/reprocess-background-removal.mjs. El client-side es
// intencional para esta primera versión — cero cambios de esquema — pero no
// es el estado final.

"use client";

import { useEffect, useState } from "react";
import { cropImageToAlphaBBoxCanvas } from "./alphaBBox";

// url original -> src a usar (blob recortado, o la misma url si no hacía
// falta recortar). Vive a nivel de módulo: sobrevive entre outfits/páginas
// del swipe dentro de la misma sesión de la pestaña. No se revocan los
// object URLs creados — revocar rompería el cache para el próximo uso del
// mismo item, y el volumen (prendas vistas en una sesión) es chico.
const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Mismo patrón que loadImage() en storyCardCanvas.ts — necesario para
    // poder leer los píxeles (getImageData) de una imagen cross-origin sin
    // que el canvas quede "tainted".
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });
}

async function cropToAlphaBBox(url: string): Promise<string | null> {
  const img = await loadImage(url);
  const cropped = cropImageToAlphaBBoxCanvas(img);
  if (!cropped) return null;
  const blob: Blob | null = await new Promise((resolve) => cropped.toBlob(resolve, "image/png"));
  return blob ? URL.createObjectURL(blob) : null;
}

/**
 * `src` a usar para mostrar la prenda: mientras se calcula el recorte
 * devuelve la imagen cruda (sin parpadeo), y la reemplaza apenas está
 * lista. `null` si `url` es `null`/`undefined`.
 */
export function useAlphaCroppedImage(url: string | null | undefined): string | null {
  const [effectiveSrc, setEffectiveSrc] = useState<string | null>(() =>
    url ? (cache.get(url) ?? url) : null
  );

  useEffect(() => {
    if (!url) {
      setEffectiveSrc(null);
      return;
    }

    const cached = cache.get(url);
    setEffectiveSrc(cached ?? url);
    if (cached) return;

    let cancelled = false;
    let promise = inFlight.get(url);
    if (!promise) {
      promise = cropToAlphaBBox(url).catch((err) => {
        console.error("[useAlphaCroppedImage] error recortando", err);
        return null;
      });
      inFlight.set(url, promise);
    }

    promise.then((result) => {
      inFlight.delete(url);
      // Se cachea también el "no hacía falta recortar" (result === null),
      // como la propia url, para no reintentar en el próximo render.
      const finalSrc = result ?? url;
      cache.set(url, finalSrc);
      if (!cancelled) setEffectiveSrc(finalSrc);
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return effectiveSrc;
}
