// Rate limiter de IA para StrandIA.
//
// Límite: 30 llamadas por usuario por hora.
// Aplica a: generateOutfitsAction y analyzeInspirationPhotoAction.
// No aplica a: análisis automático al subir prendas.
//
// Algoritmo (ventana deslizante desde el primer uso):
//   1. Leer (ai_uses, ai_uses_window_start) del perfil.
//   2. Si window_start es NULL o han pasado más de 1h → resetear ventana,
//      establecer ai_uses = 1 y window_start = now() → PERMITIR.
//   3. Si ai_uses < 30 → incrementar ai_uses → PERMITIR.
//   4. Si ai_uses >= 30 → calcular minutos hasta reset → BLOQUEAR.

import type { SupabaseClient } from "@supabase/supabase-js";

const RATE_LIMIT = 30;
const WINDOW_MS  = 60 * 60 * 1000; // 1 hora en milisegundos

export type RateLimitResult =
  | { allowed: true;  remaining: number }
  | { allowed: false; resetInMinutes: number };

/**
 * Verifica si el usuario puede hacer una llamada a la IA y consume un crédito.
 *
 * Lee y escribe la ventana en la tabla `profiles`. Fail-closed: si hay un
 * error de base de datos, bloquea la solicitud para evitar acceso no contado.
 */
export async function checkAndConsumeAiUse(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<RateLimitResult> {
  const { data: profile, error: readErr } = await supabase
    .from("profiles")
    .select("ai_uses, ai_uses_window_start")
    .eq("id", userId)
    .single();

  if (readErr || !profile) {
    console.error("[rateLimiter] Error leyendo perfil:", readErr);
    return { allowed: false, resetInMinutes: 60 };
  }

  const now         = Date.now();
  const windowStart = profile.ai_uses_window_start
    ? new Date(profile.ai_uses_window_start).getTime()
    : null;
  const windowExpired = windowStart === null || now - windowStart >= WINDOW_MS;

  if (windowExpired) {
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ ai_uses: 1, ai_uses_window_start: new Date().toISOString() })
      .eq("id", userId);

    if (updateErr) {
      console.error("[rateLimiter] Error reseteando ventana:", updateErr);
      return { allowed: false, resetInMinutes: 60 };
    }

    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (profile.ai_uses >= RATE_LIMIT) {
    const msUntilReset   = WINDOW_MS - (now - windowStart!);
    const resetInMinutes = Math.max(1, Math.ceil(msUntilReset / 60_000));
    return { allowed: false, resetInMinutes };
  }

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ ai_uses: profile.ai_uses + 1 })
    .eq("id", userId);

  if (updateErr) {
    console.error("[rateLimiter] Error incrementando ai_uses:", updateErr);
    return { allowed: false, resetInMinutes: 60 };
  }

  return { allowed: true, remaining: RATE_LIMIT - profile.ai_uses - 1 };
}
