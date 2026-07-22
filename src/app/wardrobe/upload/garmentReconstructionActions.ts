"use server";

// Reconstrucción de una prenda cuya foto necesita más que remover el fondo
// (persona vistiéndola, colgada deformando la silueta, muy arrugada, fondo
// cargado — ver needs_reconstruction en el análisis de Vision). Manda la
// foto cruda a Gemini pidiendo una foto de producto limpia (sin persona, sin
// otras prendas, fondo blanco). Se usa en cualquier flujo (individual,
// ráfaga, outfit_extraction) — la decisión la toma el flag, no el source.
//
// El resultado crudo de Gemini se post-procesa con finalizeGeminiImageOutput
// (imageBackgroundRemoval.ts) para dejarlo con fondo transparente real, sin
// gastar una segunda llamada — ver ese archivo para la decisión basada en
// evidencia de por qué se pide fondo blanco y no transparente directamente.
//
// Gatea el mismo pool de rate limit que la detección de outfits
// (burst_ai_uses): 1 crédito por intento de reconstrucción. El consumo pasa
// server-side acá adentro, nunca en el cliente — mismo patrón de seguridad
// que outfitDetectionActions.ts.

import { callGeminiImageEdit } from "@/lib/ai/geminiClient";
import { finalizeGeminiImageOutput } from "@/lib/ai/imageBackgroundRemoval";
import { checkAndConsumeBurstUse } from "@/lib/ai/burstUsageGate";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export type ReconstructGarmentResult =
  | { ok: true; base64: string; contentType: "image/png" }
  | { ok: false; reason: "rate_limited"; resetInMinutes: number }
  | { ok: false; reason: "no_session" | "no_image" | "generation_failed" };

function buildPrompt(description: string, category: string | null): string {
  if (category === "footwear") {
    return `Extract only the ${description} from this photo. Generate it as a clean product photo showing the COMPLETE PAIR of shoes: both shoes of the exact same model, identical in color, material and every detail, standing side by side in profile (simple shoe-store product shot, no complex angles). No person, no other garments, plain white background. Preserve exactly the design of the shoe visible in the original photo — do not invent variations, do not generate two different shoes, just duplicate the same shoe as its matching pair. Do not invent details not visible in the photo.`;
  }
  return `Extract only the ${description} from this photo. Generate it as a clean product photo: the garment alone, laid flat, no person, no other garments, plain white background, preserving the exact color, texture, pattern, buttons and cut of the original garment. Do not invent details not visible in the photo.`;
}

export async function reconstructGarmentImageAction(
  formData: FormData
): Promise<ReconstructGarmentResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "no_session" };

  const file = formData.get("image");
  const description = formData.get("description");
  const category = formData.get("category");
  if (!file || !(file instanceof Blob)) return { ok: false, reason: "no_image" };

  const budget = await checkAndConsumeBurstUse(user.id, supabase);
  if (!budget.allowed) {
    return { ok: false, reason: "rate_limited", resetInMinutes: budget.resetInMinutes };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";
    const descriptionText =
      typeof description === "string" && description.trim().length > 0
        ? description.trim()
        : "clothing item";
    const categoryText = typeof category === "string" && category.trim().length > 0 ? category.trim() : null;

    const result = await callGeminiImageEdit({
      imageBase64: base64,
      imageMimeType: mimeType,
      prompt: buildPrompt(descriptionText, categoryText),
    });

    if (!result) return { ok: false, reason: "generation_failed" };

    const finalized = await finalizeGeminiImageOutput(result);
    if (!finalized) return { ok: false, reason: "generation_failed" };

    return { ok: true, ...finalized };
  } catch {
    return { ok: false, reason: "generation_failed" };
  }
}
