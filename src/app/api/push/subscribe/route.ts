// POST /api/push/subscribe — guarda/actualiza la suscripcion Web Push del
// usuario autenticado. Usa el cliente de SESION (no el admin), asi que la
// insercion pasa por RLS (push_subscriptions_insert_own, migracion 0025) —
// nadie puede escribir una suscripcion a nombre de otro usuario.
//
// runtime nodejs explicito: la libreria que consume esto despues
// (src/lib/push/webPushTransport.ts) usa el SDK de Node de web-push.

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;
  const p256dh = typeof body?.p256dh === "string" ? body.p256dh : null;
  const auth = typeof body?.auth === "string" ? body.auth : null;
  const userAgent = typeof body?.userAgent === "string" ? body.userAgent : null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Faltan campos de la suscripción" }, { status: 400 });
  }

  // user_id va incluido a proposito en la fila: en un upsert de Supabase/PG,
  // el DO UPDATE reemplaza TODAS las columnas provistas (no solo las que
  // cambian) — asi, si el mismo endpoint reaparece bajo otra sesion (p.ej.
  // el usuario cambio de cuenta en el mismo dispositivo), la fila se
  // reasigna al usuario actual en vez de quedar huerfana.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      active: true,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
