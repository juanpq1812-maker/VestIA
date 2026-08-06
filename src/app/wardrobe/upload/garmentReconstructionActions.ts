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

import { callGeminiImageEdit, GEMINI_IMAGE_MODEL } from "@/lib/ai/geminiClient";
import { finalizeGeminiImageOutput } from "@/lib/ai/imageBackgroundRemoval";
import { checkAndConsumeBurstUse } from "@/lib/ai/burstUsageGate";
import { logAiImageCall, type AiImageSource } from "@/lib/ai/aiImageAudit";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export type ReconstructGarmentResult =
  // `backgroundRemoved`: si el recorte funcionó DE VERDAD, medido sobre el
  // resultado (ver finalizeGeminiImageOutput). `true` aquí no es garantía de
  // nada por sí solo — es el valor que el caller debe guardar tal cual en
  // clothing_items.background_removed, en vez de asumir true.
  | {
      ok: true;
      base64: string;
      contentType: "image/png";
      backgroundRemoved: boolean;
    }
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

  // Contexto opcional para la auditoría (ver ai_image_calls).
  const source = (formData.get("source") as AiImageSource | null) ?? null;
  const clothingItemId = (formData.get("clothingItemId") as string | null) || null;
  const audit = (
    ok: boolean,
    reason: string | null,
    usage: Parameters<typeof logAiImageCall>[1]["usage"],
    durationMs: number
  ) =>
    logAiImageCall(supabase, {
      userId: user.id,
      operation: "reconstruction",
      model: GEMINI_IMAGE_MODEL,
      ok,
      reason,
      usage,
      durationMs,
      source,
      clothingItemId,
    });

  const budget = await checkAndConsumeBurstUse(user.id, supabase);
  if (!budget.allowed) {
    await audit(false, "rate_limited", null, 0);
    return { ok: false, reason: "rate_limited", resetInMinutes: budget.resetInMinutes };
  }

  const startedAt = Date.now();
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

    if (!result.ok) {
      await audit(false, result.reason, result.usage, Date.now() - startedAt);
      return { ok: false, reason: "generation_failed" };
    }

    const finalized = await finalizeGeminiImageOutput(result.image);
    if (!finalized) {
      // Gemini SÍ cobró: el fallo fue del post-procesado local.
      await audit(false, "postprocess_failed", result.usage, Date.now() - startedAt);
      return { ok: false, reason: "generation_failed" };
    }

    await audit(true, null, result.usage, Date.now() - startedAt);
    return { ok: true, ...finalized };
  } catch (err) {
    await audit(
      false,
      err instanceof Error ? err.message.slice(0, 200) : "unknown",
      null,
      Date.now() - startedAt
    );
    return { ok: false, reason: "generation_failed" };
  }
}
