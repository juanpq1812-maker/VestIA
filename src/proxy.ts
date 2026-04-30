// Proxy de Next.js 16 (antes se llamaba "middleware").
//
// Se ejecuta antes de cada request que coincida con `config.matcher`. Hacemos dos cosas:
//   1. Refrescar la sesion de Supabase llamando a `getUser()` (esto rota tokens si hace falta
//      y deja las cookies actualizadas en la respuesta).
//   2. Si el usuario intenta entrar a una ruta privada sin sesion, lo redirigimos a /login.
//      Si ya tiene sesion y va a /login o /register, lo mandamos al armario.
//
// IMPORTANTE: este archivo va aqui (`src/proxy.ts`) porque tenemos un directorio `src/`.
// Si no lo tuvieramos, iria en la raiz del proyecto.

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseProxyClient } from "@/lib/supabase/proxyClient";

// Rutas que requieren sesion activa.
const RUTAS_PRIVADAS = ["/onboarding", "/wardrobe", "/outfits"];

// Rutas que solo deben verse cuando NO hay sesion (si ya entraste, te llevamos al armario).
const RUTAS_DE_AUTH = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { supabase, response } = createSupabaseProxyClient(request);

  // `getUser()` es la forma recomendada por Supabase: valida el token contra el servidor
  // de Supabase en vez de confiar en lo que diga la cookie. Esto es importante por seguridad.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esRutaPrivada = RUTAS_PRIVADAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  );
  const esRutaDeAuth = RUTAS_DE_AUTH.includes(pathname);

  if (!user && esRutaPrivada) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && esRutaDeAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/wardrobe";
    return NextResponse.redirect(url);
  }

  // Devolvemos la response que armo el proxyClient (con las cookies actualizadas).
  return response();
}

export const config = {
  // El matcher excluye archivos estaticos, imagenes y favicon — el Proxy NO debe correr
  // para esos requests, solo para paginas reales.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
