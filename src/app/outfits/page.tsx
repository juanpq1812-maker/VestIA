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
import { CONFIRMED_STATUS } from "@/lib/wardrobe/constants";
import { checkWardrobeMinimums } from "@/lib/wardrobe/wardrobeMinimums";
import { getCurrentWeather } from "@/lib/weather/openMeteo";
import type { ClothingCategory } from "@/types/database";

type Props = {
  searchParams: Promise<{ prenda?: string; nombre?: string }>;
};

export default async function OutfitsPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [categoriesRes, profileRes, sp, weather] = await Promise.all([
    supabase
      .from("clothing_items")
      .select("category")
      .eq("user_id", user?.id ?? "")
      .eq("status", CONFIRMED_STATUS),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    searchParams,
    getCurrentWeather(),
  ]);

  const categoryItems = categoriesRes.data ?? [];
  const wardrobeSummary: WardrobeSummary = {};
  for (const item of categoryItems) {
    const cat = item.category as ClothingCategory;
    wardrobeSummary[cat] = (wardrobeSummary[cat] ?? 0) + 1;
  }

  // Los mismos mínimos que aplica generateOutfits en el servidor. Evaluarlos
  // acá evita que el usuario dispare una generación que ya sabemos que va a
  // fallar: el generador muestra el checklist de progreso en su lugar.
  const minimums = checkWardrobeMinimums(wardrobeSummary);

  const lockedItemId = sp.prenda ?? null;
  const lockedItemName = sp.nombre ? decodeURIComponent(sp.nombre) : null;

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} displayName={profileRes.data?.display_name} />
      <main className="flex-1 pb-24 pt-10 sm:pb-14 sm:pt-14">
        <Container size="lg">
          <header className="max-w-2xl">
            <h1 className="font-display text-3xl tracking-tight text-text sm:text-4xl">
              AI Studio
            </h1>
            <p className="mt-2 text-base text-text-muted">
              Elige un modo y la IA combinará prendas reales de tu armario.
              Cada generación produce 2 propuestas distintas; guarda la que
              más te guste.
            </p>
          </header>

          <div className="mt-8">
            <OutfitGenerator
              minimums={minimums}
              lockedItemId={lockedItemId}
              lockedItemName={lockedItemName}
              wardrobeSummary={wardrobeSummary}
              weather={weather}
            />
          </div>
        </Container>
      </main>
    </div>
  );
}
