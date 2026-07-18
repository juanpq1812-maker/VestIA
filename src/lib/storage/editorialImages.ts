// Helpers para el bucket de Storage `editorial-images` (portadas y fotos de
// "El Hilo"). A diferencia de clothing-images/community-shares, este bucket
// es PÚBLICO de verdad (lectura sin firma, necesaria para og:image) — ver
// STORAGE_SETUP.md sección 6.
//
// Los paths son `{uuid}.{ext}` a nivel de raíz del bucket (sin carpeta por
// usuario: solo admins escriben acá). El nombre no adivinable es lo que hace
// seguro el acceso público — nunca se lista el bucket, solo se lee por path
// exacto.

import { getSupabaseEnv } from "@/lib/supabase/env";

export const EDITORIAL_IMAGES_BUCKET = "editorial-images";

export function buildEditorialImagePath(args: { fileName: string; uuid: string }): string {
  const ext = extractExtension(args.fileName);
  return `${args.uuid}.${ext}`;
}

/**
 * URL pública (sin firma) de una imagen editorial a partir de su path.
 * Es construcción de string pura (sin llamada de red) — el bucket es
 * público, así que sirve tanto en Server Components como en el navegador
 * sin depender de una instancia de cliente de Supabase.
 */
export function publicEditorialImageUrl(path: string): string {
  const { url } = getSupabaseEnv();
  return `${url}/storage/v1/object/public/${EDITORIAL_IMAGES_BUCKET}/${path}`;
}

function extractExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1 || dot === fileName.length - 1) return "jpg";
  const ext = fileName.slice(dot + 1).toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}
