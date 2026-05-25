// /outfits — pantalla principal de generacion de outfits con IA.
//
// Server Component: leemos al usuario y contamos sus prendas para decidir si
// renderizamos el generador o el empty state. La generacion en si pasa por
// la Server Action `generateOutfitsAction` (en `actions.ts`).
//
// Soporta query params:
//   ?prenda=<id>   ID de una prenda a incluir obligatoriamente.
//   ?nombre=<str>  Nombre codificado de la prenda (para mostrar el badge).

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import OutfitGenerator from "@/components/outfits/OutfitGenerator";
import type { WardrobeSummary } from "@/lib/outfits/tiendas";
import type { ClothingCategory } from "@/types/database";

type Props = {
  searchParams: Promise<{ prenda?: string; nombre?: string }>;
};

export default async function OutfitsPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [categoriesRes, profileRes, savedOutfitsCountRes, sp] = await Promise.all([
    supabase
      .from("clothing_items")
      .select("category")
      .eq("user_id", user?.id ?? ""),
    supabase
      .from("profiles")
      .select("display_name, ai_uses")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("outfits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user?.id ?? ""),
    searchParams,
  ]);

  const categoryItems = categoriesRes.data ?? [];
  const totalItems = categoryItems.length;
  const wardrobeSummary: WardrobeSummary = {};
  for (const item of categoryItems) {
    const cat = item.category as ClothingCategory;
    wardrobeSummary[cat] = (wardrobeSummary[cat] ?? 0) + 1;
  }

  const lockedItemId = sp.prenda ?? null;
  const lockedItemName = sp.nombre ? decodeURIComponent(sp.nombre) : null;

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} displayName={profileRes.data?.display_name} />
      <main className="flex-1 py-10 sm:py-14">
        <Container size="lg">
          <header className="max-w-2xl">
            <p className="text-sm text-text-muted">Outfits con IA</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-text sm:text-4xl">
              ¿Qué te pondrás hoy?
            </h1>
            <p className="mt-2 text-base text-text-muted">
              Elige un modo y la IA combinará prendas reales de tu armario.
              Cada generación produce 2 propuestas distintas; guarda la que
              más te guste.
            </p>
          </header>

          <div className="mt-10">
            <OutfitGenerator
              totalItems={totalItems}
              savedOutfitsCount={savedOutfitsCountRes.count ?? 0}
              lockedItemId={lockedItemId}
              lockedItemName={lockedItemName}
              wardrobeSummary={wardrobeSummary}
              aiUses={profileRes.data?.ai_uses ?? 0}
            />
          </div>
        </Container>
      </main>
    </div>
  );
}
