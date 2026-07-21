// Orquestación client-side de la detección de outfit completo: downscale ->
// detectOutfitItemsAction (1 llamada a Claude Vision para toda la foto) ->
// recorte por bounding box de cada prenda -> encolar cada recorte como draft
// con source='outfit_extraction'. La reconstrucción/remoción de fondo con
// Gemini de cada recorte la hace processPendingForUser (burstQueue.ts),
// igual que en la ráfaga.

import type { SupabaseClient } from "@supabase/supabase-js";
import { detectOutfitItemsAction } from "@/app/wardrobe/upload/outfitDetectionActions";
import type { DetectedOutfitGarment } from "@/lib/wardrobe/outfitDetectionSchema";
import { cropImageByBBox, downscaleToMaxPx, OUTFIT_PHOTO_MAX_PX } from "@/lib/wardrobe/imageUtils";
import {
  mapFormalityToOccasions,
  matchColorToPalette,
  matchSubcategory,
} from "@/lib/wardrobe/aiMapping";
import { enqueueDraftPhoto } from "@/lib/wardrobe/burstQueue";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supa = SupabaseClient<any>;

export type ExtractOutfitPhotoResult =
  | { ok: true; detectedCount: number }
  | { ok: false; reason: "rate_limited"; resetInMinutes: number }
  | { ok: false; reason: "invalid_response" | "no_image" | "no_session" | "upload_failed" };

async function enqueueDetectedOutfitGarment(
  supabase: Supa,
  userId: string,
  downscaledPhoto: File,
  garment: DetectedOutfitGarment
): Promise<boolean> {
  const crop = await cropImageByBBox(downscaledPhoto, garment.bbox).catch(() => null);
  if (!crop) return false;

  const subcategory = matchSubcategory(garment.categoria, garment.subcategoria) || null;
  const color = matchColorToPalette(garment.color_principal, garment.color_hex) || null;
  const occasions = mapFormalityToOccasions(garment.formalidad);

  const inserted = await enqueueDraftPhoto(supabase, userId, crop, {
    source: "outfit_extraction",
    category: garment.categoria,
    subcategory,
    primary_color: color,
    occasions,
    // La decisión de reconstrucción ya se tomó en la detección grupal (1 sola
    // llamada a Vision para toda la foto) — se guarda en el draft para que
    // burstQueue.ts la lea sin volver a analizar por prenda.
    reconstruction_reason: garment.needs_reconstruction ? garment.reconstruction_reason : null,
  });

  return inserted !== null;
}

/**
 * Procesa UNA foto de outfit completo: detecta todas las prendas visibles y
 * encola un draft por cada una. No procesa la imagen con Gemini acá — eso lo retoma
 * `processPendingForUser` (el caller debe llamarlo después, igual que hace
 * BurstCapture con cada foto individual).
 */
export async function extractOutfitPhoto(
  supabase: Supa,
  userId: string,
  file: File
): Promise<ExtractOutfitPhotoResult> {
  const downscaled = await downscaleToMaxPx(file, OUTFIT_PHOTO_MAX_PX).catch(() => file);

  const formData = new FormData();
  formData.append("image", downscaled, "outfit.jpg");
  const detection = await detectOutfitItemsAction(formData);

  if (!detection.ok) {
    return detection.reason === "rate_limited"
      ? { ok: false, reason: "rate_limited", resetInMinutes: detection.resetInMinutes }
      : { ok: false, reason: detection.reason };
  }

  if (detection.items.length === 0) {
    return { ok: true, detectedCount: 0 };
  }

  const results = await Promise.all(
    detection.items.map((garment) => enqueueDetectedOutfitGarment(supabase, userId, downscaled, garment))
  );
  const detectedCount = results.filter(Boolean).length;

  if (detectedCount === 0) {
    return { ok: false, reason: "upload_failed" };
  }

  return { ok: true, detectedCount };
}
