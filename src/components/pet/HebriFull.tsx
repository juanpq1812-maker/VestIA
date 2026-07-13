// Pantalla completa de Hebri (/pet): sprite grande, mensaje contextual,
// health_score, y un espacio reservado (bloqueado) para accesorios futuros.

import Card from "@/components/ui/Card";
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
      <p className="text-xs font-bold uppercase tracking-widest text-primary">Tu compañera</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-text sm:text-4xl">Hebri</h1>

      <div className="mt-6 flex flex-col items-center text-center">
        <HebriSprite mood={mood} isDirty={isDirty} size={280} className="mb-4" />

        <p className="max-w-xs text-sm leading-relaxed text-text">
          {PET_MOOD_LONG_MESSAGE[mood]}
        </p>

        <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          {PET_MOOD_LABEL[mood]}
        </span>

        {isDirty ? (
          <span className="mt-2 text-[11.5px] font-semibold text-danger">
            {PET_DIRTY_MESSAGE}
          </span>
        ) : null}
      </div>

      <Card padding="sm" className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-display text-2xl font-bold text-text">{score} / 100</span>
          <span className="text-xs text-text-muted">health_score</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${score}%` }}
          />
        </div>
      </Card>

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-faint">
          Accesorios — próximamente
        </h2>
        <div className="mt-3 grid grid-cols-4 gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-xl border-[1.5px] border-dashed border-border bg-surface-2 text-lg text-text-faint"
              aria-hidden="true"
            >
              🔒
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
