// POST /api/push/test — herramienta de desarrollo para verificar la entrega
// en un dispositivo real. Doble barrera de seguridad (mas estricta que
// "una u otra"):
//   1. Solo usuarios con profiles.is_admin (mismo criterio que useIsAdmin.ts
//      y las policies admin de community_share_reports).
//   2. Incluso siendo admin, SOLO se lee/envia a las suscripciones propias
//      del usuario autenticado (select via cliente de sesion, con RLS) —
//      nunca a otros, sin excepcion.
//
// No decide audiencia ni horario (eso es el Prompt 3) — solo entrega un
// payload de prueba fijo a quien llama al endpoint.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { enviarNotificacion } from "@/lib/push/deliverNotification";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // RLS (push_subscriptions_select_own) ya garantiza que esto solo trae
  // filas de `user.id` — el filtro explicito es defensa en profundidad.
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id)
    .eq("active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json(
      { error: "No tienes ninguna suscripción activa. Acepta el permiso de notificaciones primero." },
      { status: 400 }
    );
  }

  const results = await Promise.all(
    subscriptions.map((sub) =>
      enviarNotificacion(sub, {
        title: "🧶 Hebri dice hola",
        body: "Si ves esto, las notificaciones push ya funcionan.",
        url: "/outfits",
        icon: "/icon-192.png",
      })
    )
  );

  const enviados = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: true, enviados, total: results.length });
}
