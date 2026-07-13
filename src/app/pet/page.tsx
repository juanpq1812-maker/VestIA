// /pet — pantalla completa de Hebri, la mascota de StrandIA.
// Accesible desde el widget de Hebri en el Home.

import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import HebriFull from "@/components/pet/HebriFull";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getPetState } from "@/lib/pet/query";

export const metadata = {
  title: "Hebri — StrandIA",
};

export default async function PetPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const petState = user
    ? await getPetState(supabase, user.id)
    : { score: 100, mood: "feliz" as const, isDirty: false };

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="sm">
          <HebriFull {...petState} />
        </Container>
      </main>
    </div>
  );
}
