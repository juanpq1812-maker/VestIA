// Utilidades de tiempo para el scheduler de push. Colombia es UTC-5 FIJO,
// sin horario de verano — por eso todo esto es aritmetica simple con un
// offset constante, sin depender de Intl/tzdata ni de una libreria de
// timezones. Mismo criterio que la columna generada `dia_bogota` de
// push_notifications_log (migracion 0026): offset fijo, no nombre de zona.
//
// server-only implicito por uso (solo lo importan route handlers), pero no
// se marca "server-only" porque no toca secretos ni el SDK de web-push —
// es aritmetica pura, inofensiva si algun dia se necesita en el cliente.

const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC-5

/**
 * Rango [inicio, fin) en UTC que corresponde al dia calendario de Bogota
 * que contiene a `reference` (por defecto, ahora). Sirve para filtrar filas
 * con `gte(startUtc).lt(endUtc)` sin usar `::date` (que dependeria del
 * timezone de la sesion de Postgres).
 */
export function todayBogotaRangeUtc(reference: Date = new Date()): {
  startUtc: Date;
  endUtc: Date;
  bogotaDateIso: string;
} {
  const bogotaShifted = new Date(reference.getTime() - BOGOTA_OFFSET_MS);
  const bogotaDateIso = bogotaShifted.toISOString().slice(0, 10);
  const startUtc = new Date(`${bogotaDateIso}T00:00:00-05:00`);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc, bogotaDateIso };
}

/**
 * Ventana silenciosa: bloquea envios entre 9pm y 6am hora Bogota. Reusable
 * para cualquier tipo de notificacion futura (Fase 2 — emocionales de
 * Hebri), no solo el recordatorio diario.
 */
export function estaEnHorarioSilencioso(reference: Date = new Date()): boolean {
  const bogotaShifted = new Date(reference.getTime() - BOGOTA_OFFSET_MS);
  const bogotaHour = bogotaShifted.getUTCHours();
  return bogotaHour >= 21 || bogotaHour < 6;
}
