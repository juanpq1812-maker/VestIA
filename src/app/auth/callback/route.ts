// Route Handler para el callback de OAuth (Google, etc.).
//
// Supabase redirige aquí tras el login con un proveedor externo.
// Intercambiamos el `code` por una sesión real y decidimos a dónde mandar
// al usuario según si ya completó el onboarding o no.

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(new URL("/onboarding", origin));
        }
      }

      return NextResponse.redirect(new URL("/", origin));
    }
  }

  // Código ausente o intercambio fallido → volver a login con indicador de error.
  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}
