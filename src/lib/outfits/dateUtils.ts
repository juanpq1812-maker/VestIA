// Utilidades de fecha para el flujo de "uso de outfits".
//
// Vivimos con fechas en formato "YYYY-MM-DD" (tipo `date` de Postgres). Aqui
// concentramos las conversiones para que el resto de la app no tenga que
// pelearse con timezones ni con `Date.toISOString()` (que devuelve UTC).

/** Devuelve "YYYY-MM-DD" para la fecha local de hoy. */
export function todayIso(): string {
  return dateNDaysAgoIso(0);
}

/** Devuelve "YYYY-MM-DD" para hoy menos `daysAgo` dias (en hora local). */
export function dateNDaysAgoIso(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Etiqueta corta y humana para X dias atras: "Hoy", "Ayer", "Hace 3 dias". */
export function relativeDayLabel(daysAgo: number): string {
  if (daysAgo === 0) return "Hoy";
  if (daysAgo === 1) return "Ayer";
  return `Hace ${daysAgo} dias`;
}

/** Diferencia en dias entre hoy y una fecha "YYYY-MM-DD" (en hora local). */
export function daysSinceIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return Number.POSITIVE_INFINITY;
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = now.getTime() - target.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** "Hoy", "Ayer", "Hace 3 dias", "Hace 12 dias", o el texto absoluto si >30. */
export function lastUsedLabel(iso: string | null): string {
  if (!iso) return "Aun sin usar";
  const diff = daysSinceIso(iso);
  if (diff < 0) return "Fecha futura"; // no deberia pasar
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  if (diff <= 30) return `hace ${diff} dias`;
  return formatHumanDate(iso);
}

/** "02 may 2026" — formato corto en espanol. */
export function formatHumanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
