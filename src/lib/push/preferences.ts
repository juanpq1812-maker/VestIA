// Preferencias de notificacion (Fase 2, tabla push_preferences — migracion
// 0027). Sin fila = todo activado: el usuario que nunca toco los toggles de
// /profile cuenta como si tuviera los 3 tipos prendidos.

import type { SupabaseClient } from "@supabase/supabase-js";

export type PushPreferences = {
  recordatorio_diario: boolean;
  avisos_hebri: boolean;
  novedades_hilo: boolean;
};

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  recordatorio_diario: true,
  avisos_hebri: true,
  novedades_hilo: true,
};

export async function getPushPreferencesMap(
  supabaseAdmin: SupabaseClient,
  userIds: string[]
): Promise<Map<string, PushPreferences>> {
  const map = new Map<string, PushPreferences>();
  if (userIds.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("push_preferences")
    .select("user_id, recordatorio_diario, avisos_hebri, novedades_hilo")
    .in("user_id", userIds);

  if (error) throw error;

  for (const row of data ?? []) {
    map.set(row.user_id as string, {
      recordatorio_diario: row.recordatorio_diario as boolean,
      avisos_hebri: row.avisos_hebri as boolean,
      novedades_hilo: row.novedades_hilo as boolean,
    });
  }

  return map;
}

// Helper de lectura con el default aplicado — evita repetir `?? true` en
// cada audience-builder.
export function prefFor(
  map: Map<string, PushPreferences>,
  userId: string,
  key: keyof PushPreferences
): boolean {
  return map.get(userId)?.[key] ?? DEFAULT_PUSH_PREFERENCES[key];
}
