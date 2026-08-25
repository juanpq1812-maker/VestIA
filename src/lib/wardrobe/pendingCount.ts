// Cuántas prendas tiene el usuario esperando confirmación, para el aviso que
// se pinta en el armario y en el inicio (PendingItemsBanner).
//
// EL PROBLEMA QUE RESUELVE. Una prenda escaneada no entra al armario hasta que
// el usuario confirma el lote en /wardrobe/upload/review. Si sale de esa
// pantalla sin confirmar, la prenda queda viva en la base — pero no hay ni una
// sola señal de eso en ninguna pantalla que el usuario visite normalmente.
// Reaparecía solo por casualidad, si volvía a escanear algo. Reportado desde
// producción: "se me desapareció, creí que la había perdido".
//
// Es un estado real del armario, no una notificación, así que se lee del
// servidor en cada render y no se guarda en ningún lado.

import type { SupabaseClient } from "@supabase/supabase-js";

// Mismos estados que `fetchPendingItems` en burstQueue.ts. Tienen que ser los
// mismos: si el aviso contara distinto de lo que /review va a listar, serían
// dos afirmaciones distintas sobre la misma cosa y una de las dos estaría
// mintiendo.
const ESTADOS_PENDIENTES = ["draft", "processing", "ready", "error"] as const;

// Espejo de STALE_DRAFT_DAYS en burstQueue.ts. No se importa a propósito: ese
// módulo arrastra las Server Actions del pipeline de imagen, y esto lo llaman
// Server Components que no deben cargar nada de eso. Si cambias allá, cambia
// acá — el test lo deja anotado.
export const DIAS_ANTES_DE_LIMPIAR = 7;

/**
 * Cuenta las prendas pendientes de confirmar.
 *
 * `head: true` — solo viaja el número, no las filas.
 *
 * OJO CON EL CORTE. `cleanupStaleDrafts` borra los 'draft'/'processing'/'error'
 * con más de DIAS_ANTES_DE_LIMPIAR días, y corre al montar /review. Si el
 * aviso los contara, pasaría esto: el usuario ve "3 prendas sin confirmar",
 * toca "Revisarlas", la limpieza borra una en el mount, y la pantalla le
 * muestra 2. El aviso habría prometido algo que la pantalla no cumple.
 *
 * Por eso se cuenta lo que va a seguir existiendo cuando llegue: las 'ready'
 * siempre (esas no las borra nadie) y el resto solo si son más recientes que
 * el corte. Esto NO cambia la política de borrado, solo evita que el aviso
 * hable de prendas condenadas.
 */
export async function contarPendientes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<number> {
  const corte = new Date(
    Date.now() - DIAS_ANTES_DE_LIMPIAR * 24 * 60 * 60 * 1000
  ).toISOString();

  const { count, error } = await supabase
    .from("clothing_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ESTADOS_PENDIENTES)
    .or(`status.eq.ready,created_at.gte.${corte}`);

  // Sin dato no se afirma nada: 0 apaga el aviso. Un aviso inventado sobre una
  // consulta fallida es peor que no avisar — mandaría al usuario a una
  // pantalla vacía a buscar prendas que quizá no existen.
  if (error) {
    console.error("[pendingCount] no se pudo contar pendientes:", error.message);
    return 0;
  }

  return count ?? 0;
}

/**
 * El texto del aviso. Puro y testeable — el plural es la parte que se rompe
 * sola cuando alguien la escribe apurado.
 *
 * Devuelve null cuando no hay nada que avisar, para que el call site no tenga
 * que acordarse de chequear el 0.
 */
export function textoPendientes(
  count: number
): { titulo: string; detalle: string; cta: string } | null {
  if (count <= 0) return null;
  return {
    cta: count === 1 ? "Revisarla" : "Revisarlas",
    titulo:
      count === 1
        ? "Tienes 1 prenda sin confirmar"
        : `Tienes ${count} prendas sin confirmar`,
    detalle:
      count === 1
        ? "No aparece en tu armario hasta que la revises."
        : "No aparecen en tu armario hasta que las revises.",
  };
}
