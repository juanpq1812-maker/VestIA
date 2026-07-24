// Capa que DECIDE la audiencia del recordatorio diario — separada a
// proposito de la capa que entrega (src/lib/push/deliverNotification.ts).
// El route del cron (src/app/api/push/cron/daily-outfit/route.ts) es el
// unico lugar que conecta ambas.
//
// Candidato = usuario con >=1 suscripcion push activa, que HOY (dia
// calendario Bogota) no generó ningun outfit (pet_activity_log,
// action_type='outfit_generated' — ver razonamiento en el PR: es la señal
// real de "abrió la app y usó la IA", a diferencia de `outfits`, que solo
// refleja outfits GUARDADOS), que todavia no fue notificado hoy POR NINGUN
// TIPO (Fase 2 — cupo diario compartido, ver notifiedToday.ts) y que tiene
// prendida la preferencia `recordatorio_diario`.
//
// El chequeo de "ya notificado hoy" es un pre-filtro para no desperdiciar
// envios — la barrera real contra doble-envio del MISMO tipo es la
// constraint UNIQUE + el insert-claim que hace el route antes de enviar.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushSubscriptionRecord } from "./types";
import { todayBogotaRangeUtc } from "./colombiaTime";
import { getUsersNotifiedToday } from "./notifiedToday";
import { getPushPreferencesMap, prefFor } from "./preferences";

export type DailyOutfitCandidate = {
  userId: string;
  subscriptions: PushSubscriptionRecord[];
};

export async function getDailyOutfitAudience(
  supabaseAdmin: SupabaseClient
): Promise<DailyOutfitCandidate[]> {
  const { startUtc, endUtc } = todayBogotaRangeUtc();
  const startIso = startUtc.toISOString();
  const endIso = endUtc.toISOString();

  const [subsRes, generatedRes, yaNotificados] = await Promise.all([
    supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("active", true),
    supabaseAdmin
      .from("pet_activity_log")
      .select("user_id")
      .eq("action_type", "outfit_generated")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    getUsersNotifiedToday(supabaseAdmin),
  ]);

  if (subsRes.error) throw subsRes.error;
  if (generatedRes.error) throw generatedRes.error;

  const generaronHoy = new Set(
    (generatedRes.data ?? []).map((r) => r.user_id as string)
  );

  const userIds = [...new Set((subsRes.data ?? []).map((s) => s.user_id as string))];
  const prefs = await getPushPreferencesMap(supabaseAdmin, userIds);

  const porUsuario = new Map<string, PushSubscriptionRecord[]>();
  for (const sub of subsRes.data ?? []) {
    const userId = sub.user_id as string;
    if (generaronHoy.has(userId)) continue;
    if (yaNotificados.has(userId)) continue;
    if (!prefFor(prefs, userId, "recordatorio_diario")) continue;
    const lista = porUsuario.get(userId) ?? [];
    lista.push({ id: sub.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth });
    porUsuario.set(userId, lista);
  }

  return [...porUsuario.entries()].map(([userId, subscriptions]) => ({
    userId,
    subscriptions,
  }));
}
