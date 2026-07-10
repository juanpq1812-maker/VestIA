// Sincronización del feed ICS de un usuario → tabla calendar_events.
//
// Se dispara desde el dashboard cuando el sync está "stale" (>15 min). El
// caller la envuelve en try/catch: un feed caído NUNCA rompe el dashboard —
// el error queda registrado en calendar_feeds.sync_error para mostrarlo en
// /profile.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarFeed } from "@/types/database";
import { fetchAndParseFeed } from "@/lib/calendar/ics";

export const SYNC_STALE_MS = 15 * 60 * 1000;

export function feedNecesitaSync(feed: Pick<CalendarFeed, "last_synced_at">): boolean {
  if (!feed.last_synced_at) return true;
  return Date.now() - new Date(feed.last_synced_at).getTime() > SYNC_STALE_MS;
}

/**
 * Descarga el feed, upsertea los eventos de la ventana y elimina los que ya
 * no existen en el origen (cancelados/movidos). Actualiza last_synced_at o
 * sync_error según el resultado.
 */
export async function syncCalendarFeed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  feed: Pick<CalendarFeed, "id" | "user_id" | "url">
): Promise<{ ok: boolean; error?: string }> {
  try {
    const eventos = await fetchAndParseFeed(feed.url);

    // Upsert idempotente sobre (feed_id, external_uid, starts_at).
    if (eventos.length > 0) {
      const rows = eventos.map((e) => ({
        user_id: feed.user_id,
        feed_id: feed.id,
        external_uid: e.externalUid,
        title: e.title,
        starts_at: e.startsAt.toISOString(),
        ends_at: e.endsAt ? e.endsAt.toISOString() : null,
        all_day: e.allDay,
        location: e.location,
      }));
      const { error: upsertErr } = await supabase
        .from("calendar_events")
        .upsert(rows, { onConflict: "feed_id,external_uid,starts_at" });
      if (upsertErr) throw new Error(upsertErr.message);
    }

    // Purga: eventos futuros del feed que desaparecieron del origen. Las
    // sugerencias asociadas caen por CASCADE.
    const clavesVivas = new Set(
      eventos.map((e) => `${e.externalUid}|${e.startsAt.toISOString()}`)
    );
    const { data: existentes } = await supabase
      .from("calendar_events")
      .select("id, external_uid, starts_at")
      .eq("feed_id", feed.id)
      .gte("starts_at", new Date().toISOString());
    const aBorrar = (existentes ?? [])
      .filter(
        (e) =>
          !clavesVivas.has(`${e.external_uid}|${new Date(e.starts_at).toISOString()}`)
      )
      .map((e) => e.id);
    if (aBorrar.length > 0) {
      await supabase.from("calendar_events").delete().in("id", aBorrar);
    }

    await supabase
      .from("calendar_feeds")
      .update({ last_synced_at: new Date().toISOString(), sync_error: null })
      .eq("id", feed.id);

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido al sincronizar.";
    console.error("[calendar sync] feed", feed.id, msg);
    await supabase
      .from("calendar_feeds")
      .update({ last_synced_at: new Date().toISOString(), sync_error: msg })
      .eq("id", feed.id);
    return { ok: false, error: msg };
  }
}
