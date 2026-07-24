// Server Actions del perfil: conectar / desconectar el calendario ICS, y
// guardar las preferencias de notificaciones push (push_preferences,
// migracion 0027).

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import {
  fetchAndParseFeed,
  guessProvider,
  normalizeFeedUrl,
} from "@/lib/calendar/ics";
import { syncCalendarFeed } from "@/lib/calendar/sync";
import type { PushPreferences } from "@/lib/push/preferences";

export type SaveFeedResult =
  | { ok: true; feedId: string; provider: string; eventCount: number }
  | { ok: false; error: string };

export async function saveCalendarFeedAction(rawUrl: string): Promise<SaveFeedResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  let url: string;
  try {
    url = normalizeFeedUrl(rawUrl);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "URL inválida." };
  }

  // Validación real: si no podemos descargar y parsear el feed, no lo guardamos.
  try {
    await fetchAndParseFeed(url);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No pudimos leer ese calendario.",
    };
  }

  const provider = guessProvider(url);

  // Multi-feed: cada calendario nuevo se inserta; unique(user_id, url) evita
  // conectar el mismo dos veces.
  const { data: feed, error } = await supabase
    .from("calendar_feeds")
    .insert({ user_id: user.id, url, provider })
    .select("id, user_id, url")
    .single();

  if (error || !feed) {
    if (error?.code === "23505") {
      return { ok: false, error: "Ese calendario ya está conectado." };
    }
    console.error("[saveCalendarFeed]", error);
    return { ok: false, error: "No pudimos guardar el calendario. Intenta de nuevo." };
  }

  // Primer sync inmediato para que el dashboard ya tenga eventos.
  await syncCalendarFeed(supabase, feed);
  const { count } = await supabase
    .from("calendar_events")
    .select("id", { count: "exact", head: true })
    .eq("feed_id", feed.id);

  revalidatePath("/");
  revalidatePath("/profile");
  return { ok: true, feedId: feed.id, provider, eventCount: count ?? 0 };
}

export type DeleteFeedResult = { ok: true } | { ok: false; error: string };

export async function deleteCalendarFeedAction(feedId: string): Promise<DeleteFeedResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  // Eventos y sugerencias caen por CASCADE. RLS ya limita al dueño; el filtro
  // explícito por user_id es defensa en profundidad.
  const { error } = await supabase
    .from("calendar_feeds")
    .delete()
    .eq("id", feedId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[deleteCalendarFeed]", error);
    return { ok: false, error: "No pudimos desconectar el calendario." };
  }

  revalidatePath("/");
  revalidatePath("/profile");
  return { ok: true };
}

export type SavePushPreferencesResult = { ok: true } | { ok: false; error: string };

export async function savePushPreferencesAction(
  prefs: PushPreferences
): Promise<SavePushPreferencesResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  // Upsert de la fila completa: el cliente ya tiene los 3 toggles en su
  // estado local, asi que no hace falta un update parcial (evita una
  // condicion de carrera leer-modificar-escribir para una pantalla de
  // ajustes de bajo trafico).
  const { error } = await supabase.from("push_preferences").upsert(
    {
      user_id: user.id,
      recordatorio_diario: prefs.recordatorio_diario,
      avisos_hebri: prefs.avisos_hebri,
      novedades_hilo: prefs.novedades_hilo,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[savePushPreferencesAction]", error);
    return { ok: false, error: "No pudimos guardar tus preferencias." };
  }

  revalidatePath("/profile");
  return { ok: true };
}
