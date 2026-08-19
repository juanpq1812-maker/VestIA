// "El look de hoy": qué outfit propone el home cuando el usuario NO tiene un
// evento próximo en el calendario.
//
// Por qué esto no llama a la IA. El hero del home lo ve todo usuario cada vez
// que abre la app. Generar con IA ahí deja dos salidas y las dos son malas:
// regalar generaciones por fuera del plan, o quemarle al usuario free su cuota
// mensual (10, ver lib/plans/constants.ts) en algo que no pidió — abre la app
// diez días y se queda sin mes sin haber tocado el generador.
//
// En su lugar se elige entre los outfits que el usuario YA tiene guardados,
// con una semilla derivada de (user_id, día de Bogotá). Es determinista: el
// mismo día siempre devuelve el mismo look, así que no hace falta cachearlo en
// ninguna tabla y no "cambia solo" si la página se re-renderiza. A medianoche
// de Bogotá rota.
//
// Función pura, sin dependencias de runtime: testeable con `node --test` sin
// resolver el alias `@/` (mismo criterio que lib/wardrobe/outfitRules.ts).

/** Lo mínimo que necesita el selector de cada outfit guardado. */
export type OutfitCandidato = {
  id: string;
  name: string | null;
  occasion: string | null;
  clothing_item_ids: string[];
};

/**
 * Un outfit necesita al menos 3 prendas para leerse como un look completo
 * (calzado + la base de arriba/abajo, o vestido + calzado + algo). Los outfits
 * guardados deberían cumplirlo, pero un armario editado a mano puede dejar
 * filas cortas y no queremos que el hero muestre "un look" de una prenda.
 */
export const MIN_PRENDAS_LOOK = 3;

/**
 * Hash estable de una cadena → entero sin signo.
 *
 * Mismo esquema que `jitter()` en components/outfits/OutfitMoodboard.tsx: tiene
 * que dar igual en servidor y cliente, y no puede depender de Math.random ni
 * del orden de inserción de la DB.
 */
export function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/** Semilla del día: mismo usuario + mismo día bogotano = mismo look. */
export function seedDelDia(userId: string, bogotaDay: string): string {
  return `${userId}|${bogotaDay}`;
}

/**
 * Elige el look del día entre los outfits guardados.
 *
 * Prefiere los que no se han usado en la ventana reciente — proponer hoy lo
 * que el usuario se puso ayer no es una sugerencia. Si TODOS son recientes,
 * cae sobre la lista completa en vez de devolver nada: un hero con contenido
 * repetido es mejor que un hero vacío.
 *
 * Devuelve `null` solo si no hay ningún outfit con suficientes prendas — ahí
 * el llamador debe mostrar el estado de armario incompleto.
 */
export function pickLookDelDia(params: {
  seed: string;
  outfits: readonly OutfitCandidato[];
  /** Outfits usados en los últimos días; se evitan si hay alternativa. */
  usadosRecientemente: ReadonlySet<string>;
}): OutfitCandidato | null {
  const { seed, outfits, usadosRecientemente } = params;

  // Orden estable por id: la DB no garantiza orden y el índice debe ser
  // reproducible entre renders.
  const completos = outfits
    .filter((o) => (o.clothing_item_ids?.length ?? 0) >= MIN_PRENDAS_LOOK)
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  if (completos.length === 0) return null;

  const frescos = completos.filter((o) => !usadosRecientemente.has(o.id));
  const pool = frescos.length > 0 ? frescos : completos;

  return pool[hashSeed(seed) % pool.length];
}
