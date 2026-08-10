// Fuente unica de verdad del plan de un usuario y su consumo de cuotas.
//
// Solo lectura — no consume nada. Para consumir, usar
// checkAndConsumeGeneration / checkAndConsumePhotoImprovement (mismo
// archivo `src/lib/plans/`), que sí escriben.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentBogotaMonth } from "@/lib/date/bogotaMonth";
import { FREE_MONTHLY_GENERATIONS, FREE_PHOTO_IMPROVEMENTS } from "./constants";
import { isPremiumFrom } from "./planLogic";

export type PlanInfo = {
  plan: "free" | "premium";
  /**
   * Derivado, no leido directo de `plan`: `plan === 'premium' &&
   * (premiumUntil === null || premiumUntil > now)`. Un premium vencido se
   * comporta como free automaticamente, sin job que degrade la fila.
   */
  isPremium: boolean;
  premiumUntil: string | null;
  generationsUsed: number;
  /** `null` en premium: sin cuota mensual. */
  generationsLimit: number | null;
  /** `null` en premium. */
  generationsRemaining: number | null;
  photoImprovementsUsed: number;
  /** `null` en premium: mejoras ilimitadas. */
  photoImprovementsRemaining: number | null;
};

/** PlanInfo de fail-closed: se usa si hay error de DB, para no dejar pasar
 * cuota no contada. Igual criterio que usageGate.ts. */
function failClosedPlanInfo(): PlanInfo {
  return {
    plan: "free",
    isPremium: false,
    premiumUntil: null,
    generationsUsed: FREE_MONTHLY_GENERATIONS,
    generationsLimit: FREE_MONTHLY_GENERATIONS,
    generationsRemaining: 0,
    photoImprovementsUsed: FREE_PHOTO_IMPROVEMENTS,
    photoImprovementsRemaining: 0,
  };
}

export async function getUserPlan(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<PlanInfo> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "plan, premium_until, monthly_generations, monthly_generations_month, photo_improvements_used"
    )
    .eq("id", userId)
    .single();

  if (error || !profile) {
    console.error("[getUserPlan] Error leyendo perfil:", error);
    return failClosedPlanInfo();
  }

  const premiumUntil = profile.premium_until as string | null;
  const isPremium = isPremiumFrom(profile.plan, premiumUntil);

  if (isPremium) {
    return {
      plan: "premium",
      isPremium: true,
      premiumUntil,
      generationsUsed: 0,
      generationsLimit: null,
      generationsRemaining: null,
      photoImprovementsUsed: profile.photo_improvements_used ?? 0,
      photoImprovementsRemaining: null,
    };
  }

  // Free (o premium vencido). El mes guardado puede no ser el actual — en
  // ese caso el contador se lee como 0 SIN escribir: una lectura de pagina
  // no debe mutar estado, eso es trabajo de checkAndConsumeGeneration.
  const currentMonth = getCurrentBogotaMonth();
  const generationsUsed =
    profile.monthly_generations_month === currentMonth
      ? (profile.monthly_generations ?? 0)
      : 0;

  return {
    plan: "free",
    isPremium: false,
    premiumUntil,
    generationsUsed,
    generationsLimit: FREE_MONTHLY_GENERATIONS,
    generationsRemaining: Math.max(0, FREE_MONTHLY_GENERATIONS - generationsUsed),
    photoImprovementsUsed: profile.photo_improvements_used ?? 0,
    photoImprovementsRemaining: Math.max(
      0,
      FREE_PHOTO_IMPROVEMENTS - (profile.photo_improvements_used ?? 0)
    ),
  };
}
