// Pantalla de revisión final del modo ráfaga (/wardrobe/upload/review).
//
// Muestra todas las prendas capturadas en la sesión de ráfaga (procesando,
// listas para revisar o con error) y permite corregir atributos, eliminar,
// reintentar, y confirmar el lote completo. Las prendas NO son parte del
// armario hasta que se confirman acá — ver CONFIRMED_STATUS.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import ReviewGrid from "@/components/wardrobe/ReviewGrid";

// Ver nota de maxDuration en /wardrobe/upload/page.tsx — mismo pipeline de
// imagen, reintentos de prendas con error también pueden llamarlo acá.
// Los tres sitios tienen que moverse juntos: comparten el mismo pipeline.
export const maxDuration = 120;

export default async function ReviewPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} hideNav />

      <main className="flex-1 pb-24 pt-10 sm:pb-14 sm:pt-14">
        <Container size="lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-text-muted">Armario digital</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-text sm:text-4xl">
                Revisa tus prendas
              </h1>
              <p className="mt-2 max-w-xl text-base text-text-muted">
                Corrige lo que haga falta y confirma el lote — recién ahí se
                suman a tu armario.
              </p>
            </div>
            <Link href="/wardrobe/upload">
              <Button variant="ghost">Seguir capturando</Button>
            </Link>
          </div>

          <div className="mt-8">
            <ReviewGrid userId={user.id} />
          </div>
        </Container>
      </main>
    </div>
  );
}
