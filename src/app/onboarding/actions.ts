// Server Actions del onboarding.
//
// Esta es la unica pieza del onboarding que toca la base de datos. La llama
// el componente cliente (`OnboardingFlow`) cuando el usuario termina el ultimo
// paso. Aqui:
//   1. Validamos que haya sesion (defensa en profundidad — el Proxy ya lo hace).
//   2. Hacemos UPSERT en `user_preferences` con los datos del onboarding.
//   3. Marcamos `profiles.onboarding_completed = true`.
//   3b. Si el usuario autorizo el uso de fotos de cuerpo entero en el paso 7,
//       dejamos constancia en `legal_consents` (migracion 0037).
//   4. revalidatePath para que la siguiente navegacion vea los datos frescos.
//
// Si algo falla, devolvemos un error legible en espanol para mostrarselo al
// usuario sin romper el formulario.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import type { Gender } from "@/types/database";
import { BODY_PHOTO_CONSENT_VERSION } from "@/lib/legal/constants";

const VALID_GENDERS: Gender[] = ["hombre", "mujer", "prefiero_no_decir"];

export type OnboardingPayload = {
  displayName: string;
  gender: Gender;
  styleTags: string[];
  favoriteOccasions: string[];
  topSize: string | null;
  bottomSize: string | null;
  shoeSize: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  /**
   * Paso 7 (opcional). Solo `true` deja constancia: no registramos "dijo que
   * no", unicamente lo que autorizo. Quien lo salte vera el modal
   * just-in-time cuando entre al modo "outfit completo".
   */
  bodyPhotoConsent: boolean;
};

const DISPLAY_NAME_MIN = 2;
const DISPLAY_NAME_MAX = 30;
const DISPLAY_NAME_REGEX = /^[\p{L}][\p{L} '\-]*$/u;

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

  // Validacion minima: nombre, al menos un estilo y una ocasion.
  const displayName = payload.displayName.trim();
  if (
    displayName.length < DISPLAY_NAME_MIN ||
    displayName.length > DISPLAY_NAME_MAX ||
    !DISPLAY_NAME_REGEX.test(displayName)
  ) {
    return { ok: false, error: "Tu nombre no es valido. Vuelve al primer paso y revisalo." };
  }
  if (payload.styleTags.length === 0) {
    return { ok: false, error: "Elige al menos un estilo." };
  }
  if (payload.favoriteOccasions.length === 0) {
    return { ok: false, error: "Elige al menos una ocasion." };
  }
  if (!VALID_GENDERS.includes(payload.gender)) {
    return { ok: false, error: "Elige una opcion de genero valida." };
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
    .update({
      onboarding_completed: true,
      display_name: displayName,
      gender: payload.gender,
    })
    .eq("id", user.id);

  if (profileError) {
    return {
      ok: false,
      error: `No pudimos marcar el onboarding como completado: ${profileError.message}`,
    };
  }

  // Constancia de la autorizacion de fotos de cuerpo entero (paso 7). Va
  // DESPUES de marcar el onboarding como completado y su fallo NO aborta:
  // el onboarding ya termino y devolver error aqui dejaria al usuario
  // atrapado en un paso que es opcional. Se registra en el log para poder
  // repararlo; si falta la fila, el modal just-in-time se la volvera a pedir
  // cuando entre al modo "outfit completo", que es justo el respaldo.
  if (payload.bodyPhotoConsent) {
    const { error: consentError } = await supabase.from("legal_consents").upsert(
      {
        user_id: user.id,
        document: "body_photo",
        version: BODY_PHOTO_CONSENT_VERSION,
      },
      { onConflict: "user_id,document,version", ignoreDuplicates: true }
    );
    if (consentError) {
      console.error("[saveOnboarding] no se pudo registrar body_photo", consentError, {
        userId: user.id,
        version: BODY_PHOTO_CONSENT_VERSION,
      });
    }
  }

  // Refresca el cache de las rutas que dependen del flag.
  revalidatePath("/wardrobe");
  revalidatePath("/onboarding");

  return { ok: true };
}
