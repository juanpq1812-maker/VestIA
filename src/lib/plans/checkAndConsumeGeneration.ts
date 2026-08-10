// Gate de cuota mensual de generaciones de outfits para el plan free.
//
// Capa independiente del rate limit horario (checkAndConsumeAiUse en
// src/lib/ai/usageGate.ts) — conviven, no se reemplazan. El orden en el
// caller importa: primero este gate (cuota de plan), despues el rate limit
// horario, para que un usuario sin cuota vea el mensaje de plan y no el de
// "espera una hora".
//
// La decision en si (reset de mes, limite, isPremium) vive en planLogic.ts
// como funcion pura — este archivo solo lee/escribe la DB y aplica lo que
// esa funcion devuelve. Fail-closed: error de DB bloquea.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentBogotaMonth } from "@/lib/date/bogotaMonth";
import { FREE_MONTHLY_GENERATIONS } from "./constants";
import { isPremiumFrom, resolveGenerationDecision } from "./planLogic";

export type PlanGateResult =
  | { allowed: true; remaining: number | null }
  | { allowed: false; reason: "plan_limit"; resetsOn: string };

/** Primer dia del proximo mes en Bogota, como fecha legible ("1 de septiembre"). */
function nextMonthResetLabel(): string {
  const bogotaNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })
  );
  const nextMonth = new Date(bogotaNow.getFullYear(), bogotaNow.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString("es-CO", { day: "numeric", month: "long" });
}

/**
 * Verifica si el usuario puede generar un outfit segun su cuota de plan, y
 * consume una unidad si aplica.
 */
export async function checkAndConsumeGeneration(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<PlanGateResult> {
  const { data: profile, error: readErr } = await supabase
    .from("profiles")
    .select("plan, premium_until, monthly_generations, monthly_generations_month")
    .eq("id", userId)
    .single();

  if (readErr || !profile) {
    console.error("[checkAndConsumeGeneration] Error leyendo perfil:", readErr);
    return { allowed: false, reason: "plan_limit", resetsOn: nextMonthResetLabel() };
  }

  const decision = resolveGenerationDecision({
    isPremium: isPremiumFrom(profile.plan, profile.premium_until),
    monthlyGenerations: profile.monthly_generations ?? 0,
    monthlyGenerationsMonth: profile.monthly_generations_month,
    currentMonth: getCurrentBogotaMonth(),
    limit: FREE_MONTHLY_GENERATIONS,
  });

  if (!decision.allowed) {
    return { allowed: false, reason: "plan_limit", resetsOn: nextMonthResetLabel() };
  }

  if (decision.write) {
    const { error: updateErr } = await supabase
      .from("profiles")
      .update(decision.write)
      .eq("id", userId);

    if (updateErr) {
      console.error("[checkAndConsumeGeneration] Error escribiendo cuota:", updateErr);
      return { allowed: false, reason: "plan_limit", resetsOn: nextMonthResetLabel() };
    }
  }

  return { allowed: true, remaining: decision.remaining };
}
