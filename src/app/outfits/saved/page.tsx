// /outfits/saved — lista de outfits guardados por el usuario.
//
// Server Component: leemos los outfits con RLS, hidratamos con la info de las
// prendas (firmamos URLs temporales porque el bucket es privado) y traemos
// tambien `outfit_uses` para calcular total de usos / ultimo uso por outfit.
//
// La seccion "Repetiste outfit?" usa los 4 outfits con uso mas reciente; se
// oculta si el usuario nunca ha registrado uso de ningun outfit.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import SavedOutfitCard from "@/components/outfits/SavedOutfitCard";
import RepeatedOutfitsSection, {
  type RepeatableOutfit,
} from "@/components/outfits/RepeatedOutfitsSection";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
import type { ClothingItem, Outfit, OutfitUse } from "@/types/database";

export default async function SavedOutfitsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const { data: outfitsData } = await supabase
    .from("outfits")
    .select("id, user_id, name, occasion, clothing_item_ids, ai_generated, notes, created_at")
    .order("created_at", { ascending: false });

  const outfits = (outfitsData ?? []) as Outfit[];

  // Trae todos los usos del usuario (RLS filtra por dueno). Es N filas, no N
  // queries — escala bien para el MVP.
  const { data: usesData } = await supabase
    .from("outfit_uses")
    .select("id, user_id, outfit_id, used_date, created_at")
    .order("used_date", { ascending: false });

  const uses = (usesData ?? []) as OutfitUse[];

  // Mapa outfitId -> array de fechas (ordenadas asc para que .at(-1) sea la mas reciente).
  const usesByOutfit = new Map<string, string[]>();
  for (const u of uses) {
    const arr = usesByOutfit.get(u.outfit_id) ?? [];
    arr.push(u.used_date);
    usesByOutfit.set(u.outfit_id, arr);
  }
  // El query las trae desc; las invertimos para que el orden lexicografico
  // funcione en `lastUsedIso = arr.sort().at(-1)` desde la card.

  // Recolectamos todos los IDs de prendas referenciadas por estos outfits y
  // los traemos en una sola consulta. Asi evitamos N+1.
  const allItemIds = Array.from(
    new Set(outfits.flatMap((o) => o.clothing_item_ids))
  );

  let itemsById = new Map<string, ClothingItem>();
  if (allItemIds.length > 0) {
    const { data: itemsRaw } = await supabase
      .from("clothing_items")
      .select(
        "id, user_id, category, subcategory, name, primary_color, secondary_colors, occasions, image_url, image_path, created_at, updated_at"
      )
      .in("id", allItemIds);

    const items = (itemsRaw ?? []) as ClothingItem[];
    const paths = items
      .map((i) => i.image_path)
      .filter((p): p is string => Boolean(p));
    const signed = await createSignedUrlMap(supabase, paths);

    itemsById = new Map(
      items.map((it) => [
        it.id,
        {
          ...it,
          image_url: it.image_path ? signed.get(it.image_path) ?? null : null,
        },
      ])
    );
  }

  // Construimos la lista de "Repetiste outfit?" (los 4 mas recientes USADOS).
  // El primer uso de cada outfit en `uses` es el mas reciente porque ya viene
  // ordenado desc — tomamos el primero por outfit.
  const lastUseByOutfit = new Map<string, string>();
  for (const u of uses) {
    if (!lastUseByOutfit.has(u.outfit_id)) {
      lastUseByOutfit.set(u.outfit_id, u.used_date);
    }
  }
  const repeatable: RepeatableOutfit[] = Array.from(lastUseByOutfit.entries())
    .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
    .slice(0, 4)
    .map(([outfitId, lastUsedIso]) => {
      const outfit = outfits.find((o) => o.id === outfitId);
      if (!outfit) return null;
      const cover = outfit.clothing_item_ids
        .map((id) => itemsById.get(id))
        .find((it): it is ClothingItem => Boolean(it)) ?? null;
      return {
        id: outfit.id,
        name: outfit.name,
        cover,
        lastUsedIso,
        usedDates: usesByOutfit.get(outfit.id) ?? [],
      };
    })
    .filter((x): x is RepeatableOutfit => x !== null);

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} displayName={profile?.display_name} />
      <main className="flex-1 py-10 sm:py-14">
        <Container size="lg">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-text-muted">Outfits con IA</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-text sm:text-4xl">
                Mis outfits guardados
              </h1>
            </div>
            <Link href="/outfits">
              <Button variant="secondary">+ Generar nuevo outfit</Button>
            </Link>
          </header>

          {outfits.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <RepeatedOutfitsSection outfits={repeatable} />

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                {outfits.map((o) => (
                  <SavedOutfitCard
                    key={o.id}
                    outfitId={o.id}
                    name={o.name}
                    occasion={o.occasion}
                    notes={o.notes}
                    createdAt={o.created_at}
                    items={o.clothing_item_ids
                      .map((id) => itemsById.get(id))
                      .filter((it): it is ClothingItem => Boolean(it))}
                    usedDates={usesByOutfit.get(o.id) ?? []}
                  />
                ))}
              </div>
            </>
          )}
        </Container>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-xl border-2 border-dashed border-border bg-surface-2 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
        <span aria-hidden="true" className="text-2xl">
          💾
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-text">
        Aun no has guardado outfits
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
        Genera un outfit con IA y dale al boton &ldquo;Guardar&rdquo; para
        verlo aqui mas tarde.
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/outfits">
          <Button variant="primary">Generar mi primer outfit</Button>
        </Link>
      </div>
    </div>
  );
}
