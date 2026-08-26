// GET /profile/privacy/export — descarga un JSON con todos los datos del
// usuario. Usa el cliente de sesión (RLS), así que solo puede leer lo suyo.
//
// Nota: las fotos no van en el export (son binarios en Storage); se incluyen
// los paths por si el usuario quiere pedirlas aparte.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [profile, preferences, items, outfits, uses, feeds, events, blocks, consents] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_preferences").select("*").maybeSingle(),
      // Sin filtro de status a propósito: el export de datos personales debe
      // incluir TODO lo que le pertenece al usuario, incluidas las prendas
      // que quedaron en draft/processing/error del modo ráfaga.
      supabase.from("clothing_items").select("*"),
      supabase.from("outfits").select("*"),
      supabase.from("outfit_uses").select("*"),
      supabase.from("calendar_feeds").select("*"),
      supabase.from("calendar_events").select("*"),
      // La lista de bloqueos es dato personal del usuario (migración 0035) y
      // entra en el derecho de portabilidad. Solo salen los bloqueos que él
      // hizo: la RLS de community_blocks nunca devuelve los que recibió.
      supabase.from("community_blocks").select("*"),
      // Constancia de los documentos que aceptó y cuándo (migración 0036).
      supabase.from("legal_consents").select("*"),
    ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    app: "StrandIA",
    account: { id: user.id, email: user.email },
    profile: profile.data ?? null,
    preferences: preferences.data ?? null,
    clothing_items: items.data ?? [],
    outfits: outfits.data ?? [],
    outfit_uses: uses.data ?? [],
    calendar_feeds: feeds.data ?? [],
    calendar_events: events.data ?? [],
    community_blocks: blocks.data ?? [],
    legal_consents: consents.data ?? [],
  };

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="strandia-datos-${fecha}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
