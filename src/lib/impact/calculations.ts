// Calculos de impacto ambiental de StrandIA.
//
// Toda la matematica vive aqui (puro, sin acceso a base de datos) para que
// sea trivial de testear y reutilizar entre la pantalla actual y futuras
// (compartir en redes, exportar PDF, etc.).
//
// Fuente de los factores: ONU Environment 2024 — Industria Textil.
// - Producir una prenda nueva implica ~8.5 kg CO2 y ~2.500 L de agua.
// - Un árbol adulto absorbe ~22 kg CO2 al año.
//
// La metrica base de StrandIA es `usos_unicos`: cuantas filas tiene el usuario
// en la tabla `outfit_uses`. Es decir, cuantas veces de verdad uso un outfit
// armado con su armario en lugar de comprar ropa nueva.

export const CO2_KG_PER_USE = 8.5;
export const WATER_LITERS_PER_USE = 2_500;
export const CO2_KG_ABSORBED_PER_TREE_PER_YEAR = 22;

// Proyeccion para usuarios sin datos: 3 outfits/semana * 52 semanas.
export const PROJECTED_USES_PER_YEAR = 3 * 52; // 156

export type ImpactNumbers = {
  /** Numero de filas en outfit_uses del usuario (uso real). */
  uses: number;
  /** kg de CO2 evitados (uses * 8.5). */
  co2Kg: number;
  /** Árboles equivalentes (co2Kg / 22), redondeado al entero más cercano. */
  trees: number;
  /** Litros de agua ahorrados (uses * 2.500). */
  waterLiters: number;
};

/**
 * Calcula los 3 números de impacto a partir del número de usos registrados.
 * Para uses=0 devuelve todo en cero — el caso "sin datos" se decide afuera
 * comparando `uses === 0`, no metiendo lógica condicional aquí.
 */
export function computeImpact(uses: number): ImpactNumbers {
  const safeUses = Math.max(0, Math.floor(uses));
  const co2Kg = safeUses * CO2_KG_PER_USE;
  return {
    uses: safeUses,
    co2Kg,
    trees: Math.round(co2Kg / CO2_KG_ABSORBED_PER_TREE_PER_YEAR),
    waterLiters: safeUses * WATER_LITERS_PER_USE,
  };
}

/** Proyección a 1 año para usuarios sin datos. Usa PROJECTED_USES_PER_YEAR. */
export function projectedImpact(): ImpactNumbers {
  return computeImpact(PROJECTED_USES_PER_YEAR);
}

// ---------------------------------------------------------------------------
// Formato de numeros en espanol (separador de miles con punto, decimales con
// coma). Usamos el locale "es-CO" porque coincide con el contexto del
// proyecto (Bogota, Colombia).
// ---------------------------------------------------------------------------

const esFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

/**
 * Formatea un numero entero con separador de miles "." (1326 -> "1.326").
 * Si el valor no es entero, lo redondea para evitar mostrar decimales en la
 * UI (los factores son aproximaciones, no se justifica precision decimal).
 */
export function formatEsNumber(value: number): string {
  return esFormatter.format(Math.round(value));
}
