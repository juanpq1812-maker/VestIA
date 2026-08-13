// Firma memoizada de la imagen COMPLETA del armario (no la miniatura).
//
// Existe por el mismo bug que ya se resolvió para las miniaturas en
// `thumbnailUrls.ts`: el JWT que firma Supabase incluye `iat`, así que dos
// llamadas seguidas a `createSignedUrl` sobre el mismo objeto devuelven
// tokens (URLs) distintos. `createSignedUrlMap` (clothingImages.ts) no está
// memoizado y usa un TTL corto (1h) — perfectamente correcto para vistas
// puntuales del armario, pero Style Journal carga hasta 6 fotos COMPLETAS
// por página y las recorta al bbox alfa en el cliente (ver
// useAlphaCroppedImage.ts): sin URL estable entre visitas, ese recorte se
// recalcula siempre Y el navegador nunca puede cachear los PNG completos.
//
// Este archivo es la versión memoizada de esa firma, con su propio TTL
// largo — no toca `SIGNED_URL_TTL_SECONDS` ni `createSignedUrlMap`, que
// siguen sirviendo tal cual a sus otros 6 consumidores (armario, review,
// story card, etc.). Solo lo usan generateOutfits.ts y outfits/saved/page.tsx
// para hidratar `image_url` de cara a Style Journal.

import "server-only";

import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { CLOTHING_IMAGES_BUCKET } from "@/lib/storage/clothingImages";

/** 30 días — mismo orden de magnitud que THUMBNAIL_SIGNED_URL_TTL_SECONDS. */
export const IMAGE_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30;

/** Margen de revalidación: 5 días antes de que la firma real expire. */
const REVALIDATE_SECONDS = IMAGE_SIGNED_URL_TTL_SECONDS - 60 * 60 * 24 * 5;

const signImageBatch = unstable_cache(
  async (paths: string[]): Promise<Record<string, string>> => {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage
      .from(CLOTHING_IMAGES_BUCKET)
      .createSignedUrls(paths, IMAGE_SIGNED_URL_TTL_SECONDS);

    if (error || !data) {
      console.error("[imageSignedUrls] fallo la firma del lote", error);
      return {};
    }

    const out: Record<string, string> = {};
    for (const item of data) {
      if (item.signedUrl && item.path) out[item.path] = item.signedUrl;
    }
    return out;
  },
  ["style-journal-image-signed-urls"],
  { revalidate: REVALIDATE_SECONDS }
);

/**
 * Devuelve un mapa `imagePath -> signed URL`, estable entre renders. Mismos
 * criterios que createThumbnailSignedUrlMap: paths deduplicados/ordenados
 * para que la key de unstable_cache no cambie por orden, y mapa vacío
 * (nunca throw) si la firma falla — el consumidor cae a lo que ya tenga.
 */
export async function createImageSignedUrlMap(
  paths: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const limpios = [...new Set(paths.filter((p): p is string => Boolean(p)))].sort();
  if (limpios.length === 0) return new Map();

  try {
    return new Map(Object.entries(await signImageBatch(limpios)));
  } catch (err) {
    console.error("[imageSignedUrls] error inesperado firmando imágenes", err);
    return new Map();
  }
}
