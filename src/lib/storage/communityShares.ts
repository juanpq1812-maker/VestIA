// Helpers para el bucket de Storage `community-shares`.
//
// Mismo espíritu que `clothingImages.ts`, con una diferencia clave: acá
// cualquier usuario autenticado puede LEER cualquier foto del bucket (es un
// feed público entre usuarios logueados) — solo el INSERT está restringido a
// la propia carpeta. Ver STORAGE_SETUP.md sección 5.

import type { SupabaseClient } from "@supabase/supabase-js";

export const COMMUNITY_SHARES_BUCKET = "community-shares";

// 1 hora — igual que clothing-images, suficiente para una sesión de
// navegación por /comunidad sin regenerar firmas en cada render.
export const COMMUNITY_SHARE_SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Devuelve el path destino para subir una nueva foto compartida.
 * Estructura: `{userId}/{uuid}.{ext}` — la policy de Storage solo permite
 * escribir dentro de tu propia carpeta.
 */
export function buildCommunitySharePath(args: {
  userId: string;
  fileName: string;
  uuid: string;
}): string {
  const ext = extractExtension(args.fileName);
  return `${args.userId}/${args.uuid}.${ext}`;
}

/**
 * Devuelve un mapa `path -> signed URL`. Si la firma de algún path falla,
 * ese path queda fuera del mapa (el caller cae a un placeholder visual).
 */
export async function createCommunityShareSignedUrlMap(
  supabase: SupabaseClient,
  paths: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const limpios = paths.filter((p): p is string => Boolean(p));
  if (limpios.length === 0) return result;

  const { data, error } = await supabase.storage
    .from(COMMUNITY_SHARES_BUCKET)
    .createSignedUrls(limpios, COMMUNITY_SHARE_SIGNED_URL_TTL_SECONDS);

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
  return ext === "jpeg" ? "jpg" : ext;
}
