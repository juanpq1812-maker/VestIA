// Lógica pura de la capa de planes: sin Supabase, sin imports de otros
// módulos del proyecto — testeable con `node --test` sin resolver el alias
// `@/` (mismo criterio que src/lib/wardrobe/outfitRules.ts).
//
// Los gates (checkAndConsumeGeneration.ts, checkAndConsumePhotoImprovement.ts)
// y getUserPlan.ts son wrappers delgados sobre esto que sí tocan la DB — la
// decisión en sí vive acá para poder testearla sin mockear Supabase.

/**
 * `isPremium` se deriva, no se lee directo de `plan`: un premium con
 * `premiumUntil` vencido se comporta como free automáticamente, sin job que
 * degrade la fila.
 */
export function isPremiumFrom(
  plan: "free" | "premium",
  premiumUntil: string | null,
  nowMs: number = Date.now()
): boolean {
  return (
    plan === "premium" &&
    (premiumUntil === null || new Date(premiumUntil).getTime() > nowMs)
  );
}

export type GenerationDecision =
  | {
      allowed: true;
      /** `null` si no hay que escribir nada (premium). */
      write: { monthly_generations: number; monthly_generations_month: string } | null;
      /** `null` en premium: sin cuota que contar. */
      remaining: number | null;
    }
  | { allowed: false; reason: "plan_limit" };

/**
 * Decide si una generación de outfit se permite y qué escribir, sin tocar la
 * DB. `currentMonth`/`monthlyGenerationsMonth` en formato "YYYY-MM".
 */
export function resolveGenerationDecision(params: {
  isPremium: boolean;
  monthlyGenerations: number;
  monthlyGenerationsMonth: string | null;
  currentMonth: string;
  limit: number;
}): GenerationDecision {
  const { isPremium, monthlyGenerations, monthlyGenerationsMonth, currentMonth, limit } = params;

  if (isPremium) {
    return { allowed: true, write: null, remaining: null };
  }

  // Mes guardado != mes actual: el contador se trata como si nunca hubiera
  // existido y se reinicia en la misma escritura (ventana implícita, sin cron).
  if (monthlyGenerationsMonth !== currentMonth) {
    return {
      allowed: true,
      write: { monthly_generations: 1, monthly_generations_month: currentMonth },
      remaining: limit - 1,
    };
  }

  if (monthlyGenerations >= limit) {
    return { allowed: false, reason: "plan_limit" };
  }

  const nextUsed = monthlyGenerations + 1;
  return {
    allowed: true,
    write: { monthly_generations: nextUsed, monthly_generations_month: currentMonth },
    remaining: limit - nextUsed,
  };
}

export type PhotoImprovementDecision =
  | { allowed: true; write: { photo_improvements_used: number } | null }
  | { allowed: false; reason: "plan_limit" };

/** Igual que resolveGenerationDecision pero de por vida, sin mes. */
export function resolvePhotoImprovementDecision(params: {
  isPremium: boolean;
  photoImprovementsUsed: number;
  limit: number;
}): PhotoImprovementDecision {
  const { isPremium, photoImprovementsUsed, limit } = params;

  if (isPremium) {
    return { allowed: true, write: null };
  }

  if (photoImprovementsUsed >= limit) {
    return { allowed: false, reason: "plan_limit" };
  }

  return { allowed: true, write: { photo_improvements_used: photoImprovementsUsed + 1 } };
}
