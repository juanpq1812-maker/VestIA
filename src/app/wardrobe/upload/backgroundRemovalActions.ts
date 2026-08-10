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

import { callGeminiImageEdit, GEMINI_IMAGE_MODEL } from "@/lib/ai/geminiClient";
import { MINIMAL_EDIT_PROMPT } from "@/lib/ai/imagePrompts";
import { finalizeGeminiImageOutput } from "@/lib/ai/imageBackgroundRemoval";
import { checkAndConsumeBurstUse } from "@/lib/ai/burstUsageGate";
import { checkAndConsumePhotoImprovement } from "@/lib/plans/checkAndConsumePhotoImprovement";
import { logAiImageCall, type AiImageSource } from "@/lib/ai/aiImageAudit";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export type RemoveBackgroundResult =
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
  | { ok: false; reason: "plan_limit" }
  | { ok: false; reason: "no_session" | "no_image" | "generation_failed" };

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

  // Contexto opcional para la auditoría — de qué flujo viene y, si ya existe,
  // a qué prenda corresponde el gasto.
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
      operation: "background_removal",
      model: GEMINI_IMAGE_MODEL,
      ok,
      reason,
      usage,
      durationMs,
      source,
      clothingItemId,
    });

  // `source === "photo_improvement"` es la única llamada de este archivo que
  // viene del botón manual "Mejora esta foto" (EditItemForm.tsx) — el
  // pipeline automático de subida nunca manda ese source. Solo esa llamada
  // gasta cuota de plan (5 en total en free); subir prendas sigue ilimitado.
  // Va ANTES del rate limit horario: si al usuario ya no le queda cuota de
  // plan, debe ver el paywall y no "espera una hora".
  if (source === "photo_improvement") {
    const planGate = await checkAndConsumePhotoImprovement(user.id, supabase);
    if (!planGate.allowed) {
      await audit(false, "plan_limit", null, 0);
      return { ok: false, reason: "plan_limit" };
    }
  }

  const budget = await checkAndConsumeBurstUse(user.id, supabase);
  if (!budget.allowed) {
    // Se registra aunque no haya llegado a Gemini (usage null, costo 0): sin
    // esto no hay forma de saber cuántos usuarios chocan contra el límite.
    await audit(false, "rate_limited", null, 0);
    return { ok: false, reason: "rate_limited", resetInMinutes: budget.resetInMinutes };
  }

  const startedAt = Date.now();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const result = await callGeminiImageEdit({
      imageBase64: base64,
      imageMimeType: mimeType,
      prompt: MINIMAL_EDIT_PROMPT,
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
