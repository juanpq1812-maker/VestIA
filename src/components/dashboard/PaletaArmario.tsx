// "Tu paleta": de qué colores está hecho el armario.
//
// Cierra el home como una nota al pie — es contexto, no acción, así que va sin
// caja y separado por un solo filete. El reparto de porcentajes (que siempre
// suma 100) vive en lib/wardrobe/paleta.ts.

import { garmentSwatch } from "@/lib/ui/colors";
import type { TramoDePaleta } from "@/lib/wardrobe/paleta";

/** Capitaliza el nombre del color, que en la DB va en minúscula. */
function etiqueta(nombre: string): string {
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export default function PaletaArmario({ paleta }: { paleta: TramoDePaleta[] }) {
  // Bajo el mínimo de prendas `calcularPaleta` devuelve [] — mejor no mostrar
  // el bloque que dibujar una barra que no dice nada.
  if (paleta.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5 border-t border-divider pt-8">
      <h2 className="text-sm font-medium text-text">Tu paleta</h2>

      <div
        className="flex h-1.5 w-full max-w-md overflow-hidden rounded-full"
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
    </section>
  );
}
