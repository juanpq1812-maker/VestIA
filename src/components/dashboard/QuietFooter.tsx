// Pie del home: la paleta del armario y Hebri.
//
// Los dos son contexto, no acción — por eso van al final, sin caja y separados
// del resto por un solo filete. Hebri en particular BAJA de rango: era el hero
// de esta pantalla y ahora es un widget, porque el hero lo ocupa la pregunta
// que trae al usuario ("¿qué me pongo?"), no la mascota.

import Link from "next/link";
import HebriSprite from "@/components/pet/HebriSprite";
import { PET_MOOD_LABEL } from "@/components/pet/moodMessages";
import { garmentSwatch } from "@/lib/ui/colors";
import type { TramoDePaleta } from "@/lib/wardrobe/paleta";
import type { PetState } from "@/lib/pet/compute";

/** Capitaliza el nombre del color, que en la DB va en minúscula. */
function etiqueta(nombre: string): string {
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export default function QuietFooter({
  paleta,
  petState,
}: {
  paleta: TramoDePaleta[];
  petState: PetState;
}) {
  const { score, mood, isDirty } = petState;
  const hayPaleta = paleta.length > 0;

  return (
    <section className="flex flex-col gap-8 border-t border-divider pt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-12">
      {hayPaleta ? (
        <div className="flex max-w-sm flex-1 flex-col gap-2.5">
          <h2 className="text-sm font-medium text-text">Tu paleta</h2>
          <div
            className="flex h-1.5 w-full overflow-hidden rounded-full"
            aria-hidden="true"
          >
            {paleta.map((t) => (
              <span
                key={t.nombre}
                className="h-full"
                style={{
                  width: `${t.pct}%`,
                  // "otros" no es un color de la paleta: cae al placeholder.
                  backgroundColor: garmentSwatch(t.nombre),
                }}
              />
            ))}
          </div>
          <p className="text-xs text-text-faint">
            {paleta.map((t) => `${etiqueta(t.nombre)} ${t.pct}%`).join(" · ")}
          </p>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <Link
        href="/pet"
        className="flex shrink-0 items-center gap-3 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        <HebriSprite mood={mood} isDirty={isDirty} size={44} className="shrink-0" />
        <div>
          {/* El texto sale del estado de ánimo real, no de `isDirty`: "te
              extraña" con el score en 100 se contradice a sí mismo. */}
          <p className="text-sm font-medium text-text">
            Hebri está {PET_MOOD_LABEL[mood].toLowerCase()}
          </p>
          <p
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Ánimo de Hebri: ${score} de 100`}
            className="text-xs text-text-faint"
          >
            {score} de 100
          </p>
        </div>
      </Link>
    </section>
  );
}
