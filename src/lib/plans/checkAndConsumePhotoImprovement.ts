// Gate de cuota de por vida para "Mejora esta foto" en el plan free.
//
// Mismo criterio que checkAndConsumeGeneration (capa independiente del rate
// limit horario, se llama antes de este), pero sin ventana de tiempo: el
// contador nunca se reinicia. Decision pura en planLogic.ts.

import type { SupabaseClient } from "@supabase/supabase-js";
import { FREE_PHOTO_IMPROVEMENTS } from "./constants";
import { isPremiumFrom, resolvePhotoImprovementDecision } from "./planLogic";

export type PhotoImprovementGateResult =
  | { allowed: true }
  | { allowed: false; reason: "plan_limit" };

/**
 * Verifica si el usuario puede usar "Mejora esta foto" segun su cuota de
 * plan (de por vida), y consume una unidad si aplica. Fail-closed.
 */
export async function checkAndConsumePhotoImprovement(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<PhotoImprovementGateResult> {
  const { data: profile, error: readErr } = await supabase
    .from("profiles")
    .select("plan, premium_until, photo_improvements_used")
    .eq("id", userId)
    .single();

  if (readErr || !profile) {
    console.error("[checkAndConsumePhotoImprovement] Error leyendo perfil:", readErr);
    return { allowed: false, reason: "plan_limit" };
  }

  const decision = resolvePhotoImprovementDecision({
    isPremium: isPremiumFrom(profile.plan, profile.premium_until),
    photoImprovementsUsed: profile.photo_improvements_used ?? 0,
    limit: FREE_PHOTO_IMPROVEMENTS,
  });

  if (!decision.allowed) {
    return { allowed: false, reason: "plan_limit" };
  }

  if (decision.write) {
    const { error: updateErr } = await supabase
      .from("profiles")
      .update(decision.write)
      .eq("id", userId);

    if (updateErr) {
      console.error("[checkAndConsumePhotoImprovement] Error escribiendo cuota:", updateErr);
      return { allowed: false, reason: "plan_limit" };
    }
  }

  return { allowed: true };
}
