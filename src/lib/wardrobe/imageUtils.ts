// Helpers de imagen compartidos entre el flujo de subida individual
// (UploadForm.tsx) y el modo ráfaga (BurstCapture.tsx / burstQueue.ts).
//
// "use client" porque usan Canvas/Image/atob, solo disponibles en el browser.
"use client";

// Max long-edge (px) usado al redimensionar fotos de cámara antes de
// cualquier otro procesamiento.
export const CAMERA_DOWNSCALE_MAX_PX = 1200;

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
