// Módulo del AI Usage Gate para StrandIA.
//
// Cada usuario tiene 1 uso gratuito de funciones IA:
//   - Generación de outfits (todos los modos: ocasión, descripción, sorpresa)
//   - Análisis de foto de inspiración
//
// El análisis automático al subir prendas NO está gateado.
//
// Uso:
//   const gate = await checkAndConsumeAiUse(userId, supabase);
//   if (!gate.allowed) return { ok: false, code: "USAGE_GATE_REQUIRED", ... };
//   // ... llamar a la IA ...

import type { SupabaseClient } from "@supabase/supabase-js";

/** Cuántos usos gratuitos tiene cada usuario antes de ver el gate. */
const FREE_AI_USES = 1;

export type UsageGateResult =
  | { allowed: true }
  | { allowed: false };

/**
 * Verifica si el usuario puede usar una función IA.
 *
 * - Si `ai_uses < FREE_AI_USES`: permite el uso e incrementa el contador
 *   (consume el crédito antes de llamar a la IA para evitar abuso).
 * - Si `ai_uses >= FREE_AI_USES`: deniega el acceso sin modificar el contador.
 *
 * @param userId  UUID del usuario autenticado.
 * @param supabase Instancia del cliente Supabase (server-side).
 */
export async function checkAndConsumeAiUse(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<UsageGateResult> {
  // Leer el contador actual.
  const { data: profile, error: readErr } = await supabase
    .from("profiles")
    .select("ai_uses")
    .eq("id", userId)
    .single();

  if (readErr || !profile) {
    // Si no podemos leer el perfil, bloqueamos por seguridad.
    console.error("[usageGate] Error leyendo perfil", readErr);
    return { allowed: false };
  }

  const currentUses: number = profile.ai_uses ?? 0;

  if (currentUses >= FREE_AI_USES) {
    // Ya agotó el uso gratuito.
    return { allowed: false };
  }

  // Primer uso: consumir el crédito incrementando el contador.
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ ai_uses: currentUses + 1 })
    .eq("id", userId);

  if (updateErr) {
    // Si falla el incremento, bloqueamos para evitar acceso no contabilizado.
    console.error("[usageGate] Error incrementando ai_uses", updateErr);
    return { allowed: false };
  }

  return { allowed: true };
}
