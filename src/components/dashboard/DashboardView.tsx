// Dashboard personalizado para usuarios con sesión activa (/).
//
// Server Component: recibe todos los datos pre-calculados desde page.tsx.
// Responsabilidad de este componente: solo UI.
//
// Estructura editorial (Design STRANDIA — strandia_home):
//   1. Saludo personal en serif + fecha.
//   2. Hero de Hebri (mascota de gamificación) — estado de ánimo, mensaje y
//      CTA a /pet. Reemplaza el hero previo de "Outfit del día".
//   3. Grid secundario: Tus más usados (prenda olvidada real) + Comunidad.
//   4. Banner de inspiración → AI Studio.

import Link from "next/link";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import LazyImage from "@/components/ui/LazyImage";
import AgendaCard, { type AgendaEvent } from "@/components/dashboard/AgendaCard";
import EventOutfitSection, {
  type EventOutfitData,
} from "@/components/dashboard/EventOutfitSection";
import ConnectCalendarCard from "@/components/dashboard/ConnectCalendarCard";
import HebriSprite from "@/components/pet/HebriSprite";
import {
  PET_DIRTY_MESSAGE,
  PET_MOOD_LABEL,
  PET_MOOD_SHORT_MESSAGE,
} from "@/components/pet/moodMessages";
import type { CurrentWeather } from "@/lib/weather/openMeteo";
import type { PetState } from "@/lib/pet/compute";

import { GARMENT_PLACEHOLDER_COLOR } from "@/lib/ui/colors";
// ── Tipos ────────────────────────────────────────────────────────────────────

type PrendaOlvidada = {
  id: string;
  nombre: string;
  image_path: string | null;
  image_url?: string | null;
  primary_color: string | null;
  diasOlvidada: number;
} | null;

type EventOutfitProps = {
  eventId: string;
  eventTitle: string;
  eventTime: string;
  cached: EventOutfitData | null;
} | null;

type Props = {
  displayName: string;
  totalItems: number;
  petState: PetState;
  prendaOlvidada: PrendaOlvidada;
  hasCalendarFeed: boolean;
  agendaEvents: AgendaEvent[];
  eventOutfit: EventOutfitProps;
  weather: CurrentWeather | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fechaHoyEspanol(): string {
  // Este componente se renderiza en el servidor (Vercel corre en UTC): sin
  // timeZone explícita, un usuario en Colombia vería la fecha de "mañana"
  // desde las 7 pm. El piloto es Colombia; si la app se expande a otras
  // zonas, esta fecha debería calcularse en el cliente.
  const fecha = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota",
  });
  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DashboardView({
  displayName,
  totalItems,
  petState,
  prendaOlvidada,
  hasCalendarFeed,
  agendaEvents,
  eventOutfit,
  weather,
}: Props) {
  const fecha = fechaHoyEspanol();
  const esUsuarioNuevo = totalItems === 0;
  const eventosHoy = agendaEvents.length;

  return (
    <div className="flex flex-1 flex-col">
      <Header displayName={displayName} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="lg">
          {/* ── Saludo ──────────────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="font-display text-3xl tracking-tight text-text sm:text-4xl">
              Hola, {displayName}
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              {fecha}
              {eventosHoy > 0
                ? ` · Tienes ${eventosHoy} ${eventosHoy === 1 ? "evento" : "eventos"} hoy.`
                : ""}
            </p>
          </div>

          {esUsuarioNuevo ? (
            <NuevoUsuario />
          ) : (
            <DashboardConDatos
              totalItems={totalItems}
              petState={petState}
              prendaOlvidada={prendaOlvidada}
              hasCalendarFeed={hasCalendarFeed}
              agendaEvents={agendaEvents}
              eventOutfit={eventOutfit}
              weather={weather}
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
    <div className="flex flex-col items-center gap-6 rounded-xl bg-surface-offset px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21v-8" />
          <path d="M12 13c0-3.5-2.5-6-6-6H4c0 3.5 2.5 6 6 6h2Z" />
          <path d="M12 11c0-2.8 2-4.8 4.8-4.8H20c0 2.8-2 4.8-4.8 4.8H12Z" />
        </svg>
      </span>
      <div>
        <h2 className="font-display text-2xl text-text sm:text-3xl">
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
          <Button size="lg">Sube tu primera prenda</Button>
        </Link>
        <Link href="/outfits">
          <Button size="lg" variant="ghost">
            Genera un outfit
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Dashboard con datos ───────────────────────────────────────────────────────

type DashboardConDatosProps = {
  totalItems: number;
  petState: PetState;
  prendaOlvidada: PrendaOlvidada;
  hasCalendarFeed: boolean;
  agendaEvents: AgendaEvent[];
  eventOutfit: EventOutfitProps;
  weather: CurrentWeather | null;
};

function DashboardConDatos({
  totalItems,
  petState,
  prendaOlvidada,
  hasCalendarFeed,
  agendaEvents,
  eventOutfit,
  weather,
}: DashboardConDatosProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* ── Calendario: la IA viste tu agenda ─────────────────────────── */}
      {eventOutfit && (
        <EventOutfitSection
          eventId={eventOutfit.eventId}
          eventTitle={eventOutfit.eventTitle}
          eventTime={eventOutfit.eventTime}
          cached={eventOutfit.cached}
        />
      )}
      {hasCalendarFeed && <AgendaCard events={agendaEvents} weather={weather} />}
      {!hasCalendarFeed && <ConnectCalendarCard />}

      <HebriHero petState={petState} />

      {/* ── Grid secundario: más usados / comunidad ───────────────────────
          Grid de 2 items fijos — en desktop se limita el ancho en vez de
          estirar las cards a lo ancho del Container. */}
      <div className="grid grid-cols-2 gap-4 lg:mx-auto lg:max-w-2xl lg:gap-6">
        <MasUsadosCard prendaOlvidada={prendaOlvidada} totalItems={totalItems} />
        <ComunidadCard />
      </div>

      <InspiracionBanner />
    </div>
  );
}

// ── Hero: Hebri ──────────────────────────────────────────────────────────────
// Reemplaza el hero previo de "Outfit del día". Es la card principal del
// Home: el estado de ánimo de Hebri (mascota de gamificación) refleja qué
// tan activo estuvo el usuario, e invita a volver a visitarla en /pet.

function HebriHero({ petState }: { petState: PetState }) {
  const { score, mood, isDirty } = petState;

  return (
    <section className="relative overflow-hidden rounded-xl bg-surface-offset p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-6">
      {/* Halo suave detrás de Hebri — el único momento del dashboard donde
          la mascota "vive"; el resto de las cards son estáticas. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-4 h-96 w-96 -translate-x-1/2 rounded-full bg-primary-light/70 blur-3xl sm:top-2"
      />

      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="flex w-full items-start justify-between gap-3 text-left">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Tu compañera
            </p>
            <h2 className="font-display text-2xl text-text sm:text-3xl">Hebri</h2>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text shadow-sm">
            {PET_MOOD_LABEL[mood]}
          </span>
        </div>

        <HebriSprite mood={mood} isDirty={isDirty} size={270} />

        <div className="flex flex-col gap-3 sm:mx-auto sm:w-full sm:max-w-xs">
          <p className="text-sm leading-relaxed text-text-muted">
            {PET_MOOD_SHORT_MESSAGE[mood]}
          </p>

          {isDirty && (
            <p className="text-xs font-semibold text-danger">{PET_DIRTY_MESSAGE}</p>
          )}

          <div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          <Link href="/pet">
            <Button size="lg" fullWidth>
              Ver a Hebri
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Tus más usados (prenda olvidada real) ────────────────────────────────────

function MasUsadosCard({
  prendaOlvidada,
  totalItems,
}: {
  prendaOlvidada: PrendaOlvidada;
  totalItems: number;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-surface-2">
      <div
        className="aspect-square w-full overflow-hidden"
        style={{
          backgroundColor: prendaOlvidada?.primary_color ?? GARMENT_PLACEHOLDER_COLOR,
        }}
      >
        {prendaOlvidada?.image_url ? (
          <LazyImage
            src={prendaOlvidada.image_url}
            alt={prendaOlvidada.nombre}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-base text-text">Tus más usados</h3>
        <p className="mt-1 flex-1 text-xs leading-relaxed text-text-muted">
          {prendaOlvidada
            ? `Redescubre tus favoritos: ${prendaOlvidada.nombre} lleva ${prendaOlvidada.diasOlvidada} días sin salir del armario.`
            : `Tienes ${totalItems} ${totalItems === 1 ? "prenda" : "prendas"} en rotación. Dale una nueva oportunidad a las que menos usas.`}
        </p>
        <Link
          href={
            prendaOlvidada
              ? `/outfits?prenda=${prendaOlvidada.id}&nombre=${encodeURIComponent(prendaOlvidada.nombre)}`
              : "/wardrobe"
          }
          className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-primary-mid/60 px-4 py-2 text-xs font-semibold text-text transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Revisar armario
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

// ── Comunidad ────────────────────────────────────────────────────────────────

function ComunidadCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-surface-2">
      <div
        aria-hidden="true"
        className="flex aspect-square w-full items-center justify-center bg-primary-light text-primary"
      >
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M16.5 15.2c2.6.3 4.5 2.1 4.5 4.8" />
        </svg>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-base text-text">Comunidad</h3>
        <p className="mt-1 flex-1 text-xs leading-relaxed text-text-muted">
          Descubre qué están usando tus amigos y gana puntos cumpliendo
          nuestros Fashion Quests.
        </p>
        <Link
          href="/comunidad"
          className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-primary-mid/60 px-4 py-2 text-xs font-semibold text-text transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Explora la comunidad
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

// ── Inspiración ──────────────────────────────────────────────────────────────

function InspiracionBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-offset p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-primary"
        >
          <path d="M12 2c0 4.42-3.58 8-8 8 4.42 0 8 3.58 8 8 0-4.42 3.58-8 8-8-4.42 0-8-3.58-8-8Zm7 12c0 1.66-1.34 3-3 3 1.66 0 3 1.34 3 3 0-1.66 1.34-3 3-3-1.66 0-3-1.34-3-3Z" />
        </svg>
        <h3 className="font-display text-xl text-text">
          ¿Buscas inspiración?
        </h3>
      </div>
      <p className="max-w-prose text-sm leading-relaxed text-text-muted">
        ¡Deja que nuestra IA te inspire! Descubre qué prendas comprar o
        encuentra el look perfecto explorando los outfits de nuestra comunidad.
      </p>
      <Link
        href="/outfits"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Explorar más
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
