// Hebri en el home: estado de ánimo y acceso a /pet.
//
// Ya no es el hero — ese lugar lo ocupa la pregunta que trae al usuario
// ("¿qué me pongo?"). Pero tampoco es una nota al pie: la mascota es el pilar
// de gamificación junto a los Fashion Quests, y merece su propio bloque.
//
// Fila editorial sobre el crema, sin caja: el sprite a la izquierda, el estado
// a la derecha. Misma gramática que el resto del home.

import Link from "next/link";
import HebriSprite from "@/components/pet/HebriSprite";
import {
  PET_DIRTY_MESSAGE,
  PET_MOOD_LABEL,
  PET_MOOD_SHORT_MESSAGE,
} from "@/components/pet/moodMessages";
import type { PetState } from "@/lib/pet/compute";

export default function HebriSection({ petState }: { petState: PetState }) {
  const { score, mood, isDirty } = petState;

  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-display text-xl leading-tight tracking-tight text-text sm:text-2xl">
        Hebri
      </h2>

      <div className="flex items-center gap-5 sm:gap-8">
        <HebriSprite
          mood={mood}
          isDirty={isDirty}
          size={112}
          className="shrink-0"
        />

        <div className="flex min-w-0 flex-col items-start gap-3">
          <div>
            <h3 className="font-display text-lg leading-tight text-text sm:text-xl">
              Está {PET_MOOD_LABEL[mood].toLowerCase()}
            </h3>
            <p className="mt-1.5 max-w-[38ch] text-sm leading-relaxed text-text-muted">
              {PET_MOOD_SHORT_MESSAGE[mood]}
            </p>
            {isDirty && (
              <p className="mt-1.5 max-w-[38ch] text-sm leading-relaxed text-danger">
                {PET_DIRTY_MESSAGE}
              </p>
            )}
          </div>

          <div className="w-full max-w-[16rem]">
            <div
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Ánimo de Hebri: ${score} de 100`}
              className="h-1.5 overflow-hidden rounded-full bg-surface-2"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-text-faint">{score} de 100</p>
          </div>

          <Link
            href="/pet"
            className="text-sm font-medium text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Ver a Hebri
          </Link>
        </div>
      </div>
    </section>
  );
}
