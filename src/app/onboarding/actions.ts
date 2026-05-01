// Server Actions del onboarding.
//
// Esta es la unica pieza del onboarding que toca la base de datos. La llama
// el componente cliente (`OnboardingFlow`) cuando el usuario termina el ultimo
// paso. Aqui:
//   1. Validamos que haya sesion (defensa en profundidad — el Proxy ya lo hace).
//   2. Hacemos UPSERT en `user_preferences` con los datos del onboarding.
//   3. Marcamos `profiles.onboarding_completed = true`.
//   4. revalidatePath para que la siguiente navegacion vea los datos frescos.
//
// Si algo falla, devolvemos un error legible en espanol para mostrarselo al
// usuario sin romper el formulario.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export type OnboardingPayload = {
  styleTags: string[];
  favoriteOccasions: string[];
  topSize: string | null;
  bottomSize: string | null;
  shoeSize: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
};

export type OnboardingResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveOnboarding(
  payload: OnboardingPayload
): Promise<OnboardingResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Tu sesion expiro. Vuelve a iniciar sesion." };
  }

  // Validacion minima: al menos un estilo y una ocasion.
  if (payload.styleTags.length === 0) {
    return { ok: false, error: "Elige al menos un estilo." };
  }
  if (payload.favoriteOccasions.length === 0) {
    return { ok: false, error: "Elige al menos una ocasion." };
  }

  // UPSERT por user_id (la columna tiene UNIQUE), asi si el usuario vuelve al
  // onboarding sus respuestas se actualizan en vez de duplicarse.
  const { error: prefsError } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: user.id,
        style_tags: payload.styleTags,
        favorite_occasions: payload.favoriteOccasions,
        top_size: payload.topSize,
        bottom_size: payload.bottomSize,
        shoe_size: payload.shoeSize,
        chest_cm: payload.chestCm,
        waist_cm: payload.waistCm,
        hip_cm: payload.hipCm,
      },
      { onConflict: "user_id" }
    );

  if (prefsError) {
    return {
      ok: false,
      error: `No pudimos guardar tus preferencias: ${prefsError.message}`,
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  if (profileError) {
    return {
      ok: false,
      error: `No pudimos marcar el onboarding como completado: ${profileError.message}`,
    };
  }

  // Refresca el cache de las rutas que dependen del flag.
  revalidatePath("/wardrobe");
  revalidatePath("/onboarding");

  return { ok: true };
}
