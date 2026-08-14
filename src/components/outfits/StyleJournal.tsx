// Style Journal (Premium): reemplazo visual de OutfitMoodboard para
// usuarios premium — una página de cuaderno editorial (papel con textura,
// espiral al borde, prendas compuestas con etiqueta + flechita curva) en vez
// de prendas sobre un fondo sólido. Free sigue viendo OutfitMoodboard sin
// cambios; este componente es exclusivo de Premium.
//
// El fondo es un asset real (`public/cuaderno.svg`, viewBox 0 0 400 500) —
// todo el resto (fotos, etiquetas, flechas) se posiciona en las MISMAS
// unidades de ese viewBox (ver styleJournalLayout.ts), así que los números
// de cada plantilla se pueden verificar directo contra el arte.
//
// Este archivo es solo el MARCO físico (papel + espiral + aspect-ratio) —
// "un cuaderno, una página". El contenido de la página vive en
// StyleJournalPage.tsx, separado para que PremiumJournalSpread.tsx pueda
// dibujar el marco una sola vez y colocar DOS páginas dentro (outfit 1 /
// outfit 2) sin duplicar fondo ni aspect-ratio. Los outfits guardados
// (SavedOutfitCard.tsx) son independientes entre sí — no vienen de a dos —
// así que siguen usando este componente tal cual, sin cambios.

"use client";

import StyleJournalPage, {
  type StyleJournalPageProps,
} from "@/components/outfits/StyleJournalPage";

export default function StyleJournal(props: StyleJournalPageProps) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-lg">
      {/* Fondo real: papel + espiral + sombra, todo resuelto en el SVG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cuaderno.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <StyleJournalPage {...props} />
    </div>
  );
}
