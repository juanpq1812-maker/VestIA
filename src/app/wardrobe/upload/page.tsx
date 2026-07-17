// Pantalla "Subir prenda" (/wardrobe/upload).
//
// El shell (header + saludo) se renderiza en el servidor para resolver el
// usuario y su display_name. La logica del formulario (file input, compresion,
// upload a Storage e insert en clothing_items) vive en `UploadForm`, un
// Client Component.
//
// La proteccion de la ruta y el gate del onboarding la hace el Proxy
// (`src/proxy.ts`); aqui solo leemos defensivamente.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import UploadForm from "@/components/wardrobe/UploadForm";
import BurstCapture from "@/components/wardrobe/BurstCapture";

type Props = {
  searchParams: Promise<{ modo?: string }>;
};

export default async function UploadPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const sp = await searchParams;
  const modoIndividual = sp.modo === "individual";

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} displayName={profile?.display_name} hideNav />

      <main className="flex-1 pb-24 pt-10 sm:pb-14 sm:pt-14">
        <Container size="md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-text-muted">Armario digital</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-text sm:text-4xl">
                Subir prenda
              </h1>
              <p className="mt-2 max-w-xl text-base text-text-muted">
                {modoIndividual
                  ? "Sube una foto, dinos que es y para que ocasiones la usas. Va directo a tu armario y queda lista para que la IA la combine."
                  : "Capturá tus prendas una tras otra sin pausas — analizamos todo en segundo plano mientras seguís fotografiando."}
              </p>
            </div>
            <Link href="/wardrobe">
              <Button variant="ghost">Volver al armario</Button>
            </Link>
          </div>

          <div className="mt-8">
            {modoIndividual ? <UploadForm /> : <BurstCapture />}
          </div>
        </Container>
      </main>
    </div>
  );
}
