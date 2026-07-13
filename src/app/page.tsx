// Raíz de StrandIA (/).
//
// Sin sesión → Landing pública (estática, sin DB).
// Con sesión → Dashboard personalizado (Server Component con queries en paralelo).
//
// El Proxy ya NO redirige esta ruta al armario, así que necesitamos resolver
// la sesión aquí mismo.

import type { Metadata } from "next";
import { after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import DashboardView from "@/components/dashboard/DashboardView";
import LandingContent from "@/components/landing/LandingContent";
import { feedNecesitaSync, syncCalendarFeed } from "@/lib/calendar/sync";
import { recordPetAction } from "@/lib/pet/actions";
import { computePetState } from "@/lib/pet/compute";
import type { AgendaEvent } from "@/components/dashboard/AgendaCard";
import type { EventOutfitData } from "@/components/dashboard/EventOutfitSection";

export const metadata: Metadata = {
  title: "StrandIA — Tu armario digital con IA",
  description:
    "Genera outfits con la ropa que ya tienes. StrandIA combina inteligencia artificial con tu armario para ayudarte a vestir mejor y comprar de forma más inteligente.",
};

export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingContent />;
  }

  // ── Queries del dashboard (todas en paralelo) ─────────────────────────────
  const today = new Date();
  const fifteenDaysAgoStr = offsetDate(today, -15);
  // Ventana de análisis: los cálculos de prenda estrella/olvidada solo miran
  // los últimos 90 días — evita que el payload de usos crezca sin límite con
  // el historial del usuario.
  const ninetyDaysAgoStr = offsetDate(today, -90);

  // "Abrir la app": alimenta a Hebri (mascota de gamificación) y resetea su
  // contador de suciedad. Es un no-op si ya se registró hoy — ver
  // supabase/migrations/0012_pet_score.sql. Con `after()` corre una vez
  // enviada la respuesta: no bloquea el render del dashboard y, a diferencia
  // de un fire-and-forget suelto, Next garantiza que se ejecute hasta el
  // final aunque el request ya haya terminado.
  after(() => recordPetAction("app_opened").catch(() => {}));

  const [
    profileRes,
    allUsesRes,
    allOutfitsRes,
    allItemsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, pet_score_base, pet_score_updated_at, pet_last_opened_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("outfit_uses")
      .select("outfit_id, used_date")
      .gte("used_date", ninetyDaysAgoStr),
    supabase.from("outfits").select("id, clothing_item_ids"),
    supabase
      .from("clothing_items")
      .select(
        "id, name, subcategory, category, primary_color, image_path, created_at"
      )
      .order("created_at", { ascending: false }),
  ]);

  const displayName =
    profileRes.data?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "vos";
  const allUses = allUsesRes.data ?? [];
  const allOutfits = allOutfitsRes.data ?? [];
  const allItems = allItemsRes.data ?? [];

  const petState = profileRes.data
    ? computePetState({
        scoreBase: profileRes.data.pet_score_base,
        scoreUpdatedAt: profileRes.data.pet_score_updated_at,
        lastOpenedAt: profileRes.data.pet_last_opened_at,
      })
    : { score: 100, mood: "feliz" as const, isDirty: false };

  // ── Mapa outfit_id → clothing_item_ids[] ────────────────────────────────
  const outfitMap = new Map<string, string[]>();
  for (const outfit of allOutfits) {
    outfitMap.set(outfit.id, outfit.clothing_item_ids ?? []);
  }

  // ── Prenda olvidada: sin uso en outfit_uses en los últimos 15 días ───────
  const recentlyUsedItemIds = new Set<string>();
  for (const use of allUses) {
    if (use.used_date >= fifteenDaysAgoStr) {
      for (const itemId of outfitMap.get(use.outfit_id) ?? []) {
        recentlyUsedItemIds.add(itemId);
      }
    }
  }

  // Map de outfit_id → last used_date para buscar la fecha de último uso por prenda
  const lastUsedByOutfit = new Map<string, string>();
  for (const use of allUses) {
    const prev = lastUsedByOutfit.get(use.outfit_id);
    if (!prev || use.used_date > prev) {
      lastUsedByOutfit.set(use.outfit_id, use.used_date);
    }
  }

  // Candidatas: prendas no usadas en 15 días Y creadas hace 15+ días
  type Candidata = { id: string; nombre: string; image_path: string | null; primary_color: string | null; diasOlvidada: number };
  const candidatas: Candidata[] = [];
  for (const item of allItems) {
    if (recentlyUsedItemIds.has(item.id)) continue;
    const createdDaysAgo = daysBetween(new Date(item.created_at), today);
    if (createdDaysAgo < 15) continue;

    // Buscar última fecha de uso (puede ser null si nunca se usó)
    let lastUseDate: string | null = null;
    for (const [outfitId, ids] of outfitMap.entries()) {
      if (ids.includes(item.id)) {
        const d = lastUsedByOutfit.get(outfitId);
        if (d && (!lastUseDate || d > lastUseDate)) lastUseDate = d;
      }
    }
    const refDate = lastUseDate ?? item.created_at.slice(0, 10);
    const diasOlvidada = daysBetween(new Date(refDate), today);
    candidatas.push({
      id: item.id,
      nombre: item.name?.trim() || item.subcategory?.trim() || item.category,
      image_path: item.image_path,
      primary_color: item.primary_color,
      diasOlvidada,
    });
  }
  candidatas.sort((a, b) => b.diasOlvidada - a.diasOlvidada);
  const prendaOlvidada = candidatas[0] ?? null;

  // ── Calendario: sync si está stale + eventos de hoy (Bogotá) ─────────────
  // Multi-feed: el usuario puede tener Google Y Apple conectados a la vez.
  const { data: feedsData } = await supabase
    .from("calendar_feeds")
    .select("id, user_id, url, last_synced_at");
  const feeds = feedsData ?? [];
  const hayFeed = feeds.length > 0;

  let agendaEvents: AgendaEvent[] = [];
  let nextEvent: AgendaEvent | null = null;
  let cachedEventOutfit: EventOutfitData | null = null;

  if (hayFeed) {
    const stale = feeds.filter((f) => feedNecesitaSync(f));
    if (stale.length > 0) {
      // syncCalendarFeed ya captura sus errores; el cinturón extra garantiza
      // que un feed roto jamás tumbe el dashboard.
      try {
        await Promise.all(stale.map((f) => syncCalendarFeed(supabase, f)));
      } catch {
        /* registrado en calendar_feeds.sync_error */
      }
    }

    // "Hoy" en la zona del piloto (Bogotá, UTC-5 sin DST).
    const bogotaDia = today.toLocaleDateString("en-CA", {
      timeZone: "America/Bogota",
    });
    const diaInicio = new Date(`${bogotaDia}T00:00:00-05:00`);
    const diaFin = new Date(diaInicio.getTime() + 24 * 60 * 60 * 1000);

    const { data: eventsData } = await supabase
      .from("calendar_events")
      .select("id, title, starts_at, all_day")
      .gte("starts_at", diaInicio.toISOString())
      .lt("starts_at", diaFin.toISOString())
      .order("starts_at", { ascending: true });
    agendaEvents = (eventsData ?? []) as AgendaEvent[];

    // Próximo evento con hora que aún no empieza — el que recibe outfit.
    const ahora = new Date();
    nextEvent =
      agendaEvents.find((e) => !e.all_day && new Date(e.starts_at) > ahora) ??
      null;

    // ¿Sugerencia cacheada? Se hidrata acá para llegar server-rendered.
    if (nextEvent) {
      const { data: sug } = await supabase
        .from("event_outfit_suggestions")
        .select("name, explanation, match_percentage, occasion_inferred, clothing_item_ids")
        .eq("event_id", nextEvent.id)
        .maybeSingle();
      if (sug) {
        const ids: string[] = sug.clothing_item_ids ?? [];
        const { data: sugItems } = ids.length
          ? await supabase
              .from("clothing_items")
              .select("id, name, subcategory, category, primary_color, image_path")
              .in("id", ids)
          : { data: [] };
        const { createSignedUrlMap: sign } = await import("@/lib/storage/clothingImages");
        const sugPaths = (sugItems ?? [])
          .map((i) => i.image_path)
          .filter((p): p is string => Boolean(p));
        const sugUrls = await sign(supabase, sugPaths);
        cachedEventOutfit = {
          name: sug.name,
          explanation: sug.explanation,
          matchPercentage: sug.match_percentage,
          occasion: sug.occasion_inferred,
          items: ids
            .map((id) => (sugItems ?? []).find((i) => i.id === id))
            .filter((i): i is NonNullable<typeof i> => Boolean(i))
            .map((i) => ({
              id: i.id,
              nombre: i.name?.trim() || i.subcategory?.trim() || i.category,
              image_url: i.image_path ? sugUrls.get(i.image_path) ?? null : null,
              primary_color: i.primary_color,
            })),
        };
      }
    }
  }

  // ── Firmar URLs para imágenes que vamos a mostrar ────────────────────────
  const { createSignedUrlMap } = await import("@/lib/storage/clothingImages");
  const pathsToSign = [prendaOlvidada?.image_path].filter(
    (p): p is string => Boolean(p)
  );

  const signedUrls = await createSignedUrlMap(supabase, pathsToSign);

  // Inyectar URL firmada en el objeto
  if (prendaOlvidada?.image_path) {
    (prendaOlvidada as { image_url?: string | null }).image_url =
      signedUrls.get(prendaOlvidada.image_path) ?? null;
  }

  // Clima para el estado vacío de la agenda (feed conectado, día sin eventos).
  // No se pide cuando hay eventos: ahí el protagonista es el outfit.
  const weather =
    hayFeed && agendaEvents.length === 0
      ? await (await import("@/lib/weather/openMeteo")).getCurrentWeather()
      : null;

  // Hora local del próximo evento, pre-formateada para el banner.
  const nextEventTime = nextEvent
    ? new Date(nextEvent.starts_at).toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Bogota",
      })
    : null;

  return (
    <DashboardView
      displayName={displayName}
      totalItems={allItems.length}
      petState={petState}
      prendaOlvidada={prendaOlvidada as Parameters<typeof DashboardView>[0]["prendaOlvidada"]}
      hasCalendarFeed={hayFeed}
      agendaEvents={agendaEvents}
      weather={weather}
      eventOutfit={
        nextEvent && nextEventTime
          ? {
              eventId: nextEvent.id,
              eventTitle: nextEvent.title,
              eventTime: nextEventTime,
              cached: cachedEventOutfit,
            }
          : null
      }
    />
  );
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function offsetDate(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}
