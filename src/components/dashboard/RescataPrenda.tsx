// "Rescata esta prenda": la prenda que lleva más tiempo sin salir del armario.
//
// Antes era MasUsadosCard, y se titulaba "Tus más usados" mostrando justo lo
// contrario — page.tsx ordena las candidatas por `diasOlvidada` descendente.
//
// Fila editorial, no tarjeta: foto a la izquierda, texto a la derecha, sobre
// el crema. La CTA lleva a /outfits con la prenda pre-seleccionada, que es la
// funcionalidad más "IA" que el home ofrece.

import Link from "next/link";
import LazyImage from "@/components/ui/LazyImage";
import { garmentSwatch } from "@/lib/ui/colors";

export type PrendaOlvidada = {
  id: string;
  nombre: string;
  image_url: string | null;
  primary_color: string | null;
  diasOlvidada: number;
};

export default function RescataPrenda({ prenda }: { prenda: PrendaOlvidada }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-display text-xl leading-tight tracking-tight text-text sm:text-2xl">
        Rescata esta prenda
      </h2>

      <div className="flex items-center gap-5 sm:gap-8">
        {/* El fondo es el color real de la prenda (ver garmentSwatch). Para
            una prenda blanca eso es una lámina blanca sobre crema, que sin
            borde se lee como un hueco: el filete define el área. */}
        <div
          className="aspect-square w-24 shrink-0 overflow-hidden rounded-lg border border-border sm:w-32"
          style={{ backgroundColor: garmentSwatch(prenda.primary_color) }}
        >
          {prenda.image_url ? (
            <LazyImage
              src={prenda.image_url}
              alt={prenda.nombre}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col items-start gap-3">
          <div>
            <h3 className="font-display text-lg leading-tight text-text sm:text-xl">
              {prenda.nombre}
            </h3>
            <p className="mt-1.5 max-w-[38ch] text-sm leading-relaxed text-text-muted">
              Lleva {prenda.diasOlvidada} días sin salir del armario.
            </p>
          </div>

          <Link
            href={`/outfits?prenda=${prenda.id}&nombre=${encodeURIComponent(prenda.nombre)}`}
            className="text-sm font-medium text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Crear un look con ella
          </Link>
        </div>
      </div>
    </section>
  );
}
