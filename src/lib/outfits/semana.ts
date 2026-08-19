// "Tu semana": qué outfits usó el usuario en los últimos días.
//
// Sale del historial real (`outfit_uses`), no de lo que la app propuso. Es lo
// que cierra el bucle del hero: al pulsar "Usar este look" se escribe una fila
// ahí, y al día siguiente el look aparece en esta tira.
//
// Función pura, sin dependencias de runtime: testeable con `node --test` sin
// resolver el alias `@/`.

/** Cuántos días atrás mira la tira. */
export const SEMANA_DIAS = 7;
/** Tope de tarjetas: más no caben sin que la tira se vuelva un catálogo. */
export const SEMANA_MAX = 5;

export type UsoDeOutfit = { outfit_id: string; used_date: string };

export type DiaDeLaSemana = {
  outfitId: string;
  /** "YYYY-MM-DD" del uso más reciente de ese outfit. */
  usedDate: string;
};

/**
 * Los outfits usados en la ventana, del más reciente al más antiguo.
 *
 * Deduplica por outfit: si el usuario repitió el mismo look el lunes y el
 * jueves, ocupa una sola tarjeta con la fecha más reciente. Mostrarlo dos
 * veces haría ver la semana más variada de lo que fue, que es justo lo
 * contrario de lo que esta tira debe comunicar.
 */
export function outfitsDeLaSemana(
  usos: readonly UsoDeOutfit[],
  desdeIso: string
): DiaDeLaSemana[] {
  const masReciente = new Map<string, string>();
  for (const u of usos) {
    if (u.used_date < desdeIso) continue;
    const prev = masReciente.get(u.outfit_id);
    if (!prev || u.used_date > prev) masReciente.set(u.outfit_id, u.used_date);
  }

  return [...masReciente.entries()]
    .map(([outfitId, usedDate]) => ({ outfitId, usedDate }))
    .sort((a, b) =>
      a.usedDate === b.usedDate
        ? a.outfitId < b.outfitId
          ? -1
          : 1
        : a.usedDate > b.usedDate
          ? -1
          : 1
    )
    .slice(0, SEMANA_MAX);
}

/**
 * Etiqueta corta de una fecha ISO: "hoy", "ayer" o "mié 13".
 *
 * Compara por cadena y no por Date para no reintroducir el problema de zona
 * horaria: `used_date` ya es un día natural de Bogotá.
 */
export function etiquetaDeDia(usedDate: string, hoyIso: string, ayerIso: string): string {
  if (usedDate === hoyIso) return "hoy";
  if (usedDate === ayerIso) return "ayer";
  // El mediodía UTC cae dentro del mismo día en cualquier zona americana.
  const d = new Date(`${usedDate}T12:00:00Z`);
  return d
    .toLocaleDateString("es-CO", { weekday: "short", day: "numeric", timeZone: "UTC" })
    .replace(",", "");
}
