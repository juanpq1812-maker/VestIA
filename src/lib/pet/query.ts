// Lectura del estado de Hebri para Server Components (Home, /pet).
//
// Solo un SELECT liviano sobre `profiles` — el decaimiento se deriva en
// memoria con `computePetState`, sin queries pesadas ni funciones SQL en el
// camino de lectura (esas quedan reservadas para cuando de verdad hay una
// acción que registrar, vía `recordPetAction`).

import type { SupabaseClient } from "@supabase/supabase-js";
import { computePetState, type PetState } from "./compute";

export async function getPetState(
  supabase: SupabaseClient,
  userId: string
): Promise<PetState> {
  const { data, error } = await supabase
    .from("profiles")
    .select("pet_score_base, pet_score_updated_at, pet_last_opened_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    // Perfil recién creado o error transitorio: Hebri arranca feliz.
    return { score: 100, mood: "feliz", isDirty: false };
  }

  return computePetState({
    scoreBase: data.pet_score_base,
    scoreUpdatedAt: data.pet_score_updated_at,
    lastOpenedAt: data.pet_last_opened_at,
  });
}
