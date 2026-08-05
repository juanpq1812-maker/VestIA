// Helpers de imagen compartidos entre el flujo de subida individual
// (UploadForm.tsx) y el modo ráfaga (BurstCapture.tsx / burstQueue.ts).
//
// "use client" porque usan Canvas/Image/atob, solo disponibles en el browser.
"use client";

import {
  THUMBNAIL_CONTENT_TYPE,
  THUMBNAIL_EXTENSION,
  THUMBNAIL_QUALITY,
  THUMBNAIL_WIDTH,
} from "@/lib/wardrobe/thumbnails";

// Max long-edge (px) usado al redimensionar fotos de cámara antes de
// cualquier otro procesamiento.
export const CAMERA_DOWNSCALE_MAX_PX = 1200;

// Max long-edge (px) para fotos de outfit completo antes de mandarlas a
// Claude Vision — más grande que CAMERA_DOWNSCALE_MAX_PX porque hay que
// distinguir prendas chicas en la imagen, pero acotado para controlar el
// costo de tokens de visión.
export const OUTFIT_PHOTO_MAX_PX = 1568;

// Decode `file` into a canvas capped at `maxPx` on the long edge, then return a
// new JPEG File. The original objectURL is revoked inside this function right
// after the Image element decodes it, so the full-resolution bitmap is freed
// from memory before the caller proceeds. If the image is already within limits,
// the original File is returned unchanged (no canvas work).
export function downscaleToMaxPx(file: File, maxPx: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url); // liberar bitmap original inmediatamente
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w <= maxPx && h <= maxPx) {
        resolve(file);
        return;
      }
      const scale = maxPx / Math.max(w, h);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no canvas ctx")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("toBlob failed")); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.92,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}

// Genera la miniatura WebP que se sirve en la grilla del armario, a partir del
// archivo final (el mismo blob que se sube como imagen completa).
//
// Vive acá y no en el servidor porque los TRES caminos que escriben
// `image_path` corren en el navegador: UploadForm, burstQueue (a pesar del
// nombre, "vive enteramente en el cliente" — ver su cabecera) y EditItemForm.
// Un solo helper los cubre a los tres, sin round trip extra ni CPU de servidor.
//
// NO rellena el fondo antes de dibujar: eso aplanaría el alpha que produce el
// pipeline. Verificado en Chrome sobre prendas reales — la transparencia
// sobrevive el round-trip (≈50-63% de píxeles transparentes tras codificar).
//
// Devuelve `null` en vez de lanzar: la miniatura es ADICIONAL. Si falla, el
// caller sube la imagen completa igual y deja `thumbnail_path` en null; la UI
// cae al PNG original. Nunca se pierde una prenda por una miniatura.
export async function generateThumbnailFile(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, THUMBNAIL_WIDTH / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, THUMBNAIL_CONTENT_TYPE, THUMBNAIL_QUALITY);
      });
      // Un navegador sin encoder WebP devuelve PNG en vez de fallar: si el tipo
      // no es el pedido, preferimos no subir nada antes que meter un PNG a
      // tamaño de miniatura haciéndose pasar por `.webp`.
      if (!blob || blob.type !== THUMBNAIL_CONTENT_TYPE) return null;

      return new File([blob], `thumb.${THUMBNAIL_EXTENSION}`, {
        type: THUMBNAIL_CONTENT_TYPE,
      });
    } finally {
      bitmap.close();
    }
  } catch (err) {
    console.error("[generateThumbnailFile] no se pudo generar la miniatura", err);
    return null;
  }
}

// Piso de calidad para fotos subidas por el usuario (p.ej. compartir con la
// comunidad) — no atrapa ningún caso puntual, solo evita que una imagen
// basura o corrupta (icono, thumbnail accidental, capture fallida) quede
// guardada como si fuera una foto real. Deliberadamente bajo: 200px es
// generoso, cualquier cámara real produce fotos muy por encima de esto.
export const MIN_SHARE_PHOTO_DIMENSION_PX = 200;

/** Ancho/alto reales del archivo, sin decodificarlo a canvas. */
export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}

export type BoundingBoxPercent = { x: number; y: number; width: number; height: number };

/**
 * Recorta `file` según un bounding box en porcentajes (0-100) del ancho/alto
 * total de la imagen — usado para separar cada prenda detectada en una foto
 * de outfit completo (ver outfitExtraction.ts). Igual que downscaleToMaxPx,
 * libera el objectURL apenas decodifica para no retener el bitmap completo.
 */
export function cropImageByBBox(file: File, bbox: BoundingBoxPercent): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;

      const sx = Math.max(0, Math.round((bbox.x / 100) * w));
      const sy = Math.max(0, Math.round((bbox.y / 100) * h));
      const sw = Math.min(w - sx, Math.round((bbox.width / 100) * w));
      const sh = Math.min(h - sy, Math.round((bbox.height / 100) * h));

      if (sw <= 0 || sh <= 0) {
        reject(new Error("bounding box inválido"));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no canvas ctx")); return; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("toBlob failed")); return; }
          resolve(new File([blob], "crop.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.92,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}

export function bytesToReadable(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Área en píxeles de una imagen. Se usa para medir qué fracción de la foto
 *  original ocupa un recorte (ver cropSuspicion.ts). */
export function imageArea(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.naturalWidth * img.naturalHeight);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}
