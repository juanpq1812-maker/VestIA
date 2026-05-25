// Dashboard personalizado para usuarios con sesión activa (/).
//
// Rediseño StrandIA — layout Stitch:
//   Mobile:          top bar fija (logo centrado) + contenido + bottom nav fija
//   Tablet/desktop:  Header.tsx estándar (oculta top bar y bottom nav mobile)
//
// Server Component: recibe todos los datos pre-calculados desde page.tsx.
// Responsabilidad: solo UI. Lógica de datos intacta en page.tsx.

import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import Button from "@/components/ui/Button";
import LazyImage from "@/components/ui/LazyImage";
import { computeImpact, formatEsNumber } from "@/lib/impact/calculations";
import type { ClothingCategory } from "@/types/database";

// ── Tipos ─────────────────────────────────────────────────────────────────────

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
  });
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
  const co2Str   = formatEsNumber(co2Kg);
  const weekStr  = formatEsNumber(weekUses);
  const fecha    = fechaHoyEspanol();
  const esUsuarioNuevo = totalItems === 0;

  return (
    <div className="flex min-h-screen flex-col bg-bg">

      {/* ── Header desktop/tablet (oculto en mobile) ──────────────────────── */}
      <div className="hidden md:block">
        <Header displayName={displayName} />
      </div>

      {/* ── Top bar mobile (oculta en md+) ────────────────────────────────── */}
      <header className="md:hidden fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-divider bg-surface/90 px-5 backdrop-blur">
        <div className="w-9" aria-hidden="true" />
        <Link href="/" aria-label="Inicio">
          <Image
            src="/logo-strandia.png"
            alt="StrandIA"
            width={140}
            height={42}
            className="h-10 w-auto"
            priority
          />
        </Link>
        <Link
          href="/wardrobe"
          aria-label="Mi armario"
          className="flex h-9 w-9 items-center justify-center text-text-muted transition-colors hover:text-primary"
        >
          <User size={22} aria-hidden="true" />
        </Link>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      {/*   mobile: deja espacio para top bar (pt-20) y bottom nav (pb-28)  */}
      {/*   md+:    usa padding normal del flujo                             */}
      <main className="flex-1 pt-20 pb-28 md:pt-0 md:pb-0 md:py-10">
        <div className="mx-auto w-full space-y-8 px-5 md:max-w-2xl md:px-6 lg:max-w-3xl lg:px-8">

          {/* ── Saludo ──────────────────────────────────────────────────── */}
          <section className="space-y-0.5 pt-2 md:pt-0">
            <p className="text-sm font-medium text-text-muted">{fecha}</p>
            <h1 className="font-display text-4xl font-normal text-text md:text-5xl">
              Hola {displayName}!
            </h1>
          </section>

          {/* ── Contenido principal ─────────────────────────────────────── */}
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

          {/* Espaciado extra al final en desktop */}
          <div className="h-4 md:h-0" aria-hidden="true" />
        </div>
      </main>

      {/* ── Bottom nav mobile ────────────────────────────────────────────── */}
      <BottomNav />
    </div>
  );
}

// ── Estado usuario nuevo (0 prendas) ─────────────────────────────────────────

function NuevoUsuario() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-border bg-surface px-6 py-14 text-center">
      <span className="text-5xl" aria-hidden="true">🌱</span>
      <div>
        <h2 className="font-display text-2xl font-normal text-text sm:text-3xl">
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
          <Button size="lg" variant="ghost">✨ Genera un outfit</Button>
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
  totalUses,
  weekUses,
  totalItems,
  recentItems,
  prendaEstrella,
  prendaOlvidada,
}: DashboardConDatosProps) {
  return (
    <div className="flex flex-col gap-8">

      {/* ── Hero card: Outfit del día ──────────────────────────────────── */}
      <section>
        <div
          className="overflow-hidden rounded-xl shadow-[0px_10px_30px_rgba(45,49,46,0.06)]"
          style={{ backgroundColor: "#E8EFE7" }}
        >
          <div className="space-y-4 p-6">

            {/* Encabezado de la card */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Recomendación de hoy
                </span>
                <h2 className="font-display text-3xl font-normal text-text">
                  Outfit del día
                </h2>
              </div>

              {/* Badge CO₂ (solo si hay usos registrados) */}
              {totalUses > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 backdrop-blur">
                  <span aria-hidden="true">🌱</span>
                  <span className="text-xs font-medium text-text">
                    {co2Str} kg CO₂
                  </span>
                </div>
              )}
            </div>

            {/* Imagen principal (prenda estrella o gradiente de marca) */}
            <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-surface-2">
              {prendaEstrella?.image_url ? (
                <LazyImage
                  src={prendaEstrella.image_url}
                  alt={prendaEstrella.nombre}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background:
                      "linear-gradient(160deg, #8B9E8A 0%, #5a6e59 50%, #3a4a39 100%)",
                  }}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Texto descriptivo + CTA */}
            <div className="flex flex-col gap-3">
              <p className="text-base leading-relaxed text-text-muted">
                {prendaEstrella
                  ? `Tu prenda más usada: "${prendaEstrella.nombre}" — úsala hoy.`
                  : "Combina texturas ligeras para mantener la elegancia y frescura."}
              </p>
              <Link href="/outfits" className="block">
                <button
                  type="button"
                  className="w-full rounded-full bg-primary py-4 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98]"
                >
                  Ver detalles
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Grid 2 columnas ────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3">

        {/* "Tus más usados" → armario */}
        <Link href="/wardrobe" className="block">
          <div className="flex h-full flex-col gap-3 rounded-xl bg-surface-2 p-4 transition-opacity hover:opacity-95">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-surface-offset">
              {recentItems[0]?.image_url ? (
                <LazyImage
                  src={recentItems[0].image_url}
                  alt={
                    recentItems[0].name?.trim() ||
                    recentItems[0].subcategory?.trim() ||
                    CATEGORY_LABELS[recentItems[0].category]
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-primary-light" aria-hidden="true" />
              )}
            </div>
            <div>
              <h3 className="font-display text-base text-text">
                Tus más usados
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                {totalItems} {totalItems === 1 ? "prenda" : "prendas"} en tu armario.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Revisar armario →
              </span>
            </div>
          </div>
        </Link>

        {/* "Comunidad" → outfits (futuro /community) */}
        <Link href="/outfits" className="block">
          <div className="flex h-full flex-col gap-3 rounded-xl bg-surface-2 p-4 transition-opacity hover:opacity-95">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-surface-offset">
              {recentItems[1]?.image_url ? (
                <LazyImage
                  src={recentItems[1].image_url}
                  alt={
                    recentItems[1].name?.trim() ||
                    recentItems[1].subcategory?.trim() ||
                    CATEGORY_LABELS[recentItems[1].category]
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background:
                      "linear-gradient(135deg, #E8EFE7 0%, #d4e8d2 100%)",
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
            <div>
              <h3 className="font-display text-base text-text">Comunidad</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                Descubre outfits y gana puntos en Fashion Quests.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Explorar →
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ── "¿Buscas inspiración?" ─────────────────────────────────────── */}
      <section>
        <div
          className="flex flex-col gap-4 rounded-xl p-6"
          style={{ backgroundColor: "#FAF0E6" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl text-primary" aria-hidden="true">✦</span>
            <h3 className="font-display text-2xl font-normal text-text">
              ¿Buscas inspiración?
            </h3>
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-base leading-relaxed text-text-muted">
              ¡Deja que nuestra IA te inspire! Descubre qué prendas comprar
              o encuentra el look perfecto generando outfits con tu armario.
            </p>
            <Link
              href="/outfits"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
            >
              Explorar más →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Prenda olvidada ────────────────────────────────────────────── */}
      {prendaOlvidada && (
        <section>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-warning">
              😴 Olvidada hace {prendaOlvidada.diasOlvidada} días
            </p>
            <div className="mt-3 flex items-start gap-4">
              <MiniImagen
                imageUrl={prendaOlvidada.image_url ?? null}
                alt={prendaOlvidada.nombre}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">
                  {prendaOlvidada.nombre}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  La IA puede armar outfits con esta prenda
                </p>
                <Link
                  href={`/outfits?prenda=${prendaOlvidada.id}&nombre=${encodeURIComponent(prendaOlvidada.nombre)}`}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Ver outfits sugeridos →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Semana en números (sutil, al final) ────────────────────────── */}
      {weekUses > 0 && (
        <p className="text-center text-xs text-text-faint">
          {weekUses === 1
            ? "1 outfit generado esta semana · ¡sigue así!"
            : `${weekUses} outfits generados esta semana · ¡sigue así!`}
        </p>
      )}

    </div>
  );
}

// ── Subcomponente imagen mini ─────────────────────────────────────────────────

function MiniImagen({ imageUrl, alt }: { imageUrl: string | null; alt: string }) {
  return (
    <div
      className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2"
    >
      {imageUrl ? (
        <LazyImage src={imageUrl} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-text-faint">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M20 6 12 2 4 6v6c0 5 8 10 8 10s8-5 8-10V6z" />
          </svg>
        </div>
      )}
    </div>
  );
}
