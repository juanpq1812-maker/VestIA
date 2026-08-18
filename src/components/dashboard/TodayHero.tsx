// Hero del home: la respuesta a "¿qué me pongo hoy?".
//
// Es la ÚNICA superficie con relleno de la pantalla (lino sobre crema). Eso
// es lo que la marca como hero: el resto del home se apoya directo sobre el
// fondo y se agrupa con aire, no con cajas.
//
// Cuatro estados, y nunca queda vacío:
//
//   event      hay un evento próximo hoy    → sugerencia de la IA (cacheada)
//   look       no hay evento, armario ok    → outfit guardado, elegido por día
//   incomplete armario por debajo del mínimo→ qué falta para desbloquear
//   empty      cero prendas                 → primer paso
//
// El estado lo resuelve page.tsx y llega ya decidido: este componente no
// consulta nada.

import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import EventOutfitBody, {
  type EventOutfitData,
} from "@/components/dashboard/EventOutfitBody";
import OutfitMoodboard, {
  type MoodboardItem,
} from "@/components/outfits/OutfitMoodboard";
import {
  describeMissingMinimums,
  type WardrobeMinimums,
} from "@/lib/wardrobe/wardrobeMinimums";

export type TodayHeroState =
  | {
      kind: "event";
      eventId: string;
      eventTitle: string;
      /** Hora local ya formateada ("20:00"). */
      eventTime: string;
      cached: EventOutfitData | null;
    }
  | {
      kind: "look";
      outfitId: string;
      name: string;
      occasion: string | null;
      items: MoodboardItem[];
      /** Temperatura de hoy, para justificar la propuesta. */
      tempC: number | null;
    }
  | { kind: "incomplete"; minimums: WardrobeMinimums }
  | { kind: "empty" };

export default function TodayHero({ state }: { state: TodayHeroState }) {
  return (
    <section
      aria-label="Tu look de hoy"
      className="rounded-xl bg-surface-offset px-5 py-8 sm:px-10 sm:py-12"
    >
      {state.kind === "event" ? (
        <EventOutfitBody
          eventId={state.eventId}
          eventTitle={state.eventTitle}
          eventTime={state.eventTime}
          cached={state.cached}
        />
      ) : state.kind === "look" ? (
        <LookDelDia state={state} />
      ) : state.kind === "incomplete" ? (
        <ArmarioIncompleto minimums={state.minimums} />
      ) : (
        <PrimerPaso />
      )}
    </section>
  );
}

// ── Estado "look": outfit guardado, elegido por el día ───────────────────────

function LookDelDia({
  state,
}: {
  state: Extract<TodayHeroState, { kind: "look" }>;
}) {
  return (
    <div className="sm:mx-auto sm:flex sm:max-w-3xl sm:items-center sm:gap-10">
      <div className="sm:w-1/2 sm:shrink-0">
        <OutfitMoodboard items={state.items} />
      </div>

      <div className="mt-6 flex flex-col gap-5 sm:mt-0 sm:w-1/2">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            El look de hoy
          </p>
          <h2 className="font-display text-3xl leading-[1.1] tracking-tight text-text sm:text-4xl">
            {state.name}
          </h2>
          <p className="text-sm text-text-muted">
            {[
              state.tempC !== null ? `${state.tempC}°C` : null,
              state.occasion,
              "de tus looks guardados",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <p className="max-w-[42ch] text-sm leading-relaxed text-text-muted">
          Lo elegimos entre los que ya guardaste y no has usado esta semana.
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href={`/outfits/saved#${state.outfitId}`}
            className={buttonClasses({ size: "lg" })}
          >
            Ver este look
          </Link>
          <Link
            href="/outfits"
            className="text-sm font-medium text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Generar otro
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Estado "incomplete": falta armario para generar ──────────────────────────

function ArmarioIncompleto({ minimums }: { minimums: WardrobeMinimums }) {
  const CATEGORIAS = [
    { label: "Prendas de arriba", req: minimums.tops },
    { label: "Prendas de abajo", req: minimums.bottoms },
    { label: "Calzado", req: minimums.footwear },
  ];
  const listas = CATEGORIAS.filter((c) => c.req.ok).length;

  return (
    <div className="flex flex-col items-center gap-6 text-center sm:mx-auto sm:max-w-md">
      <ProgressRing value={listas} max={CATEGORIAS.length} />

      <div>
        <h2 className="font-display text-3xl leading-[1.1] tracking-tight text-text sm:text-4xl">
          Casi listo
        </h2>
        <p className="mx-auto mt-3 max-w-[42ch] text-sm leading-relaxed text-text-muted">
          {describeMissingMinimums(minimums)}
        </p>
      </div>

      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
        {CATEGORIAS.map((c) => (
          <li
            key={c.label}
            className={`inline-flex items-center gap-1.5 ${
              c.req.ok ? "text-primary" : "text-text-faint"
            }`}
          >
            {c.req.ok ? <IconoCheck /> : <IconoPendiente />}
            {c.label}
            <span className="tabular-nums">
              {c.req.have}/{c.req.need}
            </span>
          </li>
        ))}
      </ul>

      <Link href="/wardrobe/upload" className={buttonClasses({ size: "lg" })}>
        Subir una prenda
      </Link>
    </div>
  );
}

// ── Estado "empty": cero prendas ─────────────────────────────────────────────

function PrimerPaso() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-7 text-center">
      <PercheroVacio />
      <div>
        <h2 className="font-display text-3xl leading-[1.1] tracking-tight text-text sm:text-4xl">
          Tu armario digital te espera
        </h2>
        <p className="mx-auto mt-3 max-w-[42ch] text-sm leading-relaxed text-text-muted">
          Con 6 prendas ya puedes generar tu primer outfit: 2 de arriba, 2 de
          abajo, 1 par de zapatos y 1 accesorio.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Link href="/wardrobe/upload" className={buttonClasses({ size: "lg" })}>
          Sube tu primera prenda
        </Link>
        <Link
          href="/outfits"
          className="text-sm font-medium text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          ¿Cómo funciona?
        </Link>
      </div>
    </div>
  );
}

// ── Piezas ───────────────────────────────────────────────────────────────────

function ProgressRing({ value, max }: { value: number; max: number }) {
  const R = 42;
  const C = 2 * Math.PI * R;

  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#dcd9d7" strokeWidth="4" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="#516351"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - value / max)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-xl tabular-nums text-text">
          {value}/{max}
        </span>
      </div>
    </div>
  );
}

function PercheroVacio() {
  return (
    <svg viewBox="0 0 160 80" className="h-20 w-40" aria-hidden="true">
      <line x1="16" y1="20" x2="144" y2="20" stroke="#516351" strokeWidth="2" strokeLinecap="round" />
      {[56, 104].map((x) => (
        <g key={x} stroke="#b8ccb6" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d={`M${x} 20 L${x} 32`} />
          <path d={`M${x - 18} 56 L${x} 32 L${x + 18} 56 Z`} />
        </g>
      ))}
    </svg>
  );
}

function IconoCheck() {
  return (
    <svg
      aria-hidden="true"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  );
}

function IconoPendiente() {
  return <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-border" />;
}
