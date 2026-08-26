// Server Action que deja constancia del consentimiento marcado en el registro
// (tabla legal_consents, migración 0036).
//
// Se llama JUSTO DESPUÉS de que la sesión existe, en los dos caminos de alta:
// el formulario de email y el botón de Google. No antes: sin sesión no hay
// `auth.uid()` y la RLS rechaza el insert.
//
// Nunca bloquea el alta. Si el insert falla, el usuario ya tiene cuenta y
// dejarlo tirado en la pantalla de registro sería peor que quedarnos sin la
// fila; el fallo se registra en el log del servidor para poder repararlo.

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import {
  MIN_AGE,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/constants";

export type RegistrarConsentimientoResult =
  | { ok: true }
  | { ok: false; error: string };

export async function registrarConsentimientoAction(): Promise<RegistrarConsentimientoResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sin sesión activa." };

  // Las tres filas van juntas: los dos documentos y la declaración de edad,
  // que es una afirmación distinta y por eso lleva su propia fila.
  const filas = [
    { user_id: user.id, document: "terms", version: TERMS_VERSION },
    { user_id: user.id, document: "privacy", version: PRIVACY_VERSION },
    { user_id: user.id, document: "age", version: String(MIN_AGE) },
  ];

  // ignoreDuplicates: si el usuario reintenta el alta con la misma versión no
  // queremos un 23505 — la constancia ya existe y es la misma.
  const { error } = await supabase
    .from("legal_consents")
    .upsert(filas, { onConflict: "user_id,document,version", ignoreDuplicates: true });

  if (error) {
    console.error("[registrarConsentimientoAction] insert falló", error, {
      userId: user.id,
      terms: TERMS_VERSION,
      privacy: PRIVACY_VERSION,
    });
    return { ok: false, error: "No pudimos registrar tu aceptación." };
  }

  return { ok: true };
}
