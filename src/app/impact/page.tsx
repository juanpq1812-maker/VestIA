// /impact — Tu consumo inteligente.
//
// Muestra qué tan activo está el armario del usuario: qué porcentaje de
// sus prendas ha sido parte de un outfit registrado, cuántos outfits únicos
// se han generado, y el promedio de usos por prenda.
//
// Server Component: consultas en paralelo a Supabase.
// Bifurcación de UI:
//   - totalUses === 0 → estado vacío con CTA.
//   - totalUses >= 1  → métricas reales con número héroe animado.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CountUpNumber from "@/components/impact/CountUpNumber";
import { formatEsNumber } from "@/lib/impact/calculations";

export default async function ImpactPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? "";

  const [profileRes, itemsCountRes, usesCountRes, outfitsCountRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("clothing_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("outfit_uses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("outfits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

  const displayName = profileRes.data?.display_name ?? null;
  const totalItems = itemsCountRes.count ?? 0;
  const totalUses = usesCountRes.count ?? 0;
  const totalOutfits = outfitsCountRes.count ?? 0;

  // Calcular prendas activas (aparecen en al menos un outfit que fue usado).
  // Solo hacemos estas consultas si hay usos registrados.
  let activeItemsCount = 0;
  if (totalUses > 0 && totalItems > 0) {
    const { data: usesData } = await supabase
      .from("outfit_uses")
      .select("outfit_id")
      .eq("user_id", userId);

    const usedOutfitIds = [
      ...new Set(
        (usesData ?? []).map((u: { outfit_id: string }) => u.outfit_id)
      ),
    ];

    if (usedOutfitIds.length > 0) {
      const { data: outfitsData } = await supabase
        .from("outfits")
        .select("clothing_item_ids")
        .in("id", usedOutfitIds);

      const activeIds = new Set(
        (outfitsData ?? []).flatMap(
          (o: { clothing_item_ids: string[] | null }) => o.clothing_item_ids ?? []
        )
      );
      activeItemsCount = activeIds.size;
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} displayName={displayName} />
      <main className="flex-1 py-10 sm:py-14">
        <Container size="md">
          <header className="text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              Tu consumo inteligente
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm text-text-muted">
              El colombiano promedio usa solo el 30% de su armario.
              <br />
              Tú estás haciendo mejor.
            </p>
          </header>

          <div className="mt-8">
            {totalUses === 0 ? (
              <EmptyConsumption />
            ) : (
              <RealConsumption
                totalItems={totalItems}
                totalUses={totalUses}
                totalOutfits={totalOutfits}
                activeItemsCount={activeItemsCount}
              />
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CASO 1: usuario CON datos.
// ---------------------------------------------------------------------------

function RealConsumption({
  totalItems,
  totalUses,
  totalOutfits,
  activeItemsCount,
}: {
  totalItems: number;
  totalUses: number;
  totalOutfits: number;
  activeItemsCount: number;
}) {
  const activePercent =
    totalItems > 0 ? Math.round((activeItemsCount / totalItems) * 100) : 0;
  const avgUsesPerItem =
    totalItems > 0 ? (totalUses / totalItems).toFixed(1) : "0.0";
  const unusedCount = Math.max(0, totalItems - activeItemsCount);

  return (
    <Card padding="lg" className="text-center">
      {/* Icono héroe */}
      <div
        aria-hidden="true"
        className="mx-auto flex h-24 w-24 items-center justify-center text-7xl"
      >
        👗
      </div>

      {/* Número héroe */}
      <h1 className="mt-4 font-display text-5xl font-bold leading-none text-text sm:text-6xl">
        <CountUpNumber value={activePercent} />
        <span className="ml-1 text-3xl font-semibold text-text-muted sm:text-4xl">
          %
        </span>
      </h1>
      <p className="mt-3 text-base font-medium text-text sm:text-lg">
        de tu armario activo
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
        {activeItemsCount} de tus {totalItems}{" "}
        {totalItems === 1 ? "prenda ha" : "prendas han"} aparecido en un outfit
        registrado.
      </p>

      {/* Separador */}
      <div className="mt-8 flex items-center gap-3 text-xs uppercase tracking-widest text-text-faint">
        <span className="h-px flex-1 bg-divider" />
        Detalles
        <span className="h-px flex-1 bg-divider" />
      </div>

      {/* Métricas secundarias */}
      <dl className="mt-6 grid gap-4 text-left sm:grid-cols-3">
        <SecondaryStat
          icon="✨"
          value={formatEsNumber(totalOutfits)}
          label={totalOutfits === 1 ? "outfit único generado" : "outfits únicos generados"}
        />
        <SecondaryStat
          icon="👗"
          value={avgUsesPerItem}
          label="usos promedio por prenda"
        />
        <SecondaryStat
          icon="😴"
          value={formatEsNumber(unusedCount)}
          label={unusedCount === 1 ? "prenda sin usar" : "prendas sin usar"}
        />
      </dl>
    </Card>
  );
}

function SecondaryStat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-2 p-4">
      <span aria-hidden="true" className="text-2xl">
        {icon}
      </span>
      <div>
        <dt className="text-base font-semibold text-text">{value}</dt>
        <dd className="text-xs text-text-muted">{label}</dd>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CASO 2: usuario SIN datos.
// ---------------------------------------------------------------------------

function EmptyConsumption() {
  return (
    <Card padding="lg" className="text-center">
      <div
        aria-hidden="true"
        className="mx-auto flex h-24 w-24 animate-pulse items-center justify-center text-7xl"
      >
        👗
      </div>

      <h1 className="mt-4 font-display text-3xl font-bold text-text sm:text-4xl">
        ¿Qué tan activo está tu armario?
      </h1>

      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-text-muted">
        Registra el uso de tus outfits para ver qué tan activo está tu armario.
      </p>

      <div className="mt-8 flex justify-center">
        <Link href="/outfits" aria-label="Ir a generar outfits con IA">
          <Button variant="primary" size="lg">
            ✨ Generar mi primer outfit →
          </Button>
        </Link>
      </div>
    </Card>
  );
}
