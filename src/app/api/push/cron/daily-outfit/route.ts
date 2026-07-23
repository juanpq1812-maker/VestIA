// POST /api/push/cron/daily-outfit — dispara el recordatorio diario
// "generá tu outfit del día". Invocada por pg_cron + pg_net (ver SQL
// entregado aparte, fuera del repo) a las 7:00am hora Bogota. runtime
// nodejs explicito: enviarNotificacion() usa el SDK de Node de web-push
// (por eso el envio NO corre en una Supabase Edge Function — Deno no lo
// soporta bien).
//
// Protegida por CRON_SECRET: esta URL es publica (Vercel no tiene forma de
// restringir un route handler por IP de origen), asi que sin este chequeo
// cualquiera podria spamear notificaciones a toda la base de usuarios.
//
// Body opcional { dryRun: true }: calcula la audiencia y el copy que se
// usaria, sin enviar ni escribir nada — corre a cualquier hora, incluso en
// horario silencioso, porque no tiene efecto.

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { enviarNotificacion } from "@/lib/push/deliverNotification";
import { getDailyOutfitAudience } from "@/lib/push/dailyOutfitAudience";
import { pickRandomDailyOutfitCopy } from "@/lib/push/dailyOutfitCopy";
import { estaEnHorarioSilencioso } from "@/lib/push/colombiaTime";
import type { DeliveryResult } from "@/lib/push/types";

export const runtime = "nodejs";

function describirFallo(result: DeliveryResult): string {
  if (result.ok) return "";
  if (result.reason === "gone") return `endpoint caducado (status ${result.statusCode})`;
  return result.message;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const dryRun = body?.dryRun === true;

  const supabaseAdmin = createSupabaseAdminClient();
  const audience = await getDailyOutfitAudience(supabaseAdmin);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      enHorarioSilencioso: estaEnHorarioSilencioso(),
      totalCandidatos: audience.length,
      candidatos: audience.map((c) => ({
        userId: c.userId,
        suscripciones: c.subscriptions.length,
        copy: pickRandomDailyOutfitCopy(),
      })),
    });
  }

  if (estaEnHorarioSilencioso()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "quiet_hours",
      totalCandidatos: audience.length,
    });
  }

  let enviados = 0;
  let fallidos = 0;
  const saltados: { userId: string; motivo: string }[] = [];

  // NOTA DE ESCALABILIDAD: esto procesa TODA la audiencia dentro de una
  // sola invocacion HTTP (request → response). Con la base de usuarios
  // actual (chica) es cuestion de milisegundos, pero si la audiencia crece
  // mucho esto puede chocar con el limite de duracion de las funciones
  // serverless de Vercel. No lo resolvemos aca a proposito (fuera de
  // alcance de la Fase 1) — el dia que haga falta, la salida es trocear en
  // paginas/lotes con varias invocaciones o mover esto a una cola.
  for (const candidato of audience) {
    // Insert-claim: reclama el cupo de "1 por dia" ANTES de enviar. Si
    // choca con la constraint UNIQUE (user_id, tipo, dia_bogota), es que
    // otra corrida del cron ya reclamo a este usuario hoy — nos salteamos
    // sin reenviar. El placeholder exito=false se actualiza mas abajo con
    // el resultado real del envio (si no, el log nunca serviria para medir
    // tasa de entrega).
    const { data: claim, error: claimError } = await supabaseAdmin
      .from("push_notifications_log")
      .insert({ user_id: candidato.userId, tipo: "daily_outfit", exito: false })
      .select("id")
      .single();

    if (claimError || !claim) {
      if (claimError?.code === "23505") {
        saltados.push({ userId: candidato.userId, motivo: "ya_notificado_hoy" });
        continue;
      }
      fallidos++;
      saltados.push({
        userId: candidato.userId,
        motivo: claimError?.message ?? "error_al_reclamar",
      });
      continue;
    }

    const payload = pickRandomDailyOutfitCopy();
    const resultados = await Promise.all(
      candidato.subscriptions.map((sub) => enviarNotificacion(sub, payload))
    );

    const huboExito = resultados.some((r) => r.ok);
    const primerFallo = resultados.find((r) => !r.ok);

    await supabaseAdmin
      .from("push_notifications_log")
      .update({
        exito: huboExito,
        error: huboExito ? null : primerFallo ? describirFallo(primerFallo) : "error desconocido",
      })
      .eq("id", claim.id);

    if (huboExito) enviados++;
    else fallidos++;
  }

  return NextResponse.json({
    ok: true,
    totalCandidatos: audience.length,
    enviados,
    fallidos,
    saltados,
  });
}
