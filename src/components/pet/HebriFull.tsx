// Pantalla completa de Hebri (/pet): sprite grande, mensaje contextual,
// nivel de cariño (health_score internamente, nunca mostrado como tal en
// la UI), y un espacio reservado (bloqueado) para accesorios futuros.
//
// Nota de diseño: el título ya se presenta solo (sin eyebrow arriba) y el
// nivel de cariño vive suelto en el flujo, no metido en otra card blanca —
// la única card real de la pantalla es la sección de Hebri; duplicar el
// mismo contenedor para el puntaje se sentía repetitivo.

import HebriSprite from "@/components/pet/HebriSprite";
import {
  PET_DIRTY_MESSAGE,
  PET_MOOD_LABEL,
  PET_MOOD_LONG_MESSAGE,
} from "@/components/pet/moodMessages";
import type { PetState } from "@/lib/pet/compute";

export default function HebriFull({ score, mood, isDirty }: PetState) {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">Hebri</h1>

      <div className="relative mt-6 flex flex-col items-center text-center">
        {/* Halo suave — el mismo gesto que el hero del Home, para que Hebri
            se sienta "viva" también acá. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-6 h-80 w-80 -translate-x-1/2 rounded-full bg-primary-light/70 blur-3xl"
        />

        <div className="relative flex flex-col items-center">
          <HebriSprite mood={mood} isDirty={isDirty} size={280} className="mb-4" />

          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text shadow-sm">
            {PET_MOOD_LABEL[mood]}
          </span>

          <p className="mt-3 max-w-xs text-sm leading-relaxed text-text">
            {PET_MOOD_LONG_MESSAGE[mood]}
          </p>

          {isDirty ? (
            <span className="mt-2 text-[11px] font-semibold text-danger">
              {PET_DIRTY_MESSAGE}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <span className="shrink-0 text-sm text-text-muted">Nivel de cariño</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="shrink-0 whitespace-nowrap font-sans text-sm font-bold tabular-nums text-text">
          {score}/100
        </span>
      </div>

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-faint">
          Accesorios — próximamente
        </h2>
        <div className="mt-3 grid grid-cols-4 gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-xl border-[1.5px] border-dashed border-border bg-surface-2 text-text-faint"
              aria-hidden="true"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-text-muted">
          Vas a poder desbloquear estilos y accesorios para Hebri entre más uses StrandIA.
        </p>
      </section>
    </div>
  );
}
