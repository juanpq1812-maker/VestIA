// Server Action de /profile/privacy: borrado definitivo de la cuenta.
//
// Flujo:
//   1. Validar sesión y que el usuario escribió la confirmación exacta.
//   2. Borrar las fotos del bucket `clothing-images/{userId}/` (el Storage
//      no cascadea con la base de datos).
//   3. Borrar el usuario de auth.users con la service_role key — profiles
//      cascadea (FK on delete cascade) y arrastra preferencias, prendas,
//      outfits, usos y calendario.
//   4. Cerrar la sesión local. El cliente redirige al landing.

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { CLOTHING_IMAGES_BUCKET } from "@/lib/storage/clothingImages";

// Ojo: un archivo "use server" solo puede exportar funciones async, por eso
// esta constante no se exporta (el cliente tiene su propia copia).
const DELETE_CONFIRMATION = "ELIMINAR";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteAccountAction(
  confirmation: string
): Promise<DeleteAccountResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }

  if (confirmation.trim().toUpperCase() !== DELETE_CONFIRMATION) {
    return {
      ok: false,
      error: `Escribe "${DELETE_CONFIRMATION}" para confirmar.`,
    };
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (err) {
    console.error("[deleteAccountAction] admin client no disponible", err);
    return {
      ok: false,
      error:
        "El borrado de cuenta no está disponible en este momento. Escríbenos y lo hacemos por ti.",
    };
  }

  // 1. Fotos del Storage. Si esto falla no abortamos el borrado de la cuenta:
  //    preferimos una carpeta huérfana a dejar al usuario con una cuenta que
  //    pidió eliminar. Lo logueamos para limpieza manual.
  try {
    const { data: files, error: listErr } = await admin.storage
      .from(CLOTHING_IMAGES_BUCKET)
      .list(user.id, { limit: 1000 });
    if (listErr) throw listErr;
    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      const { error: removeErr } = await admin.storage
        .from(CLOTHING_IMAGES_BUCKET)
        .remove(paths);
      if (removeErr) throw removeErr;
    }
  } catch (err) {
    console.error(
      `[deleteAccountAction] no se pudieron borrar las fotos de ${user.id} — limpiar manualmente`,
      err
    );
  }

  // 2. Usuario de Auth — cascadea profiles y todas las tablas del usuario.
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    console.error("[deleteAccountAction] error borrando el usuario", deleteErr);
    return {
      ok: false,
      error: "No pudimos borrar tu cuenta. Intenta de nuevo o escríbenos.",
    };
  }

  // 3. Limpia la cookie de sesión local (el usuario ya no existe).
  await supabase.auth.signOut();

  return { ok: true };
}
