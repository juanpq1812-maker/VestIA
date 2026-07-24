// POST /api/push/hilo/notify — broadcast manual (por evento, no programado)
// cuando un admin toca "Notificar" en /admin/hilo. Reusa la capa de entrega
// (enviarNotificacion) y el patron de insert-claim, pero NO es un cron: se
// protege con sesion + profiles.is_admin (mismo criterio que
// requireAdmin() de /admin/hilo/actions.ts), no con CRON_SECRET.
//
// PISA el cupo diario compartido a proposito (getHiloNotifyAudience no
// consulta getUsersNotifiedToday) — es un evento manual, no un recordatorio
// automatico, y el admin decide cuando dispararlo.
//
// notificado_at en editorial_posts SOLO se escribe si hubo un intento de
// envio real: si el post no esta publicado o si cae en horario silencioso,
// la funcion vuelve sin tocar esa columna, para que el admin pueda
// reintentar mas tarde el mismo dia.

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { enviarNotificacion } from "@/lib/push/deliverNotification";
import { getHiloNotifyAudience } from "@/lib/push/hiloAudience";
import { buildHiloNotifyPayload } from "@/lib/push/hiloNotifyCopy";
import { estaEnHorarioSilencioso } from "@/lib/push/colombiaTime";
import type { EditorialCategory } from "@/lib/editorial/types";
import type { DeliveryResult } from "@/lib/push/types";

export const runtime = "nodejs";

function describirFallo(result: DeliveryResult): string {
  if (result.ok) return "";
  if (result.reason === "gone") return `endpoint caducado (status ${result.statusCode})`;
  return result.message;
}

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => null);
  const postId = typeof body?.postId === "string" ? body.postId : null;
  const dryRun = body?.dryRun === true;
  if (!postId) {
    return NextResponse.json({ error: "Falta postId" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: post, error: postError } = await admin
    .from("editorial_posts")
    .select("id, title, category, slug, status, notificado_at")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }
  if (!post) {
    return NextResponse.json({ error: "El post no existe" }, { status: 404 });
  }

  const payload = buildHiloNotifyPayload({
    title: post.title,
    category: post.category as EditorialCategory,
    slug: post.slug,
  });

  if (dryRun) {
    const audience = await getHiloNotifyAudience(admin);
    return NextResponse.json({
      dryRun: true,
      publicado: post.status === "published",
      enHorarioSilencioso: estaEnHorarioSilencioso(),
      yaNotificado: Boolean(post.notificado_at),
      totalCandidatos: audience.length,
      copy: payload,
    });
  }

  // Verificacion en el momento del disparo — el admin pudo despublicar el
  // post entre que cargo la pantalla y toco el boton.
  if (post.status !== "published") {
    return NextResponse.json(
      { ok: false, error: "El post no está publicado — publícalo antes de notificar." },
      { status: 409 }
    );
  }

  if (estaEnHorarioSilencioso()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "quiet_hours",
    });
  }

  const audience = await getHiloNotifyAudience(admin);
  const tipo = `hilo_post:${postId}`;

  let enviados = 0;
  let fallidos = 0;
  const saltados: { userId: string; motivo: string }[] = [];

  // NOTA DE ESCALABILIDAD: mismo comentario que en
  // api/push/cron/daily-outfit/route.ts — este broadcast procesa TODAS las
  // suscripciones activas dentro de una sola invocacion HTTP. Con la base
  // actual es instantaneo; si la base de usuarios crece mucho esto puede
  // chocar con el limite de duracion de las funciones serverless de Vercel.
  // No resuelto aca a proposito (fuera de alcance de la Fase 2).
  for (const candidato of audience) {
    const { data: claim, error: claimError } = await admin
      .from("push_notifications_log")
      .insert({ user_id: candidato.userId, tipo, exito: false })
      .select("id")
      .single();

    if (claimError || !claim) {
      if (claimError?.code === "23505") {
        saltados.push({ userId: candidato.userId, motivo: "ya_notificado_este_post" });
        continue;
      }
      fallidos++;
      saltados.push({
        userId: candidato.userId,
        motivo: claimError?.message ?? "error_al_reclamar",
      });
      continue;
    }

    const resultados = await Promise.all(
      candidato.subscriptions.map((sub) => enviarNotificacion(sub, payload))
    );

    const huboExito = resultados.some((r) => r.ok);
    const primerFallo = resultados.find((r) => !r.ok);

    await admin
      .from("push_notifications_log")
      .update({
        exito: huboExito,
        error: huboExito ? null : primerFallo ? describirFallo(primerFallo) : "error desconocido",
      })
      .eq("id", claim.id);

    if (huboExito) enviados++;
    else fallidos++;
  }

  const notificadoAt = new Date().toISOString();
  await admin
    .from("editorial_posts")
    .update({ notificado_at: notificadoAt })
    .eq("id", postId);

  return NextResponse.json({
    ok: true,
    totalCandidatos: audience.length,
    enviados,
    fallidos,
    saltados,
    notificadoAt,
  });
}
