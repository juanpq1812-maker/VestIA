// Rate limiter de IA para el modo rafaga de subida de prendas.
//
// Límite: 40 créditos por usuario por hora, UNO por cada llamada a:
//   - detectOutfitItemsAction (Claude Vision — 1 crédito por FOTO de outfit
//     completo, sin importar cuántas prendas detecte)
//   - reconstructGarmentImageAction (Gemini — 1 crédito por prenda)
//   - removeBackgroundWithGemini (Gemini — 1 crédito por prenda)
// Aplica a: el procesamiento en background de la cola de fotos en
// src/lib/wardrobe/burstQueue.ts, y a la detección grupal en
// outfitDetectionActions.ts.
// Independiente de ai_uses/ai_uses_window_start (usageGate.ts), que gatean
// generateOutfitsAction y analyzeInspirationPhotoAction — la rafaga tiene su
// propio pool para no dejar sin cupo esas funciones.
//
// OJO — esto es DISTINTO del análisis de Vision por prenda individual
// (analyzeClothingImageAction, ráfaga/individual): ESE no consume de este
// pool ni de ningún otro, es ilimitado. Pero detectOutfitItemsAction (Vision
// también, pero para la foto de outfit completo) SÍ consume de este pool —
// es fácil confundirlos porque los dos son llamadas a Claude Vision. Una
// sola foto de outfit con 4 prendas gasta 1 (detección) + 4 (Gemini por
// prenda) = 5 créditos de este pool, el doble de rápido que ráfaga foto por
// foto — tenerlo en cuenta al pensar en el 40/hora como presupuesto.
//
// El gate previo en burstQueue.ts (peekBurstBudgetAction) es un `peek` (no
// consume): cada prenda cuesta exactamente 1 crédito, el de su llamada a
// Gemini — el consumo real pasa server-side en checkAndConsumeBurstUse.
//
// 40/hora en vez de 30: desde que Remove.bg se dio de baja, TODA prenda pasa
// por Gemini (antes las fotos "buenas" salían gratis), así que subimos el
// techo para que una sesión legítima de digitalización de clóset no choque
// contra el límite a mitad de camino.
//
// Mismo algoritmo que usageGate.ts (ventana deslizante desde el primer uso),
// leyendo/escribiendo burst_ai_uses / burst_ai_uses_window_start en profiles.

import type { SupabaseClient } from "@supabase/supabase-js";

const RATE_LIMIT = 40;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora en milisegundos

export type BurstRateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; resetInMinutes: number };

/**
 * Verifica si el usuario puede hacer una llamada más de imagen a Gemini
 * (detección de outfit, reconstrucción o remoción de fondo) y consume un
 * crédito. Fail-closed: si hay un error de base de datos, bloquea la
 * solicitud para evitar acceso no contado.
 */
export async function checkAndConsumeBurstUse(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<BurstRateLimitResult> {
  const { data: profile, error: readErr } = await supabase
    .from("profiles")
    .select("burst_ai_uses, burst_ai_uses_window_start")
    .eq("id", userId)
    .single();

  if (readErr || !profile) {
    console.error("[burstUsageGate] Error leyendo perfil:", readErr);
    return { allowed: false, resetInMinutes: 60 };
  }

  const now = Date.now();
  const windowStart = profile.burst_ai_uses_window_start
    ? new Date(profile.burst_ai_uses_window_start).getTime()
    : null;
  const windowExpired = windowStart === null || now - windowStart >= WINDOW_MS;

  if (windowExpired) {
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ burst_ai_uses: 1, burst_ai_uses_window_start: new Date().toISOString() })
      .eq("id", userId);

    if (updateErr) {
      console.error("[burstUsageGate] Error reseteando ventana:", updateErr);
      return { allowed: false, resetInMinutes: 60 };
    }

    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (profile.burst_ai_uses >= RATE_LIMIT) {
    const msUntilReset = WINDOW_MS - (now - windowStart!);
    const resetInMinutes = Math.max(1, Math.ceil(msUntilReset / 60_000));
    return { allowed: false, resetInMinutes };
  }

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ burst_ai_uses: profile.burst_ai_uses + 1 })
    .eq("id", userId);

  if (updateErr) {
    console.error("[burstUsageGate] Error incrementando burst_ai_uses:", updateErr);
    return { allowed: false, resetInMinutes: 60 };
  }

  return { allowed: true, remaining: RATE_LIMIT - profile.burst_ai_uses - 1 };
}

/**
 * Lee cuántos análisis quedan disponibles esta hora SIN consumir ninguno.
 * Se usa para avisarle al usuario antes de arrancar/seguir la rafaga
 * ("Te quedan X análisis esta hora, las demás se procesarán después").
 */
export async function peekBurstBudget(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<{ remaining: number; resetInMinutes: number | null }> {
  const { data: profile, error: readErr } = await supabase
    .from("profiles")
    .select("burst_ai_uses, burst_ai_uses_window_start")
    .eq("id", userId)
    .single();

  if (readErr || !profile) {
    console.error("[burstUsageGate] Error leyendo perfil (peek):", readErr);
    return { remaining: 0, resetInMinutes: 60 };
  }

  const now = Date.now();
  const windowStart = profile.burst_ai_uses_window_start
    ? new Date(profile.burst_ai_uses_window_start).getTime()
    : null;
  const windowExpired = windowStart === null || now - windowStart >= WINDOW_MS;

  if (windowExpired) {
    return { remaining: RATE_LIMIT, resetInMinutes: null };
  }

  const remaining = Math.max(0, RATE_LIMIT - profile.burst_ai_uses);
  const msUntilReset = WINDOW_MS - (now - windowStart!);
  const resetInMinutes = Math.max(1, Math.ceil(msUntilReset / 60_000));

  return { remaining, resetInMinutes: remaining < RATE_LIMIT ? resetInMinutes : null };
}
