// Pagina del armario (/wardrobe). Server Component: leemos al usuario, sus
// prendas y los usos de outfits desde Supabase con RLS, firmamos URLs
// temporales para las imagenes privadas en Storage, calculamos las prendas
// destacadas (mas/menos usada) y delegamos el render al Client Component
// `WardrobeView`.
//
// La proteccion de la ruta y el gate del onboarding la hace el Proxy
// (`src/proxy.ts`); aqui solo leemos defensivamente.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import WardrobeView, { type FeaturedItem } from "@/components/wardrobe/WardrobeView";
import WardrobeTabs from "@/components/wardrobe/WardrobeTabs";
import OnboardingProgressBar from "@/components/wardrobe/OnboardingProgressBar";
import UploadSuccessBanner from "@/components/wardrobe/UploadSuccessBanner";
import PendingItemsBanner from "@/components/wardrobe/PendingItemsBanner";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
import { createThumbnailSignedUrlMap } from "@/lib/storage/thumbnailUrls";
import { CONFIRMED_STATUS } from "@/lib/wardrobe/constants";
import { contarPendientes } from "@/lib/wardrobe/pendingCount";
import type { ClothingItem } from "@/types/database";

type Props = {
  // En Next.js 16 los searchParams son async (Promise).
  searchParams: Promise<{ uploaded?: string; fotoAviso?: string }>;
};

export default async function WardrobePage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gracias a RLS, estas consultas solo traen datos del usuario logueado.
  const [{ data: itemsData, error: itemsError }, { data: outfitsData }, { data: usesData }, { data: profile }] =
    await Promise.all([
      supabase
        .from("clothing_items")
        .select(
          "id, user_id, category, subcategory, name, primary_color, secondary_colors, occasions, image_url, image_path, thumbnail_path, source, background_removed, created_at, updated_at"
        )
        .eq("status", CONFIRMED_STATUS)
        .order("created_at", { ascending: false }),
      supabase.from("outfits").select("id, clothing_item_ids"),
      supabase.from("outfit_uses").select("outfit_id"),
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user?.id ?? "")
        .maybeSingle(),
    ]);
  void profile;

  // Sin esto el fallo es MUDO: si el select falla (una columna que no existe
  // porque falta correr una migración, por ejemplo), `itemsData` viene null,
  // `itemsRaw` queda vacío y el armario se renderiza como si el usuario no
  // tuviera prendas. Un armario vacío por error es peor que un error.
  if (itemsError) {
    console.error("[WardrobePage] error leyendo clothing_items", itemsError);
  }

  const itemsRaw = (itemsData ?? []) as ClothingItem[];

  // Firmamos las URLs de las imagenes (bucket privado).
  //
  // Dos firmas distintas a proposito: las miniaturas van por
  // `createThumbnailSignedUrlMap`, que memoiza la firma para que la URL sea
  // ESTABLE entre visitas — sin eso el navegador nunca acierta en cache, porque
  // el JWT de Supabase incluye `iat` y cambia en cada firma. Ver
  // lib/storage/thumbnailUrls.ts.
  const paths = itemsRaw
    .map((i) => i.image_path)
    .filter((p): p is string => Boolean(p));
  const [signedUrls, thumbUrls] = await Promise.all([
    createSignedUrlMap(supabase, paths),
    createThumbnailSignedUrlMap(itemsRaw.map((i) => i.thumbnail_path)),
  ]);

  const items: ClothingItem[] = itemsRaw.map((i) => ({
    ...i,
    image_url: i.image_path ? signedUrls.get(i.image_path) ?? null : null,
    thumbnail_url: i.thumbnail_path ? thumbUrls.get(i.thumbnail_path) ?? null : null,
  }));

  const tienePrendas = items.length > 0;

  // ── Destacadas: prenda mas usada y menos usada segun outfit_uses ─────────
  const outfitItemIds = new Map<string, string[]>();
  for (const o of outfitsData ?? []) {
    outfitItemIds.set(o.id, o.clothing_item_ids ?? []);
  }
  const useCounts = new Map<string, number>();
  for (const item of items) useCounts.set(item.id, 0);
  for (const use of usesData ?? []) {
    for (const itemId of outfitItemIds.get(use.outfit_id) ?? []) {
      if (useCounts.has(itemId)) {
        useCounts.set(itemId, (useCounts.get(itemId) ?? 0) + 1);
      }
    }
  }

  const destacadas: FeaturedItem[] = [];
  if (items.length >= 2 && [...useCounts.values()].some((n) => n > 0)) {
    const ordenadas = [...items].sort(
      (a, b) => (useCounts.get(b.id) ?? 0) - (useCounts.get(a.id) ?? 0)
    );
    const masUsada = ordenadas[0];
    const menosUsada = ordenadas[ordenadas.length - 1];
    if (masUsada && menosUsada && masUsada.id !== menosUsada.id) {
      destacadas.push(
        { item: masUsada, label: "Prenda más usada" },
        { item: menosUsada, label: "Prenda menos usada" }
      );
    }
  }

  // Items sin categorizar (subcategory null → subidas en bulk)
  const sinCategorizar = items.filter((i) => i.subcategory === null);
  const primeraSinCategorizar = sinCategorizar[0] ?? null;

  // Prendas escaneadas que nunca se confirmaron. Va después de las queries de
  // arriba y no dentro de su Promise.all porque necesita `user`, que se
  // resuelve antes; es un count con `head: true`, así que no trae filas.
  const pendientes = user ? await contarPendientes(supabase, user.id) : 0;

  const sp = await searchParams;
  const mostrarBanner = sp.uploaded === "1";
  // La foto no quedo como debia: la prenda se guardo igual, pero hay que
  // avisarlo (ver UploadSuccessBanner).
  const fotoAviso =
    sp.fotoAviso === "parcial" || sp.fotoAviso === "falla" ? sp.fotoAviso : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} />

      <main className="flex-1 pb-32 pt-8 sm:pb-14 sm:pt-12">
        <Container size="lg">
          {mostrarBanner ? (
            <UploadSuccessBanner photoWarning={fotoAviso} />
          ) : null}

          {/* Arriba de todo el contenido del armario: el usuario que baja a
              buscar una prenda que no encuentra tiene que toparse con la
              explicación ANTES que con la ausencia. */}
          {pendientes > 0 ? (
            <div className="mb-6">
              <PendingItemsBanner count={pendientes} />
            </div>
          ) : null}

          {/* Barra de progreso de onboarding (desaparece al tener 6+ prendas) */}
          <OnboardingProgressBar itemCount={items.length} />

          {/* Banner sin categorizar */}
          {sinCategorizar.length > 0 ? (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-warning bg-warning-light px-4 py-3">
              <p className="text-sm text-text">
                <strong>
                  Tienes {sinCategorizar.length}{" "}
                  {sinCategorizar.length === 1
                    ? "prenda sin categorizar"
                    : "prendas sin categorizar"}
                </strong>{" "}
                — Categorízalas para mejores outfits
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

          {/* ── Título + tabs ─────────────────────────────────────────── */}
          <div className="flex items-end justify-between gap-4">
            <h1 className="font-display text-3xl tracking-tight text-text sm:text-4xl">
              Armario
            </h1>
            {/* CTA desktop — en mobile vive como FAB */}
            <div className="hidden md:block">
              <Link href="/wardrobe/upload">
                <Button variant="primary" size="md">
                  + Agregar prenda
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <WardrobeTabs active="prendas" />
          </div>

          <section className="mt-8">
            {tienePrendas ? (
              <WardrobeView items={items} destacadas={destacadas} />
            ) : (
              <EmptyWardrobe />
            )}
          </section>
        </Container>
      </main>

      {/* ── FAB mobile: Agregar Prenda ──────────────────────────────────── */}
      <Link
        href="/wardrobe/upload"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-primary-hover active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Agregar prenda
      </Link>
    </div>
  );
}

function EmptyWardrobe() {
  return (
    <div className="rounded-xl bg-surface-offset p-10 text-center">
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
      <h3 className="mt-4 font-display text-xl text-text">
        Sube 6 prendas para tu primer outfit
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
        2 tops + 2 bottoms + 1 zapato + 1 accesorio es todo lo que necesitas.
        ¡En 10 minutos tienes tu primer look generado por IA!
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/wardrobe/upload">
          <Button variant="primary">Subir mi primera prenda</Button>
        </Link>
      </div>
    </div>
  );
}
