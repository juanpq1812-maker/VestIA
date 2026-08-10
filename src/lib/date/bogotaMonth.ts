// Mes en hora de Colombia, para ventanas mensuales sin cron (cuota de
// generaciones de outfits del plan free).
//
// Por que hace falta un helper dedicado: un usuario en Bogota a las 8pm del
// 31 de agosto todavia esta en agosto, aunque en UTC ya sean las 01:00 del 1
// de septiembre. Si el "mes actual" se calculara con `Date.toISOString()`
// (UTC), ese usuario veria su cuota reiniciarse 5 horas antes de tiempo. El
// mismo problema ya se resolvio para "es hoy" en `esHoyBogota()`
// (src/lib/ai/eventOutfit.ts) usando `toLocaleDateString("en-CA", { timeZone:
// "America/Bogota" })` — este helper es la misma idea recortada al mes.

/**
 * Mes actual en hora de Bogota, formato "YYYY-MM" (p. ej. "2026-08").
 *
 * Se guarda junto al contador mensual (`profiles.monthly_generations_month`)
 * en vez de depender de un cron: si el mes guardado no coincide con este, el
 * contador se trata como 0 y se reinicia en la misma escritura.
 */
export function getCurrentBogotaMonth(date: Date = new Date()): string {
  // "en-CA" con solo year/month da "YYYY-MM" directo, sin parsear el día.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}
