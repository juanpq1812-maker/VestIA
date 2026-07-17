// Helpers de imagen compartidos entre el flujo de subida individual
// (UploadForm.tsx) y el modo ráfaga (BurstCapture.tsx / burstQueue.ts).
//
// "use client" porque usan Canvas/Image/atob, solo disponibles en el browser.
"use client";

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
