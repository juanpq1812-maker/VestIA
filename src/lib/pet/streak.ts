// Racha de días activos: cuántos días seguidos el usuario abrió la app.
//
// La fuente es `pet_activity_log` con `action_type = 'app_opened'` — la misma
// señal que alimenta a Hebri (ver supabase/migrations/0011_pet_activity_log.sql).
//
// Función pura, sin dependencias de runtime: testeable con `node --test` sin
// resolver el alias `@/` (mismo criterio que lib/wardrobe/outfitRules.ts).

/** Ventana que se dibuja en el home: los últimos 7 días, hoy incluido. */
export const STREAK_WINDOW_DAYS = 7;

/**
 * "YYYY-MM-DD" de un instante en Bogotá.
 *
 * `en-CA` es el truco que ya usa page.tsx para obtener ISO corto sin armar la
 * fecha a mano. Bogotá es UTC-5 fijo (sin DST), así que restar 24h de un
 * instante y volver a convertir siempre cae en el día natural anterior.
 */
export function bogotaDay(instant: Date): string {
  return instant.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

export type StreakDay = {
  /** "YYYY-MM-DD" en Bogotá. */
  day: string;
  active: boolean;
};

export type StreakState = {
  /** Los últimos 7 días, del más antiguo al de hoy. */
  days: StreakDay[];
  /** Días consecutivos terminando hoy. Siempre ≥ 1. */
  current: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Arma la ventana de racha a partir de los días en que hubo actividad.
 *
 * `activeDays` son cadenas "YYYY-MM-DD" en Bogotá (repetidas o desordenadas,
 * da igual).
 *
 * Hoy se marca activo SIEMPRE, sin consultar `activeDays`: el registro de
 * `app_opened` corre en un `after()` de page.tsx, o sea DESPUÉS de que esta
 * respuesta ya se envió. En la primera visita del día la fila todavía no
 * existe, y leerla daría "hoy inactivo" mientras el usuario está mirando la
 * pantalla. Está acá, luego abrió la app.
 */
export function computeStreak(
  activeDays: Iterable<string>,
  now: Date = new Date()
): StreakState {
  const active = new Set(activeDays);
  const todayMs = now.getTime();

  const days: StreakDay[] = [];
  for (let offset = STREAK_WINDOW_DAYS - 1; offset >= 0; offset--) {
    const day = bogotaDay(new Date(todayMs - offset * DAY_MS));
    days.push({ day, active: offset === 0 || active.has(day) });
  }

  // Cuenta hacia atrás desde hoy hasta el primer día inactivo.
  let current = 0;
  for (let i = days.length - 1; i >= 0 && days[i].active; i--) current++;

  return { days, current };
}

/**
 * Instante a partir del cual pedirle filas a `pet_activity_log`.
 *
 * Se piden 8 días y no 7 a propósito: la ventana se recorta por día natural de
 * Bogotá, y un `created_at` de hace 7 días exactos en UTC puede caer del lado
 * de afuera del séptimo día bogotano. Traer un día de más y filtrar por
 * cadena de fecha es más barato que razonar sobre el borde.
 */
export function streakQuerySince(now: Date = new Date()): string {
  return new Date(now.getTime() - (STREAK_WINDOW_DAYS + 1) * DAY_MS).toISOString();
}
