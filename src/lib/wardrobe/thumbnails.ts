// Parametros de la miniatura del armario. Fuente unica compartida por los tres
// caminos de subida (cliente, via canvas) y por `scripts/backfill-thumbnails.mjs`
// (Node, via sharp) — si cada uno tuviera su copia, derivarian.
//
// POR QUE EXISTE LA MINIATURA
// La grilla servia el PNG completo del pipeline: 896x1195 y ~361KB de media
// (medido sobre las 82 prendas reales del armario mas grande) dentro de una card
// de ~171px en movil. ~25x el area necesaria, 28.9MB por visita, ~10.8s hasta
// que cargan las 6 visibles a 1.6Mbps.
//
// POR QUE 512px
// La card mide 171px en movil (2 columnas dentro de max-w-6xl con px-4 y gap-4)
// y 276px en desktop a 4 columnas. 512 cubre movil a DPR 3 y desktop a DPR ~1.9.
//
// POR QUE WebP Y NO AVIF
// Medido sobre 12 prendas reales: AVIF q50 pesa 26KB contra 65KB de WebP q70,
// pero tarda 102ms contra 46ms en codificar. La subida ya vive contra el
// maxDuration de la ruta (ver el bloque de presupuesto de tiempo en CLAUDE.md) y
// a esos tamanos la diferencia ya no la percibe nadie. WebP ademas conserva la
// transparencia, que es justo lo que produce el pipeline — JPEG pesa lo mismo
// pero aplana el alpha contra un fondo.

/** Ancho de la miniatura en px. La altura sale del aspect ratio original. */
export const THUMBNAIL_WIDTH = 512;

/**
 * Calidad WebP, 0-1. Mismo valor para `canvas.toBlob` y para sharp
 * (sharp toma 0-100, el backfill lo escala).
 */
export const THUMBNAIL_QUALITY = 0.7;

export const THUMBNAIL_CONTENT_TYPE = "image/webp";

export const THUMBNAIL_EXTENSION = "webp";

/**
 * `cacheControl` de Storage, en segundos (1 ano).
 *
 * Los paths son `{userId}/{uuid}.{ext}` y nunca se mutan: "mejorar foto" sube
 * un path nuevo en vez de sobrescribir. Son inmutables de hecho, asi que
 * cachearlos un ano es correcto. Hoy los `.upload()` no pasan `cacheControl` y
 * Storage cae a su default de 1 hora.
 */
export const THUMBNAIL_CACHE_CONTROL = "31536000";

/**
 * TTL de la URL firmada de una miniatura (30 dias), contra 1 hora para la
 * imagen completa.
 *
 * OJO — el TTL largo por si solo NO arregla el cache: el JWT que firma Supabase
 * incluye `iat`, asi que cada llamada a `createSignedUrl` devuelve un token
 * distinto y por lo tanto una URL distinta, aunque el TTL sea de un mes.
 * Verificado firmando la misma imagen dos veces. Lo que hace que el navegador
 * acierte en cache es memoizar la firma (ver `signThumbnailUrls` en
 * lib/storage/clothingImages.ts); este TTL solo define cuanto puede durar esa
 * memoizacion.
 */
export const THUMBNAIL_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * Cuantas imagenes de la grilla se cargan con prioridad alta en vez de `lazy`.
 * Son las que caben sobre el pliegue en un telefono (2 columnas, ~3 filas):
 * marcarlas `loading="lazy"`, como estaban, retrasa justo las que el usuario
 * esta mirando.
 */
export const EAGER_IMAGE_COUNT = 6;

/** Deriva el path de la miniatura a partir del de la imagen completa. */
export function buildThumbnailPath(imagePath: string): string {
  const sinExt = imagePath.replace(/\.[^./]+$/, "");
  return `${sinExt}_thumb.${THUMBNAIL_EXTENSION}`;
}
