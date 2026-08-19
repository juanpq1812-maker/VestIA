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
import type { EventOutfitData } from "@/components/dashboard/EventOutfitBody";
import type { TodayHeroState } from "@/components/dashboard/TodayHero";
import { CONFIRMED_STATUS } from "@/lib/wardrobe/constants";
import { bogotaDay, computeStreak, streakQuerySince } from "@/lib/pet/streak";
import { getCurrentWeather } from "@/lib/weather/openMeteo";
import { pickLookDelDia, seedDelDia } from "@/lib/outfits/lookDelDia";
import {
  etiquetaDeDia,
  outfitsDeLaSemana,
  SEMANA_DIAS,
} from "@/lib/outfits/semana";
import { calcularPaleta } from "@/lib/wardrobe/paleta";
import type { LookDeLaSemana } from "@/components/dashboard/WeekStrip";
import {
  checkWardrobeMinimums,
  countByCategory,
} from "@/lib/wardrobe/wardrobeMinimums";
import type { ClothingCategory } from "@/types/database";

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
    streakRes,
    weather,
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
        "id, name, subcategory, category, primary_color, image_path, thumbnail_path, background_removed, created_at"
      )
      .eq("status", CONFIRMED_STATUS)
      .order("created_at", { ascending: false }),
    // Racha: días distintos con "app_opened" en la ventana. RLS ya lo acota al
    // usuario. Índice: pet_activity_log_created_at_idx.
    supabase
      .from("pet_activity_log")
      .select("created_at")
      .eq("action_type", "app_opened")
      .gte("created_at", streakQuerySince(today)),
    // El clima ya no es exclusivo del estado vacío de la agenda: es contexto
    // permanente de la cabecera. Cuesta ~0 — el fetch va con
    // `next: { revalidate: 1800 }`, así que media hora de visitas comparte
    // una sola llamada a Open-Meteo.
    getCurrentWeather(),
  ]);

  const displayName =
    profileRes.data?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "tú";
  const allUses = allUsesRes.data ?? [];
  const allOutfits = allOutfitsRes.data ?? [];
  const allItems = allItemsRes.data ?? [];

  const streak = computeStreak(
    (streakRes.data ?? []).map((row) => bogotaDay(new Date(row.created_at))),
    today
  );

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
              .select("id, name, subcategory, category, primary_color, image_path, thumbnail_path")
              .eq("status", CONFIRMED_STATUS)
              .in("id", ids)
          : { data: [] };
        const { createSignedUrlMap: sign } = await import("@/lib/storage/clothingImages");
        const sugPaths = (sugItems ?? [])
          .map((i) => i.image_path)
          .filter((p): p is string => Boolean(p));
        const { createThumbnailSignedUrlMap } = await import(
          "@/lib/storage/thumbnailUrls"
        );
        const [sugUrls, sugThumbs] = await Promise.all([
          sign(supabase, sugPaths),
          createThumbnailSignedUrlMap((sugItems ?? []).map((i) => i.thumbnail_path)),
        ]);
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
              category: i.category,
              subcategory: i.subcategory,
              name: i.name,
              primary_color: i.primary_color,
              image_url: i.image_path ? sugUrls.get(i.image_path) ?? null : null,
              thumbnail_url: i.thumbnail_path
                ? sugThumbs.get(i.thumbnail_path) ?? null
                : null,
            })),
        };
      }
    }
  }

  // ── Tu semana: los outfits realmente usados en los últimos días ──────────
  const semana = outfitsDeLaSemana(allUses, offsetDate(today, -SEMANA_DIAS));
  const itemsPorOutfit = new Map(
    semana.map((d) => [
      d.outfitId,
      (outfitMap.get(d.outfitId) ?? [])
        .map((id) => allItems.find((i) => i.id === id))
        .filter((i): i is NonNullable<typeof i> => Boolean(i)),
    ])
  );

  // ── Firmar URLs para TODAS las imágenes de la pantalla, en un solo lote ──
  // Antes se firmaba solo la prenda olvidada. Ahora entran también las prendas
  // de la tira semanal (~5 outfits × 4 prendas). Una llamada batch por bucket,
  // no una por bloque de UI.
  const { createSignedUrlMap } = await import("@/lib/storage/clothingImages");
  const { createThumbnailSignedUrlMap: signThumbs } = await import(
    "@/lib/storage/thumbnailUrls"
  );

  const itemsSemana = [...itemsPorOutfit.values()].flat();
  const [signedUrls, thumbUrls] = await Promise.all([
    createSignedUrlMap(
      supabase,
      itemsSemana.map((i) => i.image_path).filter((p): p is string => Boolean(p))
    ),
    signThumbs(itemsSemana.map((i) => i.thumbnail_path)),
  ]);

  const hoyIso = bogotaDay(today);
  const ayerIso = offsetDate(today, -1);
  const looksDeLaSemana: LookDeLaSemana[] = semana
    .map((d) => ({
      outfitId: d.outfitId,
      etiqueta: etiquetaDeDia(d.usedDate, hoyIso, ayerIso),
      items: (itemsPorOutfit.get(d.outfitId) ?? []).map((i) => ({
        id: i.id,
        category: i.category,
        subcategory: i.subcategory,
        name: i.name,
        primary_color: i.primary_color,
        background_removed: i.background_removed,
        image_url: i.image_path ? signedUrls.get(i.image_path) ?? null : null,
        thumbnail_url: i.thumbnail_path
          ? thumbUrls.get(i.thumbnail_path) ?? null
          : null,
      })),
    }))
    // Un outfit cuyas prendas ya no existen no tiene nada que mostrar.
    .filter((l) => l.items.length > 0);

  const paleta = calcularPaleta(allItems.map((i) => i.primary_color));

  // Hora local del próximo evento, pre-formateada para el hero.
  const nextEventTime = nextEvent
    ? new Date(nextEvent.starts_at).toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Bogota",
      })
    : null;

  const heroState = await resolverHeroState({
    supabase,
    userId: user.id,
    today,
    allItems,
    allOutfits,
    allUses,
    nextEvent,
    nextEventTime,
    cachedEventOutfit,
  });

  return (
    <DashboardView
      displayName={displayName}
      totalItems={allItems.length}
      petState={petState}
      hasCalendarFeed={hayFeed}
      agendaEvents={agendaEvents}
      weather={weather}
      streak={streak}
      heroState={heroState}
      looksDeLaSemana={looksDeLaSemana}
      paleta={paleta}
    />
  );
}

// ── Estado del hero ───────────────────────────────────────────────────────────
//
// El orden importa y es el del plan: un evento próximo gana siempre; sin
// evento se propone un look guardado; si el armario no da, se explica qué
// falta; y con cero prendas, el primer paso. El hero nunca queda vacío.

async function resolverHeroState(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
  today: Date;
  allItems: { id: string; category: ClothingCategory }[];
  allOutfits: { id: string; clothing_item_ids: string[] }[];
  allUses: { outfit_id: string; used_date: string }[];
  nextEvent: AgendaEvent | null;
  nextEventTime: string | null;
  cachedEventOutfit: EventOutfitData | null;
}): Promise<TodayHeroState> {
  const {
    supabase,
    userId,
    today,
    allItems,
    allOutfits,
    allUses,
    nextEvent,
    nextEventTime,
    cachedEventOutfit,
  } = params;

  // A — hay evento: la IA viste la agenda.
  if (nextEvent && nextEventTime) {
    return {
      kind: "event",
      eventId: nextEvent.id,
      eventTitle: nextEvent.title,
      eventTime: nextEventTime,
      cached: cachedEventOutfit,
    };
  }

  if (allItems.length === 0) return { kind: "empty" };

  const minimums = checkWardrobeMinimums(countByCategory(allItems));
  if (!minimums.ok) return { kind: "incomplete", minimums };

  // B — sin evento: un look guardado, elegido de forma determinista por día.
  // Sin IA: ver la nota de decisión en lib/outfits/lookDelDia.ts.
  const sieteDiasAtras = offsetDate(today, -7);
  const usadosRecientemente = new Set(
    allUses.filter((u) => u.used_date >= sieteDiasAtras).map((u) => u.outfit_id)
  );

  const { data: outfitsGuardados } = await supabase
    .from("outfits")
    .select("id, name, occasion, clothing_item_ids");

  const look = pickLookDelDia({
    seed: seedDelDia(userId, bogotaDay(today)),
    outfits: outfitsGuardados ?? [],
    usadosRecientemente,
  });

  // Sin outfits guardados todavía: el armario da, pero no hay nada que
  // proponer. Se trata como armario incompleto — el CTA lleva a generar.
  if (!look) return { kind: "incomplete", minimums };

  const itemsDelLook = look.clothing_item_ids
    .map((id) => allItems.find((i) => i.id === id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i)) as HeroItemRow[];

  const { createSignedUrlMap } = await import("@/lib/storage/clothingImages");
  const { createThumbnailSignedUrlMap } = await import(
    "@/lib/storage/thumbnailUrls"
  );
  const [lookUrls, lookThumbs] = await Promise.all([
    createSignedUrlMap(
      supabase,
      itemsDelLook.map((i) => i.image_path).filter((p): p is string => Boolean(p))
    ),
    createThumbnailSignedUrlMap(itemsDelLook.map((i) => i.thumbnail_path)),
  ]);

  return {
    kind: "look",
    outfitId: look.id,
    name: look.name?.trim() || "Tu look de hoy",
    occasion: look.occasion,
    items: itemsDelLook.map((i) => ({
      id: i.id,
      category: i.category,
      subcategory: i.subcategory,
      name: i.name,
      primary_color: i.primary_color,
      background_removed: i.background_removed,
      image_url: i.image_path ? lookUrls.get(i.image_path) ?? null : null,
      thumbnail_url: i.thumbnail_path
        ? lookThumbs.get(i.thumbnail_path) ?? null
        : null,
    })),
  };
}

/** Las columnas de `clothing_items` que el hero necesita de `allItems`. */
type HeroItemRow = {
  id: string;
  category: ClothingCategory;
  subcategory: string | null;
  name: string | null;
  primary_color: string | null;
  image_path: string | null;
  thumbnail_path: string | null;
  background_removed: boolean | null;
};

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function offsetDate(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
