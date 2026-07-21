"use server";

// Remoción de fondo con Gemini para prendas que NO necesitan reconstrucción
// (needs_reconstruction=false — la foto ya está bien, solo hace falta
// quitarle el fondo). Reemplaza a Remove.bg (eliminado del proyecto): ahora
// todo el pipeline de imagen pasa por Gemini, que ya está pago.
//
// El prompt pide una edición mínima (no regenerar la prenda) — a diferencia
// de garmentReconstructionActions.ts, que si reconstruye desde cero. El
// resultado crudo de Gemini (fondo blanco, ver imageBackgroundRemoval.ts
// para la decisión basada en evidencia) se post-procesa localmente con sharp
// para dejarlo con fondo transparente real — sin gastar una segunda llamada.
//
// Gatea el mismo pool que reconstructGarmentImageAction/detectOutfitItemsAction
// (burst_ai_uses): 1 crédito por intento. El consumo pasa server-side.

import { callGeminiImageEdit } from "@/lib/ai/geminiClient";
import { finalizeGeminiImageOutput } from "@/lib/ai/imageBackgroundRemoval";
import { checkAndConsumeBurstUse } from "@/lib/ai/burstUsageGate";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export type RemoveBackgroundResult =
  | { ok: true; base64: string; contentType: "image/png" }
  | { ok: false; reason: "rate_limited"; resetInMinutes: number }
  | { ok: false; reason: "no_session" | "no_image" | "generation_failed" };

const MINIMAL_EDIT_PROMPT =
  "Remove the background completely. Keep the garment EXACTLY as it is — same pixels, same colors, same wrinkles, same angle, same lighting. Output the garment centered on a pure solid white background (#FFFFFF), no shadow, no gradient, no texture. Do not alter, improve or regenerate the garment.";

export async function removeBackgroundWithGemini(
  formData: FormData
): Promise<RemoveBackgroundResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "no_session" };

  const file = formData.get("image");
  if (!file || !(file instanceof Blob)) return { ok: false, reason: "no_image" };

  const budget = await checkAndConsumeBurstUse(user.id, supabase);
  if (!budget.allowed) {
    return { ok: false, reason: "rate_limited", resetInMinutes: budget.resetInMinutes };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const result = await callGeminiImageEdit({
      imageBase64: base64,
      imageMimeType: mimeType,
      prompt: MINIMAL_EDIT_PROMPT,
    });

    if (!result) return { ok: false, reason: "generation_failed" };

    const finalized = await finalizeGeminiImageOutput(result);
    if (!finalized) return { ok: false, reason: "generation_failed" };

    return { ok: true, ...finalized };
  } catch {
    return { ok: false, reason: "generation_failed" };
  }
}
