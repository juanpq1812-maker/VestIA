// Pagina del armario (/wardrobe). Server Component: leemos al usuario y sus
// prendas desde Supabase con RLS, firmamos URLs temporales para las imagenes
// privadas en Storage, y delegamos el filtrado/render al Client Component
// `CategoryFilter`.
//
// La proteccion de la ruta y el gate del onboarding la hace el Proxy
// (`src/proxy.ts`); aqui solo leemos defensivamente.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import CategoryFilter from "@/components/wardrobe/CategoryFilter";
import OnboardingProgressBar from "@/components/wardrobe/OnboardingProgressBar";
import UploadSuccessBanner from "@/components/wardrobe/UploadSuccessBanner";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
import type { ClothingItem } from "@/types/database";

type Props = {
  // En Next.js 16 los searchParams son async (Promise).
  searchParams: Promise<{ uploaded?: string }>;
};

export default async function WardrobePage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gracias a RLS, esta consulta solo trae las prendas del usuario logueado.
  const { data: itemsData } = await supabase
    .from("clothing_items")
    .select(
      "id, user_id, category, subcategory, name, primary_color, secondary_colors, occasions, image_url, image_path, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const itemsRaw = (itemsData ?? []) as ClothingItem[];

  // Firmamos las URLs de las imagenes (bucket privado).
  const paths = itemsRaw
    .map((i) => i.image_path)
    .filter((p): p is string => Boolean(p));
  const signedUrls = await createSignedUrlMap(supabase, paths);

  const items: ClothingItem[] = itemsRaw.map((i) => ({
    ...i,
    image_url: i.image_path ? signedUrls.get(i.image_path) ?? null : null,
  }));

  const tienePrendas = items.length > 0;
  const saludo =
    profile?.display_name?.trim() || user?.email?.split("@")[0] || "tu";

  // Items sin categorizar (subcategory null → subidas en bulk)
  const sinCategorizar = items.filter((i) => i.subcategory === null);
  const primeraSinCategorizar = sinCategorizar[0] ?? null;

  const sp = await searchParams;
  const mostrarBanner = sp.uploaded === "1";

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} displayName={profile?.display_name} />

      <main className="flex-1 py-10 sm:py-14">
        <Container size="lg">
          {mostrarBanner ? <UploadSuccessBanner /> : null}

          {/* Barra de progreso de onboarding (desaparece al tener 6+ prendas) */}
          <OnboardingProgressBar itemCount={items.length} />

          {/* Banner sin categorizar */}
          {sinCategorizar.length > 0 ? (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-warning bg-warning-light px-4 py-3">
              <p className="text-sm text-text">
                <span className="mr-1">📝</span>
                <strong>
                  Tenés {sinCategorizar.length}{" "}
                  {sinCategorizar.length === 1
                    ? "prenda sin categorizar"
                    : "prendas sin categorizar"}
                </strong>{" "}
                — Categorizalas para mejores outfits
              </p>
              {primeraSinCategorizar ? (
                <Link href={`/wardrobe/${primeraSinCategorizar.id}/edit`}>
                  <Button variant="secondary" size="md">
                    Completar →
                  </Button>
                </Link>
              ) : null}
            </div>
          ) : null}

          {/* Saludo + CTA */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-text-muted">Hola de nuevo 👋</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-text sm:text-4xl">
                {saludo}
              </h1>
              <p className="mt-2 max-w-xl text-base text-text-muted">
                {tienePrendas
                  ? "Aquí está tu armario digital. Filtrá por categoría o subí una nueva prenda."
                  : "Subí tus primeras 6 prendas para tu primer outfit con IA."}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/wardrobe/upload">
                <Button variant="primary" size="md">
                  + Agregar prenda
                </Button>
              </Link>
            </div>
          </div>

          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">Mi armario</h2>
              <span className="text-xs text-text-muted">
                {items.length} {items.length === 1 ? "prenda" : "prendas"}
              </span>
            </div>

            {tienePrendas ? (
              <div className="mt-4">
                <CategoryFilter items={items} />
              </div>
            ) : (
              <EmptyWardrobe />
            )}
          </section>
        </Container>
      </main>
    </div>
  );
}

function EmptyWardrobe() {
  return (
    <div className="mt-4 rounded-xl border-2 border-dashed border-border bg-surface-2 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-text">
        Subí 6 prendas para tu primer outfit
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
        2 tops + 2 bottoms + 1 zapato + 1 accesorio es todo lo que necesitás.
        ¡En 10 minutos tenés tu primer look generado por IA!
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/wardrobe/upload">
          <Button variant="primary">Subir mi primera prenda</Button>
        </Link>
      </div>
    </div>
  );
}
