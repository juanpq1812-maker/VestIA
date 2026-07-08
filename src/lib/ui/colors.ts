// Colores de UI que viven en JS (no en clases Tailwind) porque se usan como
// valores dinámicos inline. Deben mantenerse en sync con los tokens de
// globals.css — si cambia la paleta, este archivo cambia con ella.

/**
 * Placeholder de fondo para imágenes de prendas mientras cargan o cuando la
 * prenda no tiene foto. Espejo del token `--color-surface-2` (#f0edea).
 * Se usa como fallback de `item.primary_color`.
 */
export const GARMENT_PLACEHOLDER_COLOR = "#f0edea";
