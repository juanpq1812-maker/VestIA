// Mínimos de armario para poder generar outfits.
//
// Antes de esto, `generateOutfits` solo exigía `items.length >= 2`, pero más
// abajo descartaba cualquier outfit con menos de 3 prendas válidas. Con un
// armario chico la generación fallaba SIEMPRE y el usuario veía "La IA propuso
// prendas que no existen en tu armario" — un mensaje falso que hace parecer que
// la app está rota. Este módulo mueve el bloqueo al principio, donde se puede
// explicar bien qué falta.
//
// Por qué 2 tops + 2 bottoms y no 1 + 1: el generador propone 2 outfits que
// deben ser CLARAMENTE distintos entre sí. Con 1 top y 1 bottom solo existe una
// combinación posible y las dos propuestas salen iguales — peor primera
// impresión que el bloqueo.
//
// Función pura, sin dependencias de runtime (solo `import type`, que Node borra
// con type-stripping): así se puede testear con `node --test` sin resolver el
// alias `@/` ni levantar Supabase.

import type { ClothingCategory } from "@/types/database";

/** Conteo de prendas confirmadas por categoría. */
export type CategoryCounts = Partial<Record<ClothingCategory, number>>;

export type MinimumRequirement = {
  /** Cuántas prendas de esta categoría tiene hoy el usuario. */
  have: number;
  /** Cuántas necesita para desbloquear la generación. */
  need: number;
  ok: boolean;
};

export type WardrobeMinimums = {
  ok: boolean;
  /** true cuando el armario está completamente vacío (empty state distinto). */
  empty: boolean;
  footwear: MinimumRequirement;
  tops: MinimumRequirement;
  bottoms: MinimumRequirement;
  /** Vestidos/enterizos: sustituyen la dupla top+bottom (ver `satisfiedVia`). */
  dresses: MinimumRequirement;
  /**
   * Por cuál de los dos caminos se cumplió (o se está más cerca de cumplir) la
   * base del outfit. `null` si todavía no se cumple ninguno.
   */
  satisfiedVia: "tops-bottoms" | "dress" | null;
};

export const MIN_FOOTWEAR = 1;
export const MIN_TOPS = 2;
export const MIN_BOTTOMS = 2;
export const MIN_DRESSES = 1;
/** Con un vestido basta 1 prenda extra (top o bottom) para variar el segundo look. */
export const MIN_DRESS_COMPANIONS = 1;

function req(have: number, need: number): MinimumRequirement {
  return { have, need, ok: have >= need };
}

/**
 * ¿El armario da para generar outfits decentes?
 *
 * Requisito: 1 calzado, Y (2 tops y 2 bottoms) O (1 vestido + 1 top o bottom).
 */
export function checkWardrobeMinimums(counts: CategoryCounts): WardrobeMinimums {
  const tops = counts.top ?? 0;
  const bottoms = counts.bottom ?? 0;
  const dresses = counts.dress ?? 0;
  const footwear = counts.footwear ?? 0;

  const total =
    tops + bottoms + dresses + footwear + (counts.outerwear ?? 0) + (counts.accessory ?? 0);

  const viaTopsBottoms = tops >= MIN_TOPS && bottoms >= MIN_BOTTOMS;
  const viaDress =
    dresses >= MIN_DRESSES && tops + bottoms >= MIN_DRESS_COMPANIONS;

  const baseOk = viaTopsBottoms || viaDress;
  const footwearOk = footwear >= MIN_FOOTWEAR;

  return {
    ok: baseOk && footwearOk,
    empty: total === 0,
    footwear: req(footwear, MIN_FOOTWEAR),
    tops: req(tops, MIN_TOPS),
    bottoms: req(bottoms, MIN_BOTTOMS),
    dresses: req(dresses, MIN_DRESSES),
    satisfiedVia: viaTopsBottoms ? "tops-bottoms" : viaDress ? "dress" : null,
  };
}

/** Cuenta por categoría a partir de la lista de prendas. */
export function countByCategory(
  items: readonly { category: ClothingCategory }[]
): CategoryCounts {
  const counts: CategoryCounts = {};
  for (const item of items) {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
  }
  return counts;
}

/**
 * Mensaje de una sola frase para contextos sin UI de checklist (el error de la
 * sugerencia de outfit por evento de calendario, por ejemplo). La pantalla
 * /outfits NO usa esto: ahí va `<WardrobeMinimumsChecklist>`, que es accionable.
 */
export function describeMissingMinimums(min: WardrobeMinimums): string {
  const faltan: string[] = [];
  if (!min.footwear.ok) faltan.push("1 par de zapatos");
  if (min.satisfiedVia === null) {
    const topsFaltantes = MIN_TOPS - min.tops.have;
    const bottomsFaltantes = MIN_BOTTOMS - min.bottoms.have;
    if (topsFaltantes > 0) {
      faltan.push(`${topsFaltantes} prenda${topsFaltantes === 1 ? "" : "s"} de arriba`);
    }
    if (bottomsFaltantes > 0) {
      faltan.push(`${bottomsFaltantes} prenda${bottomsFaltantes === 1 ? "" : "s"} de abajo`);
    }
  }

  if (faltan.length === 0) return "Te faltan prendas para poder generar outfits.";

  const lista =
    faltan.length === 1
      ? faltan[0]
      : `${faltan.slice(0, -1).join(", ")} y ${faltan[faltan.length - 1]}`;

  return `Para armar outfits necesitas subir ${lista}.`;
}
