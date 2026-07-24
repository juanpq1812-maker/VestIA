// POST /api/push/cron/hebri-emocional — dispara el emocional vespertino de
// Hebri para usuarios "triste" o "hibernando" (un unico disparador
// escalonado, ver hebriEmocionalAudience.ts). Invocada por pg_cron + pg_net
// a las 6:00pm hora Bogota. Mismo patron exacto que
// /api/push/cron/daily-outfit/route.ts: runtime nodejs, CRON_SECRET,
// dry run, insert-claim, resumen JSON.

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { enviarNotificacion } from "@/lib/push/deliverNotification";
import { getHebriEmocionalAudience } from "@/lib/push/hebriEmocionalAudience";
import { pickRandomHebriEmocionalCopy } from "@/lib/push/hebriEmocionalCopy";
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
  const audience = await getHebriEmocionalAudience(supabaseAdmin);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      enHorarioSilencioso: estaEnHorarioSilencioso(),
      totalCandidatos: audience.length,
      candidatos: audience.map((c) => ({
        userId: c.userId,
        mood: c.mood,
        suscripciones: c.subscriptions.length,
        copy: pickRandomHebriEmocionalCopy(c.mood),
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

  // NOTA DE ESCALABILIDAD: mismo comentario que en daily-outfit/route.ts —
  // esto procesa TODA la audiencia dentro de una sola invocacion HTTP. Con
  // la base actual es instantaneo; si crece mucho puede chocar con el
  // limite de duracion de las funciones serverless de Vercel. No resuelto
  // aca a proposito (fuera de alcance de la Fase 2).
  for (const candidato of audience) {
    const { data: claim, error: claimError } = await supabaseAdmin
      .from("push_notifications_log")
      .insert({ user_id: candidato.userId, tipo: "hebri_emocional", exito: false })
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

    const payload = pickRandomHebriEmocionalCopy(candidato.mood);
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
