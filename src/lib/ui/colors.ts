// Colores de UI que viven en JS (no en clases Tailwind) porque se usan como
// valores dinámicos inline. Deben mantenerse en sync con los tokens de
// globals.css — si cambia la paleta, este archivo cambia con ella.

import { COLOR_PALETTE } from "@/lib/wardrobe/constants";

/**
 * Placeholder de fondo para imágenes de prendas mientras cargan o cuando la
 * prenda no tiene foto. Espejo del token `--color-surface-2` (#f0edea).
 */
export const GARMENT_PLACEHOLDER_COLOR = "#f0edea";

// `clothing_items.primary_color` NO guarda un hex: guarda el NOMBRE del color
// en español ("azul", "negro", "café"…), uno de los 13 de `COLOR_PALETTE`.
// Ver el comentario sobre la paleta en lib/wardrobe/constants.ts.
//
// Durante mucho tiempo el patrón en la UI fue
//
//     backgroundColor: item.primary_color ?? GARMENT_PLACEHOLDER_COLOR
//
// que es un bug silencioso: el `??` no salta (el valor no es null) y "azul" no
// es un color CSS válido, así que el navegador descartaba la declaración y el
// fondo quedaba transparente. De los 13 nombres solo "beige" es un color CSS
// real — los otros 12 nunca pintaron. Por eso existe `garmentSwatch()`: es el
// único camino permitido de `primary_color` a un valor de color.
const SWATCH_BY_NAME: ReadonlyMap<string, string> = new Map([
  ...COLOR_PALETTE.map((c) => [c.name, c.swatch] as const),
  // Alias de texto libre: prendas viejas y salidas de la IA que no se ciñeron
  // a la paleta. Misma lista que NEUTRAL_ALIASES en lib/wardrobe/outfitRules.ts.
  ["cafe", "#6b3f1d"],
  ["marrón", "#6b3f1d"],
  ["marron", "#6b3f1d"],
  ["camel", "#c19a6b"],
  ["crema", "#f5ebdc"],
  ["navy", "#1e3a5f"],
  ["marino", "#1e3a5f"],
  ["azul marino", "#1e3a5f"],
]);

// "multicolor" existe en la paleta pero su swatch es un `conic-gradient`:
// inválido como `backgroundColor` y como `fillStyle` de canvas. Cae al
// placeholder como cualquier valor que no sepamos pintar.
const UNPAINTABLE = new Set(["multicolor"]);

/**
 * Nombre de color de prenda (es-CO) → hex pintable.
 *
 * Devuelve `GARMENT_PLACEHOLDER_COLOR` cuando el color es null, desconocido o
 * no representable como un color sólido. Seguro para `backgroundColor` de CSS
 * y para `fillStyle` de canvas.
 */
export function garmentSwatch(primaryColor: string | null | undefined): string {
  const name = primaryColor?.trim().toLowerCase();
  if (!name || UNPAINTABLE.has(name)) return GARMENT_PLACEHOLDER_COLOR;
  return SWATCH_BY_NAME.get(name) ?? GARMENT_PLACEHOLDER_COLOR;
}
