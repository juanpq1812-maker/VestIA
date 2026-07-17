"use server";

// Reconstrucción de una prenda recortada de una foto de outfit completo:
// manda el crop crudo a Gemini 2.5 Flash Image pidiendo una foto de producto
// limpia (sin persona, sin otras prendas) antes de pasar por Remove.bg.
// Solo se usa para source='outfit_extraction' — ver burstQueue.ts.
//
// Gatea el mismo pool de rate limit que la detección de outfits
// (burst_ai_uses): 1 crédito por intento de reconstrucción. El consumo pasa
// server-side acá adentro, nunca en el cliente — mismo patrón de seguridad
// que outfitDetectionActions.ts.

import { callGeminiImageEdit } from "@/lib/ai/geminiClient";
import { checkAndConsumeBurstUse } from "@/lib/ai/burstUsageGate";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export type ReconstructGarmentResult =
  | { ok: true; base64: string; contentType: string }
  | { ok: false; reason: "rate_limited"; resetInMinutes: number }
  | { ok: false; reason: "no_session" | "no_image" | "generation_failed" };

function buildPrompt(description: string): string {
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

    const result = await callGeminiImageEdit({
      imageBase64: base64,
      imageMimeType: mimeType,
      prompt: buildPrompt(descriptionText),
    });

    if (!result) return { ok: false, reason: "generation_failed" };

    return { ok: true, base64: result.base64, contentType: result.mimeType };
  } catch {
    return { ok: false, reason: "generation_failed" };
  }
}
