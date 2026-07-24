// Capa que DECIDE la audiencia del emocional vespertino de Hebri —
// separada de la entrega. Un unico disparador escalonado (no uno para
// "triste" y otro para "hibernando"): el decaimiento de health_score
// (-8/dia, ver PET_SCORE_DAILY_DECAY) ya implica inactividad, asi que esos
// dos estados son el mismo fenomeno a distinta distancia. Un chequeo, un
// cupo, copy calibrado segun el estado (ver hebriEmocionalCopy.ts).
//
// Estado de Hebri: reusa computePetState() (src/lib/pet/compute.ts), la
// MISMA funcion pura que usan el Home y /pet — nada de reimplementar los
// umbrales de mood aca. `lastOpenedAt` no importa para el mood (solo lo usa
// la capa "sucia" de la UI), asi que se le pasa `now` para que `isDirty` de
// false y quede ignorado.
//
// Candidato = suscripcion activa + mood en {triste, hibernando} + NO
// notificado hoy por ningun tipo (cupo compartido, notifiedToday.ts) +
// cooldown de 3 dias sin haber recibido un 'hebri_emocional' (anti-fatiga:
// sin esto, "Hebri te extraña" todos los dias se vuelve chantaje) + tiene
// prendida la preferencia `avisos_hebri`.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushSubscriptionRecord } from "./types";
import { computePetState } from "@/lib/pet/compute";
import type { PetMood } from "@/lib/pet/constants";
import { getUsersNotifiedToday } from "./notifiedToday";
import { getPushPreferencesMap, prefFor } from "./preferences";

const MOODS_ELEGIBLES: PetMood[] = ["triste", "hibernando"];
const COOLDOWN_DIAS = 3;

export type HebriEmocionalCandidate = {
  userId: string;
  mood: "triste" | "hibernando";
  subscriptions: PushSubscriptionRecord[];
};

export async function getHebriEmocionalAudience(
  supabaseAdmin: SupabaseClient
): Promise<HebriEmocionalCandidate[]> {
  const now = new Date();
  const cooldownDesde = new Date(now.getTime() - COOLDOWN_DIAS * 24 * 60 * 60 * 1000);

  const [subsRes, yaNotificados, enCooldownRes] = await Promise.all([
    supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("active", true),
    getUsersNotifiedToday(supabaseAdmin),
    supabaseAdmin
      .from("push_notifications_log")
      .select("user_id")
      .eq("tipo", "hebri_emocional")
      .gte("enviado_at", cooldownDesde.toISOString()),
  ]);

  if (subsRes.error) throw subsRes.error;
  if (enCooldownRes.error) throw enCooldownRes.error;

  const enCooldown = new Set(
    (enCooldownRes.data ?? []).map((r) => r.user_id as string)
  );

  const userIds = [...new Set((subsRes.data ?? []).map((s) => s.user_id as string))];
  if (userIds.length === 0) return [];

  const [prefs, profilesRes] = await Promise.all([
    getPushPreferencesMap(supabaseAdmin, userIds),
    supabaseAdmin
      .from("profiles")
      .select("id, pet_score_base, pet_score_updated_at")
      .in("id", userIds),
  ]);

  if (profilesRes.error) throw profilesRes.error;

  const moodPorUsuario = new Map<string, PetMood>();
  for (const p of profilesRes.data ?? []) {
    const { mood } = computePetState({
      scoreBase: p.pet_score_base,
      scoreUpdatedAt: p.pet_score_updated_at,
      lastOpenedAt: now,
      now,
    });
    moodPorUsuario.set(p.id as string, mood);
  }

  const porUsuario = new Map<
    string,
    { mood: "triste" | "hibernando"; subs: PushSubscriptionRecord[] }
  >();

  for (const sub of subsRes.data ?? []) {
    const userId = sub.user_id as string;
    if (yaNotificados.has(userId)) continue;
    if (enCooldown.has(userId)) continue;
    if (!prefFor(prefs, userId, "avisos_hebri")) continue;

    const mood = moodPorUsuario.get(userId);
    if (!mood || !MOODS_ELEGIBLES.includes(mood)) continue;

    const entry = porUsuario.get(userId) ?? {
      mood: mood as "triste" | "hibernando",
      subs: [],
    };
    entry.subs.push({ id: sub.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth });
    porUsuario.set(userId, entry);
  }

  return [...porUsuario.entries()].map(([userId, { mood, subs }]) => ({
    userId,
    mood,
    subscriptions: subs,
  }));
}
