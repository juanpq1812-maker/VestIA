// Purga global de borradores vencidos, para el cron diario.
//
// POR QUÉ EXISTE, SI YA HABÍA UNA LIMPIEZA. `cleanupStaleDrafts` (burstQueue.ts)
// es perezosa: corre solo cuando ESE usuario abre la captura en ráfaga o la
// pantalla de revisión. Funciona para quien sigue usando la app y no hace
// absolutamente nada por quien subió fotos, se fue y no volvió — que es
// justamente la persona cuyos datos más importa borrar, y la que la política
// de privacidad menciona al prometer el borrado a los 7 días. Sin este cron,
// esa promesa era falsa precisamente para el usuario inactivo.
//
// Corre con la service_role (salta RLS) porque tiene que ver los borradores de
// todos, no los de una sesión.

import type { SupabaseClient } from "@supabase/supabase-js";
import { CLOTHING_IMAGES_BUCKET } from "@/lib/storage/clothingImages";
import { DIAS_ANTES_DE_LIMPIAR } from "@/lib/wardrobe/pendingCount";

// Mismos estados que cleanupStaleDrafts. 'ready' NO entra: son prendas que ya
// pasaron por la IA y esperan confirmación del usuario; esas no las borra
// nadie por tiempo.
const ESTADOS_PURGABLES = ["draft", "processing", "error"] as const;

// Tope por corrida para no pasarnos del tiempo de la función. Lo que sobre se
// va en la corrida del día siguiente; el cron es diario y el corte son 7 días,
// así que hay muchísimo margen antes de que un borrador se salve por acumular.
const LOTE_MAXIMO = 500;

export type PurgaResult = {
  borradas: number;
  imagenesBorradas: number;
  /** true si se alcanzó el tope y quedan más para la próxima corrida. */
  quedanMas: boolean;
};

export async function purgarBorradoresVencidos(
  admin: SupabaseClient
): Promise<PurgaResult> {
  const corte = new Date(
    Date.now() - DIAS_ANTES_DE_LIMPIAR * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: vencidas, error } = await admin
    .from("clothing_items")
    .select("id, raw_image_path, image_path")
    .in("status", ESTADOS_PURGABLES)
    .lt("created_at", corte)
    .limit(LOTE_MAXIMO);

  if (error) throw new Error(`No se pudieron leer los borradores: ${error.message}`);
  if (!vencidas || vencidas.length === 0) {
    return { borradas: 0, imagenesBorradas: 0, quedanMas: false };
  }

  const paths = vencidas.flatMap(
    (i: { raw_image_path: string | null; image_path: string | null }) =>
      [i.raw_image_path, i.image_path].filter((p): p is string => Boolean(p))
  );

  // El borrado de imágenes va primero y no aborta la corrida si falla: una
  // imagen huérfana en el bucket es un problema de costo; una fila que
  // sobrevive es un incumplimiento del texto de la política.
  let imagenesBorradas = 0;
  if (paths.length > 0) {
    const { error: storageError } = await admin.storage
      .from(CLOTHING_IMAGES_BUCKET)
      .remove(paths);
    if (storageError) {
      console.error("[purgarBorradoresVencidos] fallo borrando imágenes", storageError);
    } else {
      imagenesBorradas = paths.length;
    }
  }

  const ids = vencidas.map((i: { id: string }) => i.id);
  const { error: deleteError } = await admin
    .from("clothing_items")
    .delete()
    .in("id", ids);

  if (deleteError) {
    throw new Error(`No se pudieron borrar los borradores: ${deleteError.message}`);
  }

  return {
    borradas: ids.length,
    imagenesBorradas,
    quedanMas: vencidas.length === LOTE_MAXIMO,
  };
}
