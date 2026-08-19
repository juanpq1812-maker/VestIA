// "Tu semana": los looks que el usuario realmente usó en los últimos días.
//
// Es el otro extremo del bucle del hero — pulsar "Usar este look" escribe la
// fila en outfit_uses que hace aparecer el outfit aquí.
//
// Sin cajas: las láminas se apoyan sobre el crema del home, igual que las
// prendas del hero. El único marco es el aire.

import Link from "next/link";
import OutfitMoodboard, {
  type MoodboardItem,
} from "@/components/outfits/OutfitMoodboard";

export type LookDeLaSemana = {
  outfitId: string;
  /** "hoy", "ayer" o "mié 13". */
  etiqueta: string;
  items: MoodboardItem[];
};

export default function WeekStrip({ looks }: { looks: LookDeLaSemana[] }) {
  if (looks.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl leading-tight tracking-tight text-text sm:text-2xl">
          Tu semana
        </h2>
        <Link
          href="/outfits/saved"
          className="shrink-0 text-sm text-text-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Ver todo
        </Link>
      </div>

      {/* El -mx-4/px-4 deja que la tira sangre hasta el borde en mobile: la
          última tarjeta cortada es la señal de que hay más al deslizar. */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {looks.map((look) => (
          <li key={look.outfitId} className="shrink-0 snap-start">
            <Link
              href={`/outfits/saved#${look.outfitId}`}
              className="group flex w-28 flex-col gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:w-32"
            >
              <div className="transition-transform duration-200 ease-out group-hover:-translate-y-1 motion-reduce:transform-none">
                <OutfitMoodboard items={look.items} background="#ffffff" />
              </div>
              <span className="text-xs text-text-muted">{look.etiqueta}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
