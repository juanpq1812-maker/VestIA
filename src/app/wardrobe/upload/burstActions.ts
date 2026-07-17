"use server";

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import {
  checkAndConsumeBurstUse,
  peekBurstBudget,
  type BurstRateLimitResult,
} from "@/lib/ai/burstUsageGate";

/**
 * Gatea un análisis Claude Vision del modo rafaga y consume un crédito.
 * Se llama justo antes de analizar cada foto en la cola (burstQueue.ts).
 */
export async function checkBurstBudgetAction(): Promise<BurstRateLimitResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { allowed: false, resetInMinutes: 60 };

  return checkAndConsumeBurstUse(user.id, supabase);
}

/**
 * Lectura sin consumir — para mostrar "te quedan X análisis esta hora"
 * antes/mientras se procesa la cola.
 */
export async function peekBurstBudgetAction(): Promise<{
  remaining: number;
  resetInMinutes: number | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { remaining: 0, resetInMinutes: 60 };

  return peekBurstBudget(user.id, supabase);
}
