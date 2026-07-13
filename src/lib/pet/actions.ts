// Server Action: único punto desde el que el cliente puede afectar el estado
// de Hebri. Delega todo el cálculo (decaimiento + puntos + clamp) a la
// función SQL `record_pet_action` (SECURITY DEFINER) — nunca escribimos
// `profiles.pet_score_base` directo desde acá, porque esas columnas no
// tienen GRANT UPDATE para el rol `authenticated` (ver migración 0012).

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import type { PetActionType } from "./constants";
import type { PetMood } from "./constants";

export type RecordPetActionResult =
  | { ok: true; score: number; mood: PetMood }
  | { ok: false; error: string };

export async function recordPetAction(
  actionType: PetActionType
): Promise<RecordPetActionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sesión expirada." };
  }

  const { data, error } = await supabase
    .rpc("record_pet_action", { p_action_type: actionType })
    .single<{ new_score: number; new_state: string }>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo actualizar a Hebri." };
  }

  return {
    ok: true,
    score: data.new_score,
    mood: data.new_state as PetMood,
  };
}
