// Sugerencia de outfit para un evento del calendario.
//
// Flujo (server-only):
//   1. Clasifica el título/hora del evento → ocasión de StrandIA (mapeo por
//      palabras clave; barato y determinista — la IA de outfits recibe además
//      el contexto completo del evento, así que una clasificación aproximada
//      es suficiente).
//   2. Reusa generateOutfits en modo "description" con el contexto del evento
//      pidiendo 1 solo outfit (pasa por el mismo pipeline anti-alucinación).
//   3. Cachea en event_outfit_suggestions: 1 sugerencia por evento — las
//      visitas siguientes del día no gastan IA.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent, EventOutfitSuggestion } from "@/types/database";
import { generateOutfits } from "@/lib/ai/generateOutfits";

// Palabras clave → ocasión (coinciden con ITEM_OCCASIONS / OCASIONES del
// generador para que la IA encuentre match con las etiquetas de las prendas).
const REGLAS_OCASION: Array<{ patron: RegExp; ocasion: string }> = [
  { patron: /entrevista|cliente|presentaci[oó]n|junta|directorio|corporativ|conferencia/i, ocasion: "Formal" },
  { patron: /reuni[oó]n|meeting|trabajo|oficina|sprint|standup|demo|revisi[oó]n/i, ocasion: "Trabajo" },
  { patron: /gym|gimnasio|yoga|correr|running|f[uú]tbol|partido|entren|crossfit|pilates|deporte/i, ocasion: "Deportivo" },
  { patron: /fiesta|cumplea[nñ]os|celebraci[oó]n|concierto|rumba|farra/i, ocasion: "Fiesta" },
  { patron: /cena|date|cita rom|rooftop|drinks|copas|bar\b/i, ocasion: "Citas" },
  { patron: /boda|matrimonio|grado|graduaci[oó]n|gala|ceremonia/i, ocasion: "Eventos formales" },
  { patron: /clase|universidad|parcial|examen|laboratorio|semin/i, ocasion: "Universidad" },
];

export function clasificarOcasion(titulo: string): string {
  for (const { patron, ocasion } of REGLAS_OCASION) {
    if (patron.test(titulo)) return ocasion;
  }
  return "Casual";
}

/** Hora local de Bogotá en formato corto ("21:00") para el contexto del prompt. */
function horaBogota(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  });
}

/**
 * ¿El evento es hoy (en hora de Bogotá)? Open-Meteo solo nos da el clima de
 * AHORA, no un pronóstico — así que el clima solo tiene sentido incluirlo
 * para eventos de hoy. Para eventos futuros lo omitimos (generateOutfits
 * recibe includeWeather: false); pronóstico multi-día queda fuera de alcance.
 */
function esHoyBogota(iso: string): boolean {
  const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  return fmt(new Date(iso)) === fmt(new Date());
}

export type EventSuggestionResult =
  | { ok: true; suggestion: EventOutfitSuggestion }
  | { ok: false; error: string };

/**
 * Genera (o recupera del caché) la sugerencia de outfit para un evento.
 * El rate limit de IA lo consume el CALLER (server action) antes de llamar,
 * y solo cuando no hay caché.
 */
export async function suggestOutfitForEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  event: Pick<CalendarEvent, "id" | "title" | "starts_at" | "location">
): Promise<EventSuggestionResult> {
  const ocasion = clasificarOcasion(event.title);
  const hora = horaBogota(event.starts_at);
  const contexto = [
    `Outfit para este evento de mi calendario: "${event.title}" a las ${hora}`,
    event.location ? `en ${event.location}` : null,
    `(tipo de ocasión: ${ocasion})`,
  ]
    .filter(Boolean)
    .join(" ");

  let outfits;
  try {
    outfits = await generateOutfits({
      userId,
      mode: "description",
      description: contexto.slice(0, 200),
      count: 1,
      includeWeather: esHoyBogota(event.starts_at),
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "No pudimos generar el outfit del evento.";
    return { ok: false, error: msg };
  }

  const outfit = outfits[0];
  if (!outfit) {
    return { ok: false, error: "La IA no devolvió un outfit válido. Intenta de nuevo." };
  }

  const { data, error } = await supabase
    .from("event_outfit_suggestions")
    .upsert(
      {
        user_id: userId,
        event_id: event.id,
        occasion_inferred: ocasion,
        name: outfit.name,
        explanation: outfit.explanation,
        match_percentage: outfit.matchPercentage,
        clothing_item_ids: outfit.items.map((i) => i.id),
      },
      { onConflict: "event_id" }
    )
    .select()
    .single();

  if (error || !data) {
    console.error("[eventOutfit] error guardando sugerencia", error);
    return { ok: false, error: "No pudimos guardar la sugerencia. Intenta de nuevo." };
  }

  return { ok: true, suggestion: data as EventOutfitSuggestion };
}
