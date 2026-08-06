// Prompts del pipeline de imagen.
//
// Viven aparte de las Server Actions que los usan por una razon concreta: los
// scripts de mantenimiento (`scripts/reprocess-background-removal.mjs`) tienen
// que mandar EXACTAMENTE el mismo prompt que la subida normal, y esas actions
// importan el cliente de Supabase con sesion, que un script en Node no puede
// cargar. Este modulo no importa nada, asi que se puede importar tanto desde
// la app como desde un script con type-stripping.
//
// Si cambias un prompt aca, cambia para la subida Y para el reprocesado — que
// es justo lo que se quiere: dos rutas que produzcan resultados distintos
// harian imposible comparar antes y despues.

/**
 * Remocion de fondo sin tocar la prenda. Deliberadamente insistente en "no
 * regeneres": Gemini tiende a "mejorar" la prenda si no se le prohibe, y eso
 * cambia la foto real del usuario por una inventada.
 */
export const MINIMAL_EDIT_PROMPT =
  "Remove the background completely. Keep the garment EXACTLY as it is — same pixels, same colors, same wrinkles, same angle, same lighting. Output the garment centered on a pure solid white background (#FFFFFF), no shadow, no gradient, no texture. Do not alter, improve or regenerate the garment.";
