// Genera y sube la miniatura de una prenda. Lo comparten los TRES caminos que
// escriben `clothing_items.image_path`, todos en el navegador:
//
//   - UploadForm.tsx        subida individual
//   - burstQueue.ts         modo rafaga y foto de outfit completo
//   - EditItemForm.tsx      "mejorar foto"
//
// (burstQueue engana con el nombre pero "vive enteramente en el cliente" — ver
// su cabecera —, asi que canvas sirve para los tres y no hace falta sharp ni un
// round trip al servidor.)
//
// CONTRATO: nunca lanza y nunca bloquea la subida de la prenda. Devuelve el
// path de la miniatura, o `null` si algo fallo. La miniatura es ADICIONAL: con
// `null`, `thumbnail_path` queda vacio y la UI cae a la imagen completa.
// Perder una miniatura es una card mas lenta; perder la prenda seria un bug.

"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { CLOTHING_IMAGES_BUCKET } from "@/lib/storage/clothingImages";
import { generateThumbnailFile } from "@/lib/wardrobe/imageUtils";
import {
  THUMBNAIL_CACHE_CONTROL,
  THUMBNAIL_CONTENT_TYPE,
  buildThumbnailPath,
} from "@/lib/wardrobe/thumbnails";

/**
 * @param supabase cliente del navegador (RLS: solo escribe en la carpeta del
 *   propio usuario, igual que la imagen completa).
 * @param file el archivo final que se subio como imagen completa.
 * @param imagePath el path con el que se subio, del que se deriva el de la
 *   miniatura para que queden juntos y el borrado los encuentre.
 */
export async function subirMiniatura(
  supabase: SupabaseClient,
  file: File,
  imagePath: string
): Promise<string | null> {
  try {
    const thumb = await generateThumbnailFile(file);
    if (!thumb) return null;

    const thumbPath = buildThumbnailPath(imagePath);
    const { error } = await supabase.storage
      .from(CLOTHING_IMAGES_BUCKET)
      .upload(thumbPath, thumb, {
        contentType: THUMBNAIL_CONTENT_TYPE,
        upsert: false,
        cacheControl: THUMBNAIL_CACHE_CONTROL,
      });

    if (error) {
      console.error("[subirMiniatura] no se pudo subir la miniatura", error);
      return null;
    }
    return thumbPath;
  } catch (err) {
    console.error("[subirMiniatura] error inesperado", err);
    return null;
  }
}
