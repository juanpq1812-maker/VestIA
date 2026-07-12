// Cliente admin de Supabase (service_role) — SOLO para el servidor.
//
// La service_role key salta el RLS y puede administrar usuarios de Auth.
// Nunca importar este archivo desde un Client Component: si Next.js detecta
// la variable en el bundle del navegador, cualquiera podría borrar cuentas.
//
// Hoy se usa únicamente para el borrado de cuenta (/profile/privacy):
// eliminar las fotos del Storage y el usuario de auth.users (el resto de
// tablas cascadea desde profiles).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || serviceKey.trim().length === 0) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. Pégala en `.env.local` (Supabase Dashboard → Settings → API → service_role) y reinicia el servidor."
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
