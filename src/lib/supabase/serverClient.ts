// Cliente de Supabase para usar en el SERVIDOR (Server Components, Server Actions y
// Route Handlers). Lee las cookies que vienen en el request usando `cookies()` de Next.js.
//
// IMPORTANTE: en Next.js 16 `cookies()` es ASYNC, por eso esta funcion tambien lo es.
//
// La escritura de cookies puede fallar si se llama desde un Server Component (Next.js no
// permite mutar cookies durante el render). Por eso envolvemos `setAll` en un try/catch
// y dejamos que el `proxy.ts` (Proxy de Next.js 16) sea el encargado de refrescar la
// sesion en cada request — ese es el lugar correcto para escribir cookies.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Llamado desde un Server Component: no se pueden escribir cookies aqui.
          // El Proxy se encarga de refrescar la sesion, asi que es seguro ignorarlo.
        }
      },
    },
  });
}
