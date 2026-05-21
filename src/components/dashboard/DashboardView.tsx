// Dashboard personalizado para usuarios con sesión activa (/).
//
// Server Component: recibe todos los datos pre-calculados desde page.tsx.
// Responsabilidad de este componente: solo UI.

import Link from "next/link";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LazyImage from "@/components/ui/LazyImage";
import { computeImpact, formatEsNumber } from "@/lib/impact/calculations";
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
  usos: number;
} | null;

type PrendaOlvidada = {
  id: string;
  nombre: string;
  image_path: string | null;
  image_url?: string | null;
  diasOlvidada: number;
} | null;

type Props = {
  displayName: string;
  totalUses: number;
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
  totalUses,
  weekUses,
  totalItems,
  recentItems,
  prendaEstrella,
  prendaOlvidada,
}: Props) {
  const { co2Kg } = computeImpact(totalUses);
  const co2Str = formatEsNumber(co2Kg);
  const weekStr = formatEsNumber(weekUses);
  const fecha = fechaHoyEspanol();

  const esUsuarioNuevo = totalItems === 0;

  return (
    <div className="flex flex-1 flex-col">
      <Header displayName={displayName} />

      <main className="flex-1 py-8 sm:py-12">
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
              co2Str={co2Str}
              weekStr={weekStr}
              totalUses={totalUses}
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
  co2Str: string;
  weekStr: string;
  totalUses: number;
  weekUses: number;
  totalItems: number;
  recentItems: RecentItem[];
  prendaEstrella: PrendaEstrella;
  prendaOlvidada: PrendaOlvidada;
};

function DashboardConDatos({
  co2Str,
  weekStr,
  totalUses,
  weekUses,
  totalItems,
  recentItems,
  prendaEstrella,
  prendaOlvidada,
}: DashboardConDatosProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* ── Métricas (2 cards en fila) ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Card padding="md" className="flex flex-col items-center text-center">
          <span className="text-3xl">🌱</span>
          <p className="mt-2 font-display text-2xl font-bold text-text sm:text-3xl">
            {co2Str} kg
          </p>
          <p className="mt-1 text-xs text-text-muted leading-snug">
            de CO₂ evitados
          </p>
        </Card>

        <Card padding="md" className="flex flex-col items-center text-center">
          <span className="text-3xl">✨</span>
          <p className="mt-2 font-display text-2xl font-bold text-text sm:text-3xl">
            {weekStr}
          </p>
          <p className="mt-1 text-xs text-text-muted leading-snug">
            {weekUses === 1 ? "outfit esta semana" : "outfits esta semana"}
          </p>
        </Card>
      </div>

      {/* ── Mensaje de cero usos ────────────────────────────────────────── */}
      {totalUses === 0 && (
        <p className="text-center text-sm text-text-muted">
          ¡Genera tu primer outfit para empezar a medir tu impacto!
        </p>
      )}

      {/* ── Prenda estrella ─────────────────────────────────────────────── */}
      {prendaEstrella ? (
        <Card padding="md">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            🏆 Tu prenda estrella
          </p>
          <div className="mt-3 flex items-center gap-4">
            <MiniImagen
              imageUrl={prendaEstrella.image_url ?? null}
              alt={prendaEstrella.nombre}
              color={null}
            />
            <div>
              <p className="font-semibold text-text">{prendaEstrella.nombre}</p>
              <p className="mt-0.5 text-sm text-text-muted">
                Usada {prendaEstrella.usos}{" "}
                {prendaEstrella.usos === 1 ? "vez" : "veces"}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

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

      {/* ── CTA principal ───────────────────────────────────────────────── */}
      <Link href="/outfits" className="block">
        <Button size="lg" fullWidth>
          ✨ Generar outfit de hoy
        </Button>
      </Link>

      {/* ── Prenda olvidada ─────────────────────────────────────────────── */}
      {prendaOlvidada ? (
        <Card padding="md">
          <p className="text-xs font-bold uppercase tracking-widest text-warning">
            😴 Olvidada hace {prendaOlvidada.diasOlvidada} días
          </p>
          <div className="mt-3 flex items-center gap-4">
            <MiniImagen
              imageUrl={prendaOlvidada.image_url ?? null}
              alt={prendaOlvidada.nombre}
              color={null}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text truncate">
                {prendaOlvidada.nombre}
              </p>
              <p className="mt-0.5 text-sm text-text-muted">
                ¿La usas hoy?
              </p>
            </div>
            <Link href="/outfits">
              <Button variant="secondary" size="md">
                → Generar outfit
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

// ── Subcomponente de imagen mini ──────────────────────────────────────────────

function MiniImagen({
  imageUrl,
  alt,
  color,
}: {
  imageUrl: string | null;
  alt: string;
  color: string | null;
}) {
  return (
    <div
      className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-border"
      style={{ backgroundColor: color ?? "#E8EFE7" }}
    >
      {imageUrl ? (
        <LazyImage
          src={imageUrl}
          alt={alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/60">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M20 6 12 2 4 6v6c0 5 8 10 8 10s8-5 8-10V6z" />
          </svg>
        </div>
      )}
    </div>
  );
}
