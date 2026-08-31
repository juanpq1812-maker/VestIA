// GET /api/cron/cleanup-drafts — purga diaria de borradores vencidos.
//
// GET y no POST (a diferencia de /api/push/cron/*, que las dispara pg_cron con
// pg_net): Vercel Cron invoca la ruta con GET y añade solo la cabecera
// Authorization con CRON_SECRET. Si algún día esto se mueve a pg_cron, hay que
// cambiar el verbo.
//
// La URL es pública — Vercel no puede restringir un route handler por IP de
// origen — así que el chequeo de CRON_SECRET es la única barrera. Sin él,
// cualquiera podría disparar borrados masivos.
//
// El calendario vive en vercel.json. Lo que ejecuta está en
// src/lib/wardrobe/staleDraftPurge.ts, con el porqué.

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { purgarBorradoresVencidos } from "@/lib/wardrobe/staleDraftPurge";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (err) {
    console.error("[cleanup-drafts] admin client no disponible", err);
    return NextResponse.json({ error: "Admin client no disponible" }, { status: 500 });
  }

  try {
    const resultado = await purgarBorradoresVencidos(admin);
    console.log("[cleanup-drafts]", resultado);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    console.error("[cleanup-drafts] falló la purga", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falló la purga" },
      { status: 500 }
    );
  }
}
