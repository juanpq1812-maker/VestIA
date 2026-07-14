// Server Action de /comunidad: reclamar un Fashion Quest completado.
// Delega toda la verificacion (progreso real, anti-doble-cobro, puntos,
// Hebri) a complete_quest() — ver supabase/migrations/0014_complete_quest.sql.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export type CompleteQuestResult =
  | { ok: true; pointsAwarded: number; newTotalPoints: number; benefitUnlocked: boolean }
  | { ok: false; error: string };

export async function completeQuestAction(questId: string): Promise<CompleteQuestResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sesión expirada." };
  }

  const { data, error } = await supabase
    .rpc("complete_quest", { p_quest_id: questId })
    .single<{ points_awarded: number; new_total_points: number; benefit_unlocked: boolean }>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo reclamar el quest." };
  }

  revalidatePath("/comunidad");

  return {
    ok: true,
    pointsAwarded: data.points_awarded,
    newTotalPoints: data.new_total_points,
    benefitUnlocked: data.benefit_unlocked,
  };
}
