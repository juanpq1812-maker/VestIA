// Rate limiter de IA para el modo rafaga de subida de prendas.
//
// Límite: 40 llamadas de generación/edición de imagen con Gemini por usuario
// por hora (detección de outfit, reconstrucción, remoción de fondo — un
// crédito por cada una). Aplica a: el procesamiento en background de la cola
// de fotos en src/lib/wardrobe/burstQueue.ts.
// Independiente de ai_uses/ai_uses_window_start (usageGate.ts), que gatean
// generateOutfitsAction y analyzeInspirationPhotoAction — la rafaga tiene su
// propio pool para no dejar sin cupo esas funciones.
//
// El análisis de Vision (Claude) NO consume de este pool — solo las llamadas
// a Gemini. El gate previo en burstQueue.ts es un `peek` (no consume): cada
// prenda cuesta exactamente 1 crédito, el de su llamada a Gemini.
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
