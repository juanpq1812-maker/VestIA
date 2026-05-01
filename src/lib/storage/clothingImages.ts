// Helpers para el bucket de Storage `clothing-images`.
//
// Centralizamos aqui:
//   - El nombre del bucket (asi no se nos cuela un typo en otro archivo).
//   - La generacion del path `{user_id}/{uuid}.{ext}` que respeta las
//     policies de Storage (ver STORAGE_SETUP.md).
//   - La firma de URLs para mostrar las imagenes en el armario (el bucket
//     es privado, asi que necesitamos URLs temporales).

import type { SupabaseClient } from "@supabase/supabase-js";

export const CLOTHING_IMAGES_BUCKET = "clothing-images";

// 1 hora — suficiente para una sesion de browsing del armario sin
// regenerar firmas en cada navegacion.
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Devuelve el path destino para subir una nueva foto.
 * Estructura: `{userId}/{uuid}.{ext}` para que la policy de Storage permita
 * el INSERT (solo deja escribir dentro de tu propia carpeta).
 */
export function buildClothingImagePath(args: {
  userId: string;
  fileName: string;
  uuid: string;
}): string {
  const ext = extractExtension(args.fileName);
  return `${args.userId}/${args.uuid}.${ext}`;
}

/**
 * Devuelve un mapa `path -> signed URL`. Si la firma de algun path falla,
 * ese path queda fuera del mapa (el caller cae al placeholder visual).
 *
 * Acepta un cliente de Supabase (server o browser) — la firma vive en el
 * lado del servidor de Storage, ambos clientes pueden pedirla.
 */
export async function createSignedUrlMap(
  supabase: SupabaseClient,
  paths: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const limpios = paths.filter((p): p is string => Boolean(p));
  if (limpios.length === 0) return result;

  const { data, error } = await supabase.storage
    .from(CLOTHING_IMAGES_BUCKET)
    .createSignedUrls(limpios, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return result;

  for (const item of data) {
    if (item.signedUrl && item.path) {
      result.set(item.path, item.signedUrl);
    }
  }
  return result;
}

function extractExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1 || dot === fileName.length - 1) return "jpg";
  const ext = fileName.slice(dot + 1).toLowerCase();
  // Normalizamos jpeg -> jpg para no tener dos extensiones equivalentes.
  return ext === "jpeg" ? "jpg" : ext;
}
