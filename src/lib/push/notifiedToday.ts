// Cupo diario COMPARTIDO entre tipos de notificacion (Fase 2). Antes cada
// audience-builder consultaba push_notifications_log filtrando por su propio
// `tipo` — un usuario podia recibir el recordatorio de las 7am Y un
// emocional de Hebri el mismo dia. Este helper consulta por CUALQUIER tipo,
// asi que "ya fue notificado hoy" es una sola verdad compartida.
//
// La constraint UNIQUE(user_id, tipo, dia_bogota) de push_notifications_log
// sigue existiendo, pero ya NO es el mecanismo del cupo compartido — sigue
// siendo la red de seguridad contra doble-envio del MISMO tipo si un cron se
// repite. El cupo compartido lo aplica este helper, en la capa de audiencia,
// ANTES del insert-claim. El Hilo (src/app/api/push/hilo/notify/route.ts) es
// la unica excepcion: pisa el cupo a proposito y no llama a este helper.

import type { SupabaseClient } from "@supabase/supabase-js";
import { todayBogotaRangeUtc } from "./colombiaTime";

export async function getUsersNotifiedToday(
  supabaseAdmin: SupabaseClient
): Promise<Set<string>> {
  const { startUtc, endUtc } = todayBogotaRangeUtc();

  const { data, error } = await supabaseAdmin
    .from("push_notifications_log")
    .select("user_id")
    .gte("enviado_at", startUtc.toISOString())
    .lt("enviado_at", endUtc.toISOString());

  if (error) throw error;

  return new Set((data ?? []).map((r) => r.user_id as string));
}
