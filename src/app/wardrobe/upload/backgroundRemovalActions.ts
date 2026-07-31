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
import {
  finalizeGeminiImageOutput,
  segmentGarmentLocally,
} from "@/lib/ai/imageBackgroundRemoval";
import { checkAndConsumeBurstUse } from "@/lib/ai/burstUsageGate";
import { logAiImageCall, type AiImageSource } from "@/lib/ai/aiImageAudit";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export type RemoveBackgroundResult =
  | { ok: true; base64: string; contentType: "image/png" }
  | { ok: false; reason: "rate_limited"; resetInMinutes: number }
  | { ok: false; reason: "no_session" | "no_image" | "generation_failed" };

// Umbral de confianza del recorte local: por encima de este % de píxeles
// semi-transparentes NO se confía en @imgly y se paga Gemini.
//
// 5% y no 8% a propósito, aunque el experimento sobre 28 prendas separaba
// igual de bien en todo el rango 5-9%: falla hacia el lado seguro. Un falso
// positivo solo cuesta lo mismo que hoy (COP 110); un falso negativo le deja
// al usuario una prenda recortada mal en el armario.
//
// NO ES SOLO AHORRO, ES RED DE SEGURIDAD. En el experimento, uno de los casos
// que el umbral atrapó era un short fotografiado sobre una persona que Vision
// había marcado como `needs_reconstruction=false` — o sea, un error de Vision.
// El recorte local salió con 13,6% de semi-transparencia, se mandó a Gemini y
// se salvó. La señal del alfa detecta fotos difíciles que la clasificación
// previa dejó pasar, cosa que hoy no hace nadie.
//
// Tunear con datos reales: `select operation, ok, semi_pct from ai_image_calls
// where operation = 'local_segmentation'` — se registra en TODAS las imágenes.
const LOCAL_SEGMENTATION_MAX_SEMI_PCT = 5;

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

  const arrayBuffer = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);
  const base64 = inputBuffer.toString("base64");
  const mimeType = file.type || "image/jpeg";

  // ── Paso 1: intento local con @imgly (gratis) ───────────────────────────
  //
  // Se corre SIEMPRE primero y su semi_pct queda registrado pase lo que pase,
  // incluso cuando después haya que ir a Gemini: esa serie es la que permite
  // tunear el umbral con datos reales sin pagar por prenda mientras se decide.
  const localStartedAt = Date.now();
  const local = await segmentGarmentLocally(inputBuffer, mimeType);
  const localMs = Date.now() - localStartedAt;

  if (local && local.semiPct <= LOCAL_SEGMENTATION_MAX_SEMI_PCT) {
    await logAiImageCall(supabase, {
      userId: user.id,
      operation: "local_segmentation",
      model: "imgly/small",
      ok: true,
      usage: null, // sin tokens: no hubo llamada a Gemini, costo 0
      semiPct: local.semiPct,
      durationMs: localMs,
      source,
      clothingItemId,
    });
    return { ok: true, base64: local.base64, contentType: local.contentType };
  }

  // El intento local no alcanzó: se registra igual (con su semi_pct) y se
  // sigue a Gemini. `local === null` = @imgly no disponible o reventó.
  await logAiImageCall(supabase, {
    userId: user.id,
    operation: "local_segmentation",
    model: "imgly/small",
    ok: false,
    reason: local ? "semi_above_threshold" : "imgly_unavailable",
    usage: null,
    semiPct: local?.semiPct ?? null,
    durationMs: localMs,
    source,
    clothingItemId,
  });

  // ── Paso 2: Gemini ──────────────────────────────────────────────────────
  const budget = await checkAndConsumeBurstUse(user.id, supabase);
  if (!budget.allowed) {
    // Se registra aunque no haya llegado a Gemini (usage null, costo 0): sin
    // esto no hay forma de saber cuántos usuarios chocan contra el límite.
    await audit(false, "rate_limited", null, 0);
    return { ok: false, reason: "rate_limited", resetInMinutes: budget.resetInMinutes };
  }

  const startedAt = Date.now();
  try {
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
