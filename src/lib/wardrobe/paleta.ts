// "Tu paleta": de qué colores está hecho el armario del usuario.
//
// `clothing_items.primary_color` guarda el NOMBRE del color en español, uno de
// los 13 de COLOR_PALETTE — no un hex. Así que esto es un groupBy sobre
// valores conocidos, no un clustering de colores.
//
// Función pura: los hex de pintado los resuelve el llamador con
// `garmentSwatch()`, para no acoplar este módulo a la capa de UI.

/** Bajo este número de prendas la barra no dice nada útil y se oculta. */
export const PALETA_MINIMO_PRENDAS = 8;
/** Colores que se listan por nombre; el resto se agrupa en "Otros". */
export const PALETA_MAX_TRAMOS = 4;

export type TramoDePaleta = {
  /** Nombre del color tal como está en la DB, o "Otros" para el agrupado. */
  nombre: string;
  /** Cuántas prendas. */
  cantidad: number;
  /** Porcentaje entero. Los tramos suman exactamente 100. */
  pct: number;
};

/**
 * Reparte las prendas por color y devuelve tramos que suman 100.
 *
 * El redondeo se hace por resto mayor (Hare-Niemeyer) y no con Math.round
 * suelto: redondear cada tramo por su cuenta produce barras que suman 98 o
 * 103, y la leyenda de porcentajes queda desmintiendo al dibujo.
 *
 * Devuelve [] si no hay prendas con color suficientes — el llamador oculta el
 * bloque en vez de dibujar una barra vacía.
 */
export function calcularPaleta(
  colores: readonly (string | null)[]
): TramoDePaleta[] {
  const conteo = new Map<string, number>();
  for (const raw of colores) {
    const nombre = raw?.trim().toLowerCase();
    if (!nombre) continue;
    conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
  }

  const total = [...conteo.values()].reduce((a, b) => a + b, 0);
  if (total < PALETA_MINIMO_PRENDAS) return [];

  const ordenados = [...conteo.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) =>
      b.cantidad === a.cantidad ? (a.nombre < b.nombre ? -1 : 1) : b.cantidad - a.cantidad
    );

  const principales = ordenados.slice(0, PALETA_MAX_TRAMOS);
  const restoCantidad = ordenados
    .slice(PALETA_MAX_TRAMOS)
    .reduce((acc, c) => acc + c.cantidad, 0);

  const tramos = restoCantidad > 0
    ? [...principales, { nombre: "otros", cantidad: restoCantidad }]
    : principales;

  return repartirPorcentajes(tramos, total);
}

/** Reparto de 100 puntos por resto mayor: los tramos suman exactamente 100. */
function repartirPorcentajes(
  tramos: readonly { nombre: string; cantidad: number }[],
  total: number
): TramoDePaleta[] {
  const exactos = tramos.map((t) => ({ ...t, exacto: (t.cantidad * 100) / total }));
  const base = exactos.map((t) => ({ ...t, pct: Math.floor(t.exacto) }));

  let sobrante = 100 - base.reduce((acc, t) => acc + t.pct, 0);
  const porResto = [...base]
    .map((t, i) => ({ i, resto: t.exacto - Math.floor(t.exacto) }))
    .sort((a, b) => b.resto - a.resto);

  for (const { i } of porResto) {
    if (sobrante <= 0) break;
    base[i].pct += 1;
    sobrante -= 1;
  }

  return base.map(({ nombre, cantidad, pct }) => ({ nombre, cantidad, pct }));
}
