// Cliente de Supabase para usar dentro del Proxy de Next.js 16 (`proxy.ts` en la raiz).
//
// El Proxy corre antes de cada request y aqui hacemos dos cosas clave:
//   1. Refrescar el token de sesion automaticamente (Supabase rota tokens cada hora).
//   2. Decidir si el usuario puede entrar a una ruta privada o lo redirigimos a /login.
//
// Como en el Proxy todavia no hemos creado la respuesta final, tenemos que mantener un
// objeto `NextResponse` "en construccion" para escribir las cookies actualizadas en el.
// Ese objeto es el que finalmente devolvemos al final del Proxy.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

export function createSupabaseProxyClient(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();

  // Respuesta inicial: la usamos para acumular las cookies que Supabase escriba
  // (refresh de sesion) y que se envien de vuelta al navegador.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Sincronizamos las cookies en el request (para que esta misma ejecucion las vea)
        // y en la response (para que el navegador las reciba).
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, response: () => response };
}
