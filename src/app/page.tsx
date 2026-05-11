// Raíz de VestIA (/).
//
// Sin sesión → Landing pública (estática, sin DB).
// Con sesión → Dashboard personalizado (Server Component con queries en paralelo).
//
// El Proxy ya NO redirige esta ruta al armario, así que necesitamos resolver
// la sesión aquí mismo.

import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import DashboardView from "@/components/dashboard/DashboardView";
import LandingContent from "@/components/landing/LandingContent";

export const metadata: Metadata = {
  title: "VestIA — Tu armario digital con IA",
  description:
    "Generá outfits con la ropa que ya tenés. Reducí el impacto de tu armario, descubrí prendas olvidadas y vestite con conciencia.",
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
  const sevenDaysAgoStr = offsetDate(today, -7);
  const thirtyDaysAgoStr = offsetDate(today, -30);

  const [
    profileRes,
    totalUsesRes,
    weekUsesRes,
    allUsesRes,
    allOutfitsRes,
    allItemsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("outfit_uses")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("outfit_uses")
      .select("id", { count: "exact", head: true })
      .gte("used_date", sevenDaysAgoStr),
    supabase.from("outfit_uses").select("outfit_id, used_date"),
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
  const totalUses = totalUsesRes.count ?? 0;
  const weekUses = weekUsesRes.count ?? 0;
  const allUses = allUsesRes.data ?? [];
  const allOutfits = allOutfitsRes.data ?? [];
  const allItems = allItemsRes.data ?? [];

  // ── Mapa outfit_id → clothing_item_ids[] ────────────────────────────────
  const outfitMap = new Map<string, string[]>();
  for (const outfit of allOutfits) {
    outfitMap.set(outfit.id, outfit.clothing_item_ids ?? []);
  }

  // ── Prenda estrella: prenda con más apariciones en outfit_uses ───────────
  const itemUseCounts = new Map<string, number>();
  for (const use of allUses) {
    for (const itemId of outfitMap.get(use.outfit_id) ?? []) {
      itemUseCounts.set(itemId, (itemUseCounts.get(itemId) ?? 0) + 1);
    }
  }
  let prendaEstrella: { id: string; nombre: string; image_path: string | null; usos: number } | null = null;
  if (itemUseCounts.size > 0) {
    const [topId, topCount] = [...itemUseCounts.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0];
    const topItem = allItems.find((i) => i.id === topId);
    if (topItem) {
      prendaEstrella = {
        id: topItem.id,
        nombre: topItem.name?.trim() || topItem.subcategory?.trim() || topItem.category,
        image_path: topItem.image_path,
        usos: topCount,
      };
    }
  }

  // ── Prenda olvidada: sin uso en outfit_uses en los últimos 30 días ───────
  const recentlyUsedItemIds = new Set<string>();
  for (const use of allUses) {
    if (use.used_date >= thirtyDaysAgoStr) {
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

  // Candidatas: prendas no usadas en 30 días Y creadas hace 30+ días
  type Candidata = { id: string; nombre: string; image_path: string | null; diasOlvidada: number };
  const candidatas: Candidata[] = [];
  for (const item of allItems) {
    if (recentlyUsedItemIds.has(item.id)) continue;
    const createdDaysAgo = daysBetween(new Date(item.created_at), today);
    if (createdDaysAgo < 30) continue;

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
      diasOlvidada,
    });
  }
  candidatas.sort((a, b) => b.diasOlvidada - a.diasOlvidada);
  const prendaOlvidada = candidatas[0] ?? null;

  // ── Firmar URLs para imágenes que vamos a mostrar ────────────────────────
  const { createSignedUrlMap } = await import("@/lib/storage/clothingImages");
  const recentItems = allItems.slice(0, 4);
  const pathsToSign = [
    ...recentItems.map((i) => i.image_path),
    prendaEstrella?.image_path,
    prendaOlvidada?.image_path,
  ].filter((p): p is string => Boolean(p));

  const signedUrls = await createSignedUrlMap(supabase, pathsToSign);

  // Inyectar URLs firmadas en los objetos
  const recentItemsConUrl = recentItems.map((i) => ({
    ...i,
    image_url: i.image_path ? signedUrls.get(i.image_path) ?? null : null,
  }));
  if (prendaEstrella?.image_path) {
    (prendaEstrella as { image_url?: string | null }).image_url =
      signedUrls.get(prendaEstrella.image_path) ?? null;
  }
  if (prendaOlvidada?.image_path) {
    (prendaOlvidada as { image_url?: string | null }).image_url =
      signedUrls.get(prendaOlvidada.image_path) ?? null;
  }

  return (
    <DashboardView
      displayName={displayName}
      totalUses={totalUses}
      weekUses={weekUses}
      totalItems={allItems.length}
      recentItems={recentItemsConUrl as Parameters<typeof DashboardView>[0]["recentItems"]}
      prendaEstrella={prendaEstrella as Parameters<typeof DashboardView>[0]["prendaEstrella"]}
      prendaOlvidada={prendaOlvidada as Parameters<typeof DashboardView>[0]["prendaOlvidada"]}
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
