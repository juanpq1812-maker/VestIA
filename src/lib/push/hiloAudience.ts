// Capa que DECIDE la audiencia del broadcast de El Hilo — separada de la
// entrega, mismo patron que los otros audience-builders. A diferencia de
// daily-outfit y hebri-emocional, esta NO consulta getUsersNotifiedToday():
// el broadcast de un post PISA el cupo diario compartido a proposito (es un
// evento manual del admin, no un recordatorio automatico) — la unica
// exclusion es la preferencia `novedades_hilo`.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushSubscriptionRecord } from "./types";
import { getPushPreferencesMap, prefFor } from "./preferences";

export type HiloNotifyCandidate = {
  userId: string;
  subscriptions: PushSubscriptionRecord[];
};

export async function getHiloNotifyAudience(
  supabaseAdmin: SupabaseClient
): Promise<HiloNotifyCandidate[]> {
  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("active", true);

  if (error) throw error;

  const userIds = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  const prefs = await getPushPreferencesMap(supabaseAdmin, userIds);

  const porUsuario = new Map<string, PushSubscriptionRecord[]>();
  for (const sub of subs ?? []) {
    const userId = sub.user_id as string;
    if (!prefFor(prefs, userId, "novedades_hilo")) continue;
    const lista = porUsuario.get(userId) ?? [];
    lista.push({ id: sub.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth });
    porUsuario.set(userId, lista);
  }

  return [...porUsuario.entries()].map(([userId, subscriptions]) => ({
    userId,
    subscriptions,
  }));
}
