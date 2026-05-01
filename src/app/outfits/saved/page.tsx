// /outfits/saved — lista de outfits guardados por el usuario.
//
// Server Component: leemos los outfits con RLS, despues hidratamos con la
// info de las prendas (sus fotos vienen de Storage privado, asi que firmamos
// URLs temporales). El boton de eliminar vive en `SavedOutfitCard`.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import SavedOutfitCard from "@/components/outfits/SavedOutfitCard";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
import type { ClothingItem, Outfit } from "@/types/database";

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
                />
              ))}
            </div>
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
