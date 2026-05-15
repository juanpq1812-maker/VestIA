// /outfits — pantalla principal de generacion de outfits con IA.
//
// Server Component: leemos al usuario y contamos sus prendas para decidir si
// renderizamos el generador o el empty state. La generacion en si pasa por
// la Server Action `generateOutfitsAction` (en `actions.ts`).

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import OutfitGenerator from "@/components/outfits/OutfitGenerator";

export default async function OutfitsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Contamos prendas (cabezera HEAD para no traer payload).
  const { count: itemsCount } = await supabase
    .from("clothing_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user?.id ?? "");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const totalItems = itemsCount ?? 0;

  const { count: savedOutfitsCount } = await supabase
    .from("outfits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user?.id ?? "");

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} displayName={profile?.display_name} />
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
            <OutfitGenerator totalItems={totalItems} savedOutfitsCount={savedOutfitsCount ?? 0} />
          </div>
        </Container>
      </main>
    </div>
  );
}
