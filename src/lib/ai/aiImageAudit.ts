// Escribe una fila en `ai_image_calls` por cada llamada de imagen a Gemini
// (ver migración 0030). NO es un "use server": es un helper que consumen los
// server actions de imagen.
//
// POR QUÉ EXISTE: los contadores `burst_ai_uses` de `profiles` son una ventana
// deslizante de 1 hora que se resetea — sirven de rate limit, no de
// contabilidad. Al contrastar la facturación real de Google contra las prendas
// vivas aparecieron ~97 llamadas sin explicar (prendas borradas, reintentos,
// fallos que igual se cobraron). Esta tabla las hace visibles.
//
// REGLA: el registro NUNCA puede tumbar la operación. Si el insert falla, se
// loguea y se sigue — perder una fila de auditoría es malo, perder la prenda
// del usuario es peor.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeminiImageUsage } from "@/lib/ai/geminiClient";

// `local_segmentation` = recorte con @imgly sin pasar por Gemini (costo 0).
export type AiImageOperation =
  | "reconstruction"
  | "background_removal"
  | "local_segmentation";

/** De dónde salió la llamada, para poder cortar el gasto por flujo. */
export type AiImageSource =
  | "individual"
  | "burst"
  | "outfit_extraction"
  | "photo_improvement";

export async function logAiImageCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  row: {
    userId: string;
    operation: AiImageOperation;
    model: string;
    ok: boolean;
    reason?: string | null;
    usage?: GeminiImageUsage | null;
    /** % de píxeles semi-transparentes del matte. Se registra SIEMPRE, incluso
     *  cuando la imagen no llegó a Gemini — es la serie con la que se tunea el
     *  umbral del recorte local sin pagar por prenda mientras se decide. */
    semiPct?: number | null;
    durationMs?: number;
    source?: AiImageSource | null;
    clothingItemId?: string | null;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from("ai_image_calls").insert({
      user_id: row.userId,
      clothing_item_id: row.clothingItemId ?? null,
      operation: row.operation,
      source: row.source ?? null,
      model: row.model,
      ok: row.ok,
      reason: row.reason ?? null,
      prompt_tokens: row.usage?.promptTokens ?? null,
      image_tokens: row.usage?.imageTokens ?? null,
      text_tokens: row.usage?.textTokens ?? null,
      cost_usd: row.usage?.costUsd ?? 0,
      semi_pct: row.semiPct ?? null,
      duration_ms: row.durationMs ?? null,
    });
    if (error) {
      console.error("[aiImageAudit] no se pudo registrar la llamada:", error.message);
    }
  } catch (err) {
    console.error("[aiImageAudit] excepción registrando la llamada:", err);
  }
}
