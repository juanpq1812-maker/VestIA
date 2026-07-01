// Dashboard personalizado para usuarios con sesión activa (/).
//
// Server Component: recibe todos los datos pre-calculados desde page.tsx.
// Responsabilidad de este componente: solo UI.
//
// Estructura editorial ("El Armario Editorial", ver DESIGN.md):
//   1. Saludo personal.
//   2. Hero "Outfit del día" — construido con datos reales (prenda estrella
//      o, si aún no hay usos, la prenda más reciente) + CTA fuerte a generar
//      outfit. Sin datos → empty state invitando a subir la primera prenda.
//   3. Grid secundario: prenda olvidada (real) + Comunidad (placeholder, sin
//      funcionalidad todavía).
//   4. Preview del armario.
//   5. Inspiración → CTA a generar outfits con IA.

import Link from "next/link";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LazyImage from "@/components/ui/LazyImage";
import type { ClothingCategory } from "@/types/database";

// ── Tipos ────────────────────────────────────────────────────────────────────

type RecentItem = {
  id: string;
  name: string | null;
  subcategory: string | null;
  category: ClothingCategory;
  primary_color: string | null;
  image_url: string | null;
};

type PrendaEstrella = {
  id: string;
  nombre: string;
  image_path: string | null;
  image_url?: string | null;
  primary_color: string | null;
  usos: number;
} | null;

type PrendaOlvidada = {
  id: string;
  nombre: string;
  image_path: string | null;
  image_url?: string | null;
  primary_color: string | null;
  diasOlvidada: number;
} | null;

type Props = {
  displayName: string;
  weekUses: number;
  totalItems: number;
  recentItems: RecentItem[];
  prendaEstrella: PrendaEstrella;
  prendaOlvidada: PrendaOlvidada;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fechaHoyEspanol(): string {
  const fecha = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Capitalizar primera letra: "lunes, 10 de mayo" → "Lunes, 10 de mayo"
  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

const CATEGORY_LABELS: Record<ClothingCategory, string> = {
  top: "Top",
  bottom: "Bottom",
  dress: "Vestido",
  outerwear: "Abrigo",
  footwear: "Calzado",
  accessory: "Accesorio",
  body: "Body",
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function DashboardView({
  displayName,
  weekUses,
  totalItems,
  recentItems,
  prendaEstrella,
  prendaOlvidada,
}: Props) {
  const fecha = fechaHoyEspanol();
  const esUsuarioNuevo = totalItems === 0;

  return (
    <div className="flex flex-1 flex-col">
      <Header displayName={displayName} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="lg">
          {/* ── Header personal ─────────────────────────────────────────── */}
          <div className="mb-8">
            <p className="text-sm text-text-muted">{fecha}</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-text sm:text-4xl">
              Hola de nuevo, {displayName} 👋
            </h1>
          </div>

          {esUsuarioNuevo ? (
            <NuevoUsuario />
          ) : (
            <DashboardConDatos
              weekUses={weekUses}
              totalItems={totalItems}
              recentItems={recentItems}
              prendaEstrella={prendaEstrella}
              prendaOlvidada={prendaOlvidada}
            />
          )}
        </Container>
      </main>
    </div>
  );
}

// ── Estado usuario nuevo (0 prendas) ─────────────────────────────────────────

function NuevoUsuario() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-border bg-surface-2 px-6 py-14 text-center">
      <span className="text-5xl">🌱</span>
      <div>
        <h2 className="font-display text-2xl font-bold text-text sm:text-3xl">
          Tu armario digital te espera
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-text-muted">
          Para tu primer outfit solo necesitas{" "}
          <strong>6 prendas</strong>: 2 tops + 2 bottoms + 1 zapato +
          1 accesorio. ¡En 10 minutos tienes tu primer look!
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link href="/wardrobe/upload">
          <Button size="lg">📸 Sube tu primera prenda</Button>
        </Link>
        <Link href="/outfits">
          <Button size="lg" variant="ghost">
            ✨ Genera un outfit
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Dashboard con datos ───────────────────────────────────────────────────────

type DashboardConDatosProps = {
  weekUses: number;
  totalItems: number;
  recentItems: RecentItem[];
  prendaEstrella: PrendaEstrella;
  prendaOlvidada: PrendaOlvidada;
};

function DashboardConDatos({
  weekUses,
  totalItems,
  recentItems,
  prendaEstrella,
  prendaOlvidada,
}: DashboardConDatosProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* ── Hero: Outfit del día ─────────────────────────────────────────── */}
      <OutfitDelDiaHero
        weekUses={weekUses}
        prendaEstrella={prendaEstrella}
        primerItem={recentItems[0] ?? null}
      />

      {/* ── Grid secundario: prenda olvidada + comunidad (placeholder) ───── */}
      <div className="grid grid-cols-2 gap-4">
        <PrendaOlvidadaCard prendaOlvidada={prendaOlvidada} />
        <ComunidadCard />
      </div>

      {/* ── Preview del armario ─────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-text">
            Tu armario
            <span className="ml-2 text-sm font-normal text-text-muted">
              · {totalItems} {totalItems === 1 ? "prenda" : "prendas"}
            </span>
          </h2>
          <Link
            href="/wardrobe"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver todo →
          </Link>
        </div>

        {recentItems.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {recentItems.map((item) => {
              const label =
                item.name?.trim() ||
                item.subcategory?.trim() ||
                CATEGORY_LABELS[item.category];
              return (
                <Link key={item.id} href="/wardrobe" className="group block">
                  <div
                    className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-surface-2"
                    style={{
                      backgroundColor: item.primary_color ?? "#E8EFE7",
                    }}
                  >
                    {item.image_url ? (
                      <LazyImage
                        src={item.image_url}
                        alt={label}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : null}
                  </div>
                  <p className="mt-1.5 truncate text-xs text-text-muted">
                    {label}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border bg-surface-2 p-6 text-center">
            <p className="text-sm text-text-muted">
              Sube tus primeras 6 prendas para tu primer outfit
            </p>
            <div className="mt-3 flex justify-center">
              <Link href="/wardrobe/upload">
                <Button variant="primary" size="md">
                  Sube tu primera prenda
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Inspiración ──────────────────────────────────────────────────── */}
      <InspiracionCard />
    </div>
  );
}

// ── Hero: Outfit del día ───────────────────────────────────────────────────

function OutfitDelDiaHero({
  weekUses,
  prendaEstrella,
  primerItem,
}: {
  weekUses: number;
  prendaEstrella: PrendaEstrella;
  primerItem: RecentItem | null;
}) {
  // Caso 1: hay prenda estrella (ya se generaron y usaron outfits).
  if (prendaEstrella) {
    return (
      <section className="overflow-hidden rounded-xl border border-border bg-surface-2 shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Recomendación de hoy
              </p>
              <h2 className="font-display text-xl font-semibold text-text sm:text-2xl">
                Tu prenda estrella
              </h2>
            </div>
            {weekUses > 0 && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-text shadow-sm backdrop-blur">
                ✨ {weekUses} {weekUses === 1 ? "outfit esta semana" : "outfits esta semana"}
              </span>
            )}
          </div>

          <div
            className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-surface"
            style={{ backgroundColor: prendaEstrella.primary_color ?? "#E8EFE7" }}
          >
            {prendaEstrella.image_url ? (
              <LazyImage
                src={prendaEstrella.image_url}
                alt={prendaEstrella.nombre}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-text-muted">
              <strong className="text-text">{prendaEstrella.nombre}</strong> es
              tu prenda de mayor rotación: la usaste{" "}
              {prendaEstrella.usos} {prendaEstrella.usos === 1 ? "vez" : "veces"}.
              Dejá que la IA arme un outfit nuevo con ella hoy.
            </p>
            <Link
              href={`/outfits?prenda=${prendaEstrella.id}&nombre=${encodeURIComponent(prendaEstrella.nombre)}`}
            >
              <Button size="lg" fullWidth>
                ✨ Generar outfit de hoy
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Caso 2: hay prendas pero todavía ningún outfit usado.
  if (primerItem) {
    const label =
      primerItem.name?.trim() ||
      primerItem.subcategory?.trim() ||
      CATEGORY_LABELS[primerItem.category];
    return (
      <section className="overflow-hidden rounded-xl border border-border bg-surface-2 shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Recomendación de hoy
            </p>
            <h2 className="font-display text-xl font-semibold text-text sm:text-2xl">
              Armá tu primer outfit
            </h2>
          </div>

          <div
            className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-surface"
            style={{ backgroundColor: primerItem.primary_color ?? "#E8EFE7" }}
          >
            {primerItem.image_url ? (
              <LazyImage
                src={primerItem.image_url}
                alt={label}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-text-muted">
              Ya tenés prendas en tu armario. Dejá que la IA combine{" "}
              <strong className="text-text">{label}</strong> con el resto y
              arme tu primer outfit.
            </p>
            <Link href="/outfits">
              <Button size="lg" fullWidth>
                ✨ Generar mi primer outfit
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

// ── Prenda olvidada (real) ──────────────────────────────────────────────────

function PrendaOlvidadaCard({ prendaOlvidada }: { prendaOlvidada: PrendaOlvidada }) {
  if (!prendaOlvidada) {
    return (
      <Card padding="md" className="flex flex-col">
        <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-primary-light text-3xl">
          🎉
        </div>
        <div className="mt-3">
          <h3 className="font-display text-sm font-semibold text-text">
            Todo tu armario está activo
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            Ninguna prenda lleva mucho tiempo sin usarse. ¡Seguí así!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md" className="flex flex-col">
      <div
        className="aspect-square w-full overflow-hidden rounded-lg bg-surface-2"
        style={{ backgroundColor: prendaOlvidada.primary_color ?? "#E8EFE7" }}
      >
        {prendaOlvidada.image_url ? (
          <LazyImage
            src={prendaOlvidada.image_url}
            alt={prendaOlvidada.nombre}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="mt-3">
        <h3 className="font-display text-sm font-semibold text-text">
          Prenda olvidada
        </h3>
        <p className="mt-1 text-xs text-text-muted">
          {prendaOlvidada.nombre} lleva {prendaOlvidada.diasOlvidada} días sin
          salir del armario.
        </p>
        <Link
          href={`/outfits?prenda=${prendaOlvidada.id}&nombre=${encodeURIComponent(prendaOlvidada.nombre)}`}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary-light px-3 py-2 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Revisar armario
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Card>
  );
}

// ── Comunidad (placeholder visual, sin funcionalidad todavía) ──────────────

function ComunidadCard() {
  return (
    <Card padding="md" className="flex flex-col opacity-90">
      <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-surface-2 text-3xl">
        👥
      </div>
      <div className="mt-3">
        <h3 className="font-display text-sm font-semibold text-text">
          Comunidad
        </h3>
        <p className="mt-1 text-xs text-text-muted">
          Descubrí qué usan tus amigos y ganá puntos cumpliendo retos.
        </p>
        <span
          aria-disabled="true"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-surface-2 px-3 py-2 text-center text-xs font-semibold text-text-muted"
        >
          Próximamente
        </span>
      </div>
    </Card>
  );
}

// ── Inspiración ──────────────────────────────────────────────────────────────

function InspiracionCard() {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-primary-light p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-lg">✨</span>
        <h3 className="font-display text-lg font-semibold text-text">
          ¿Buscás inspiración?
        </h3>
      </div>
      <p className="text-sm leading-relaxed text-text-muted">
        Dejá que nuestra IA te inspire: descubrí qué prendas comprar o
        encontrá el look perfecto combinando lo que ya tenés.
      </p>
      <Link
        href="/outfits"
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Explorar más
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
