// Server Action de /profile/style: editar las preferencias de estilo que el
// usuario dio en el onboarding (estilos, ocasiones, tallas y medidas).
//
// Misma tabla y mismo UPSERT que `saveOnboarding`, pero sin tocar
// `profiles.display_name` ni `onboarding_completed` — aquí solo se editan
// preferencias, no identidad ni estado del flujo.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import {
  STYLE_TAGS,
  OCCASION_TAGS,
  TOP_SIZES,
  BOTTOM_SIZES,
  type Gender,
} from "@/types/database";

const VALID_GENDERS: Gender[] = ["hombre", "mujer", "prefiero_no_decir"];

export type StylePreferencesPayload = {
  gender: Gender;
  styleTags: string[];
  favoriteOccasions: string[];
  topSize: string | null;
  bottomSize: string | null;
  shoeSize: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
};

export type SaveStylePreferencesResult =
  | { ok: true }
  | { ok: false; error: string };

// Mismos rangos que los inputs del onboarding.
const SHOE_MIN = 20;
const SHOE_MAX = 55;
const MEDIDA_MIN = 20;
const MEDIDA_MAX = 250;

function medidaValida(n: number | null): boolean {
  return n === null || (n >= MEDIDA_MIN && n <= MEDIDA_MAX);
}

export async function saveStylePreferences(
  payload: StylePreferencesPayload
): Promise<SaveStylePreferencesResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }

  // Solo aceptamos valores del catálogo — cualquier cosa fuera se descarta.
  const styleTags = payload.styleTags.filter((t) =>
    (STYLE_TAGS as readonly string[]).includes(t)
  );
  const favoriteOccasions = payload.favoriteOccasions.filter((t) =>
    (OCCASION_TAGS as readonly string[]).includes(t)
  );

  if (styleTags.length === 0) {
    return { ok: false, error: "Elige al menos un estilo." };
  }
  if (favoriteOccasions.length === 0) {
    return { ok: false, error: "Elige al menos una ocasión." };
  }
  if (!VALID_GENDERS.includes(payload.gender)) {
    return { ok: false, error: "Elige una opción de género válida." };
  }

  const topSize =
    payload.topSize && (TOP_SIZES as readonly string[]).includes(payload.topSize)
      ? payload.topSize
      : null;
  const bottomSize =
    payload.bottomSize &&
    (BOTTOM_SIZES as readonly string[]).includes(payload.bottomSize)
      ? payload.bottomSize
      : null;

  if (
    payload.shoeSize !== null &&
    (payload.shoeSize < SHOE_MIN || payload.shoeSize > SHOE_MAX)
  ) {
    return { ok: false, error: `El número de calzado debe estar entre ${SHOE_MIN} y ${SHOE_MAX}.` };
  }
  if (
    !medidaValida(payload.chestCm) ||
    !medidaValida(payload.waistCm) ||
    !medidaValida(payload.hipCm)
  ) {
    return { ok: false, error: `Las medidas deben estar entre ${MEDIDA_MIN} y ${MEDIDA_MAX} cm.` };
  }

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      style_tags: styleTags,
      favorite_occasions: favoriteOccasions,
      top_size: topSize,
      bottom_size: bottomSize,
      shoe_size: payload.shoeSize,
      chest_cm: payload.chestCm,
      waist_cm: payload.waistCm,
      hip_cm: payload.hipCm,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return {
      ok: false,
      error: `No pudimos guardar tus preferencias: ${error.message}`,
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ gender: payload.gender })
    .eq("id", user.id);

  if (profileError) {
    return {
      ok: false,
      error: `No pudimos guardar tu género: ${profileError.message}`,
    };
  }

  revalidatePath("/profile/style");
  revalidatePath("/profile");

  return { ok: true };
}
