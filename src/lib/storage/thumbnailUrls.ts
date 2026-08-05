// Firma memoizada de las miniaturas del armario. SOLO servidor.
//
// Vive en su propio archivo y no en `clothing-images.ts` porque ese modulo lo
// importan Client Components (UploadForm, EditItemForm, DeleteItemButton,
// burstQueue). Meter aca `next/cache` y el cliente admin arrastraria la
// SUPABASE_SERVICE_ROLE_KEY al bundle del navegador. `server-only` hace que el
// build falle ruidosamente si alguien lo importa desde el cliente, en vez de
// filtrar la key en silencio.
//
// POR QUE MEMOIZAR Y NO SOLO SUBIR EL TTL
// El JWT que firma Supabase incluye `iat`, asi que dos llamadas seguidas a
// `createSignedUrl` sobre el mismo objeto devuelven tokens distintos — y por lo
// tanto URLs distintas. Verificado firmando la misma imagen dos veces con
// expiresIn de 30 dias:
//
//   firma A: {"url":"...","scope":"download","iat":1785898184,"exp":1788490184}
//   firma B: {"url":"...","scope":"download","iat":1785898186,"exp":1788490186}
//
// Como /wardrobe firma en cada render de servidor, el navegador veia una URL
// nueva en cada visita y volvia a descargar el armario entero — con TTL de 1
// hora o de un mes, daba igual. Memoizar la firma es lo que hace la URL estable
// entre visitas, y lo que hace que el `cacheControl` de un ano del objeto sirva
// de algo.

import "server-only";

import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { CLOTHING_IMAGES_BUCKET } from "@/lib/storage/clothingImages";
import { THUMBNAIL_SIGNED_URL_TTL_SECONDS } from "@/lib/wardrobe/thumbnails";

/**
 * Margen entre la expiracion de la firma y la revalidacion del cache: la URL
 * memoizada se renueva 5 dias antes de expirar de verdad, para no servir nunca
 * una a punto de morir.
 */
const REVALIDATE_SECONDS = THUMBNAIL_SIGNED_URL_TTL_SECONDS - 60 * 60 * 24 * 5;

/**
 * Firma un lote de paths de miniatura y memoiza el resultado.
 *
 * Devuelve un objeto plano y no un Map porque el Data Cache de Next serializa a
 * JSON — un Map volveria como `{}`.
 *
 * Usa el cliente admin y no el de sesion a proposito: dentro de un scope
 * cacheado no se puede leer `cookies` (lo dice la doc de `unstable_cache`) y
 * `createSupabaseServerClient` las lee. La autorizacion ya la aplico el caller:
 * los paths salen de filas que RLS filtro por usuario, asi que aca solo se
 * firman objetos que ese usuario ya tenia derecho a ver.
 */
const signThumbnailBatch = unstable_cache(
  async (paths: string[]): Promise<Record<string, string>> => {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage
      .from(CLOTHING_IMAGES_BUCKET)
      .createSignedUrls(paths, THUMBNAIL_SIGNED_URL_TTL_SECONDS);

    if (error || !data) {
      console.error("[thumbnailUrls] fallo la firma del lote", error);
      return {};
    }

    const out: Record<string, string> = {};
    for (const item of data) {
      if (item.signedUrl && item.path) out[item.path] = item.signedUrl;
    }
    return out;
  },
  ["wardrobe-thumbnail-signed-urls"],
  { revalidate: REVALIDATE_SECONDS }
);

/**
 * Devuelve un mapa `thumbnailPath -> signed URL`, estable entre renders.
 *
 * Los paths se deduplican y ordenan antes de firmar: `unstable_cache` usa los
 * argumentos como parte de la clave, asi que dos renders con las mismas prendas
 * en distinto orden tienen que dar la misma clave o el cache no acierta nunca.
 *
 * Si la firma falla, devuelve un mapa vacio y el consumidor cae a la imagen
 * completa — la miniatura es adicional, nunca un punto de fallo.
 */
export async function createThumbnailSignedUrlMap(
  paths: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const limpios = [...new Set(paths.filter((p): p is string => Boolean(p)))].sort();
  if (limpios.length === 0) return new Map();

  try {
    return new Map(Object.entries(await signThumbnailBatch(limpios)));
  } catch (err) {
    console.error("[thumbnailUrls] error inesperado firmando miniaturas", err);
    return new Map();
  }
}
