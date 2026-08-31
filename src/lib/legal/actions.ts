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
  BODY_PHOTO_CONSENT_VERSION,
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

// =============================================================================
// FOTO DE CUERPO ENTERO (modo "outfit completo")
// =============================================================================
//
// Autorización aparte de la del registro: esa foto es la persona, no una
// prenda sobre la cama, y va a Claude Vision. Se pide UNA VEZ por versión del
// texto y no en cada subida — es un modo de uso repetido, y una casilla en
// cada foto se vuelve ruido que se marca sin leer, que es peor que no pedirla.
//
// El chequeo es de servidor a propósito. Podría hacerse en el cliente leyendo
// legal_consents (la RLS lo permite), pero entonces la autorización viviría
// donde el usuario puede alterarla; acá el mismo servidor que la exige es el
// que la consulta.

export async function tieneConsentimientoFotoCuerpoAction(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("legal_consents")
    .select("id")
    .eq("user_id", user.id)
    .eq("document", "body_photo")
    .eq("version", BODY_PHOTO_CONSENT_VERSION)
    .maybeSingle();

  return Boolean(data);
}

export type RegistrarConsentimientoFotoCuerpoResult =
  | { ok: true }
  | { ok: false; error: string };

export async function registrarConsentimientoFotoCuerpoAction(): Promise<RegistrarConsentimientoFotoCuerpoResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  // A diferencia del consentimiento del registro, este SÍ bloquea si falla:
  // acá no hay una cuenta ya creada que proteger, y sin la constancia no
  // debemos procesar la foto.
  const { error } = await supabase.from("legal_consents").upsert(
    {
      user_id: user.id,
      document: "body_photo",
      version: BODY_PHOTO_CONSENT_VERSION,
    },
    { onConflict: "user_id,document,version", ignoreDuplicates: true }
  );

  if (error) {
    console.error("[registrarConsentimientoFotoCuerpoAction] insert falló", error);
    return { ok: false, error: "No pudimos registrar tu autorización. Intenta de nuevo." };
  }

  return { ok: true };
}
