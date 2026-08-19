// Hebri en el home: estado de ánimo y acceso a /pet.
//
// Ya no es el hero — ese lugar lo ocupa la pregunta que trae al usuario
// ("¿qué me pongo?"). Pero tampoco es una nota al pie: la mascota es el pilar
// de gamificación junto a los Fashion Quests, y merece su propio bloque.
//
// Composición: Hebri lidera. Es el mismo movimiento que hace el hero con el
// moodboard y la tira semanal con las prendas — en este sistema el sujeto es
// el protagonista y la UI se aparta. La primera versión de este bloque hacía
// lo contrario: sprite de 112px arrinconado a la izquierda y una columna de
// texto ocupando el resto, con el aviso de "despeinada" en rojo como el
// elemento más fuerte de la pantalla. Hebri era el tema y la copy el
// protagonista.

import Link from "next/link";
import HebriSprite from "@/components/pet/HebriSprite";
import {
  PET_DIRTY_MESSAGE,
  PET_MOOD_SHORT_MESSAGE,
} from "@/components/pet/moodMessages";
import type { PetState } from "@/lib/pet/compute";

/**
 * Tamaño del sprite. Fijo en px porque HebriSprite escribe width/height
 * inline. 280 cabe incluso a 320px de viewport (menos los 32px de padding
 * del Container), que es más angosto que cualquier teléfono que soportemos.
 */
const SPRITE_SIZE = 280;

export default function HebriSection({ petState }: { petState: PetState }) {
  const { score, mood, isDirty } = petState;

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-xl leading-tight tracking-tight text-text sm:text-2xl">
        Hebri
      </h2>

      <div className="flex flex-col items-center gap-6 text-center">
        {/* El halo es el motivo que HebriHero ya usaba para ella: el único
            momento del home donde algo "vive". Sobre crema se lee como luz,
            no como caja. */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute h-[22rem] w-[22rem] rounded-full bg-primary-light blur-3xl"
          />
          <HebriSprite
            mood={mood}
            isDirty={isDirty}
            size={SPRITE_SIZE}
            className="relative max-w-full"
          />
        </div>

        <div className="flex max-w-xs flex-col items-center gap-4">
          {/* Una sola línea de estado, en la voz editorial del sistema. Antes
              iban dos —"Está feliz" y el mensaje de ánimo— diciendo lo mismo. */}
          <p className="font-display text-xl leading-snug text-text sm:text-2xl">
            {PET_MOOD_SHORT_MESSAGE[mood]}
          </p>

          {isDirty && (
            // En muted y no en `text-danger`: el rojo del sistema es para
            // errores y acciones destructivas. Que la mascota esté despeinada
            // es un empujón, no una falla — y la marca no comunica con culpa.
            <p className="text-sm leading-relaxed text-text-muted">
              {PET_DIRTY_MESSAGE}
            </p>
          )}

          <div className="w-full max-w-[13rem]">
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
            <p className="mt-2 text-xs tabular-nums text-text-faint">
              {score} de 100
            </p>
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
