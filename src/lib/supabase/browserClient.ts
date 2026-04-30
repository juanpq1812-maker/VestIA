// Cliente de Supabase para usar en componentes del NAVEGADOR (Client Components).
// Internamente lee/escribe la sesion en cookies del navegador, asi que cuando el usuario
// inicia o cierra sesion desde el cliente, esas cookies quedan listas para que el servidor
// las lea en el siguiente request.

"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
