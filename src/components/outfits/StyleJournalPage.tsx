// Contenido de una página del Style Journal (Premium): header, flechas,
// prendas y etiquetas — todo lo que va DENTRO del marco físico del cuaderno
// (papel + espiral, ver StyleJournal.tsx). Separado del marco a propósito:
// StyleJournal.tsx sigue siendo "un cuaderno, una página" para consumidores
// que muestran un outfit independiente (SavedOutfitCard.tsx), mientras que
// PremiumJournalSpread.tsx dibuja el marco UNA sola vez y coloca DOS
// StyleJournalPage dentro, en un carrusel de páginas — un objeto, no dos.
//
// Sin fondo propio ni aspect-ratio: se posiciona con `absolute inset-0`
// dentro de lo que lo contenga (siempre algo que ya mantiene el aspect
// [4/5] del arte del cuaderno).

"use client";

import { useEffect, useState } from "react";
import type { ClothingItem } from "@/types/database";
import { garmentSwatch } from "@/lib/ui/colors";
import { useAlphaCroppedImage } from "@/lib/outfits/useAlphaCroppedImage";
import {
  CATEGORY_SCALE,
  CONTENT_H,
  CONTENT_TOP,
  HEADER_LEFT,
  HEADER_RIGHT,
  HEADER_TOP,
  arrowPath,
  arrowStartPoint,
  categoryLabel,
  getTemplate,
  jitter,
  prioritizeItems,
  vx,
  vy,
  vyContentDelta,
  vyContentPos,
} from "@/lib/outfits/styleJournalLayout";

/** Etiqueta con el mismo criterio de fallback que el resto de la app:
 * nombre propio si el usuario lo puso, si no la subcategoría (ya es texto
 * legible en español), si no el nombre de la categoría.
 *
 * `labelVariant` es temporal — punto de comparación pedido en el plan
 * ("Camiseta" vs "Camiseta blanca"). Se retira una vez se decida cuál
 * queda. */
function itemLabel(it: ClothingItem, labelVariant: "name" | "name-color"): string {
  if (it.name?.trim()) return it.name.trim();
  const base = it.subcategory || categoryLabel(it.category);
  if (labelVariant === "name-color" && it.primary_color) {
    return `${base} ${it.primary_color.toLowerCase()}`;
  }
  return base;
}

export type StyleJournalPageProps = {
  items: ClothingItem[];
  outfitName: string;
  /** Posición del outfit en la lista — reservado para variar detalles
   * sutiles entre páginas del swipe si hace falta más adelante. */
  index?: number;
  /** Temporal, ver itemLabel(). Default = la variante recomendada. */
  labelVariant?: "name" | "name-color";
};

export default function StyleJournalPage({
  items,
  outfitName,
  labelVariant = "name",
}: StyleJournalPageProps) {
  // Misma lógica de revelado que OutfitMoodboard: solo existe tras acción
  // del usuario, así que el JS siempre corre.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(true);
  }, []);

  const board = prioritizeItems(items, 6);
  const template = getTemplate(board.length);

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Encabezado — FLUJO NORMAL, no posicionado de forma absoluta: antes
          reservaba una banda de alto FIJO (HEADER_TOP a CONTENT_TOP) que el
          subtítulo (nombre del outfit) podía desbordar si envolvía a 2
          líneas en pantallas angostas, tapando la primera fila de prendas.
          Ahora el header mide lo que necesite (shrink-0, nunca se recorta)
          y el área de prendas de abajo es lo que sobra (flex-1) — si el
          nombre envuelve, la grilla se empuja sola, sin overlap posible.
          El titular sigue siendo el ancla visual (mismo diseño que
          composeStyleJournalImage.ts): eyebrow chico arriba, "Look"/"día"
          itálicos grandes flanqueando "del" (redonda, un poco más chica)
          con destellos a los lados, nombre del outfit chico debajo. */}
      <div
        className="flex shrink-0 flex-col items-center text-center"
        style={{
          marginLeft: `${vx(HEADER_LEFT)}%`,
          width: `${vx(HEADER_RIGHT - HEADER_LEFT)}%`,
          paddingTop: `${vy(HEADER_TOP)}%`,
        }}
      >
        {/* Sin sm: en el titular a propósito: esta pieza vive en marcos de
            ancho variable (angosto en el carrusel de tarjetas viejo,
            w-full max-w-md en el cuaderno de páginas) sin importar qué tan
            ancho sea el viewport del navegador — sm: es un breakpoint de
            VIEWPORT, no del contenedor. Tamaños fijos verificados en
            Chrome con zoom, no por aritmética — ver plan del cuaderno de
            páginas. */}
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          Style Journal
        </p>
        <h3 className="font-display leading-[0.95] text-text">
          <span className="block text-3xl italic font-bold">Look</span>
          <span className="relative my-px flex items-center justify-center">
            <SparkleIcon className="absolute -left-4 h-2.5 w-2.5 text-primary" />
            <span className="text-xl font-medium">del</span>
            <SparkleIcon className="absolute -right-4 h-2.5 w-2.5 text-primary" />
          </span>
          <span className="block text-3xl italic font-bold">día</span>
        </h3>
        {/* Sin truncate: el nombre completo tiene que verse siempre. Antes
            se truncaba a 1 línea porque desbordar la banda fija de alto
            tapaba la primera fila de prendas — ahora que el header mide lo
            que necesite, envolver a 2 líneas es seguro. */}
        <p className="mt-1 px-2 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          {outfitName}
        </p>
      </div>

      {/* Área de prendas: ocupa el alto que sobra debajo del header
          (flex-1). Sus hijos siguen posicionados de forma absoluta (mismas
          plantillas de styleJournalLayout.ts), pero las coordenadas Y ya no
          son % del lienzo completo (vy(), que asumía una banda de header
          fija) sino % de la altura PROPIA de este contenedor —
          vyContentPos/vyContentDelta — así toda la grilla se reescala junto
          con el espacio real que el header le dejó, sin importar cuánto
          mida. El eje X no cambia: el ancho de este contenedor es igual al
          del lienzo completo (el header no afecta el ancho), así que vx()
          sigue siendo válido tal cual. */}
      <div className="relative flex-1">
        {/* Flechitas — una sola capa SVG por encima de las prendas, por
            debajo de las etiquetas de texto. viewBox recortado a la altura
            LOCAL de esta área (CONTENT_H) con un <g> que traslada los
            puntos —ya en unidades absolutas del viewBox original, con
            CONTENT_TOP incluido— a ese mismo sistema local, sin tener que
            tocar arrowPath/arrowStartPoint. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 400 ${CONTENT_H}`}
          preserveAspectRatio="none"
        >
          <g transform={`translate(0, ${-CONTENT_TOP})`}>
            {board.map((it, i) => {
              const slot = template[i];
              if (!slot) return null;
              // La flecha arranca por FUERA de la caja de texto (abajo, con
              // aire) — nunca desde la esquina de la etiqueta, o la curva
              // atraviesa las letras y se lee como tachado.
              const from = arrowStartPoint(slot);
              return (
                <path
                  key={it.id}
                  d={arrowPath(
                    from.top,
                    from.left,
                    slot.arrowTargetTop,
                    slot.arrowTargetLeft,
                    slot.arrowCurve
                  )}
                  fill="none"
                  stroke="var(--color-text-faint)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  style={{
                    opacity: shown ? 1 : 0,
                    transition: "opacity 400ms ease-out",
                    transitionDelay: `${300 + i * 70}ms`,
                  }}
                />
              );
            })}
          </g>
        </svg>

        {/* Prendas */}
        {board.map((it, i) => {
          const slot = template[i];
          if (!slot) return null;

          const scale = CATEGORY_SCALE[it.category];
          const w = slot.w * scale;
          const h = slot.h * scale;
          // Se re-centra sobre el mismo punto medio del slot al escalar, para
          // que un accesorio chico no "flote" descentrado en su zona.
          const top = slot.top - (h - slot.h) / 2;
          const left = slot.left - (w - slot.w) / 2;
          const rot = slot.rot + jitter(it.id);

          // Solo se muestra la foto si el fondo SÍ se removió de verdad
          // (background_removed medido, no supuesto — ver
          // imageBackgroundRemoval.ts). Si no, cae al mismo swatch de color
          // que el resto de la app usa cuando no hay imagen: mostrar la
          // foto con fondo intacto rompería la composición (blanco/cuarto
          // flotando junto a recortes limpios).
          const hasUsablePhoto =
            it.background_removed !== false && Boolean(it.thumbnail_url ?? it.image_url);

          return (
            <div
              key={it.id}
              className="absolute transition-all duration-500 ease-out motion-reduce:transition-none"
              style={{
                width: `${vx(w)}%`,
                height: `${vyContentDelta(h)}%`,
                top: `${vyContentPos(top)}%`,
                left: `${vx(left)}%`,
                zIndex: slot.z,
                transitionDelay: `${i * 70}ms`,
                opacity: shown ? 1 : 0,
                transform: shown ? "translateY(0)" : "translateY(14px)",
              }}
            >
              <div className="h-full w-full" style={{ transform: `rotate(${rot}deg)` }}>
                {hasUsablePhoto ? (
                  <GarmentPhoto
                    // Miniatura primero (WebP, ~27KB) en vez del PNG
                    // full-size (~350-400KB, medido): 13-15× más liviano y,
                    // al tamaño real en que se muestra una prenda acá
                    // (fracción del ancho del cuaderno, no la pantalla
                    // completa), 512px alcanza de sobra. El full-size sigue
                    // siendo el que usa composeStyleJournalImage.ts para el
                    // export 9:16 — ahí sí importa la resolución real.
                    rawSrc={(it.thumbnail_url ?? it.image_url) as string}
                    alt={itemLabel(it, labelVariant)}
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-border"
                    style={{ backgroundColor: garmentSwatch(it.primary_color) }}
                    title={itemLabel(it, labelVariant)}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Etiquetas de texto — capa más alta, siempre legibles */}
        {board.map((it, i) => {
          const slot = template[i];
          if (!slot) return null;
          return (
            <p
              key={it.id}
              className="absolute font-display text-[11px] italic leading-tight text-text sm:text-xs"
              style={{
                width: `${slot.labelWidthPct ?? 30}%`,
                top: `${vyContentPos(slot.labelTop)}%`,
                left: slot.labelAlign === "left" ? `${vx(slot.labelLeft)}%` : undefined,
                right: slot.labelAlign === "right" ? `${100 - vx(slot.labelLeft)}%` : undefined,
                textAlign: slot.labelAlign,
                opacity: shown ? 1 : 0,
                transition: "opacity 400ms ease-out",
                transitionDelay: `${300 + i * 70}ms`,
              }}
            >
              {itemLabel(it, labelVariant)}
            </p>
          );
        })}
      </div>

      {/* Lista accesible: las capas absolutas no son interpretables por
          lectores de pantalla. */}
      <ul className="sr-only">
        {board.map((it) => (
          <li key={it.id}>
            {categoryLabel(it.category)}: {itemLabel(it, labelVariant)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Destello de 4 puntas — mismo path que dibuja composeStyleJournalImage.ts
 * en el export (ahí como curvas de Canvas, acá como SVG), flanqueando "del"
 * en el titular. */
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2c0 4.42-3.58 8-8 8 4.42 0 8 3.58 8 8 0-4.42 3.58-8 8-8-4.42 0-8-3.58-8-8Z" />
    </svg>
  );
}

/** Foto de una prenda, recortada a su bbox alfa (ver useAlphaCroppedImage) —
 * componente aparte porque el hook no se puede llamar dentro de un .map()
 * del padre (reglas de hooks). */
function GarmentPhoto({ rawSrc, alt }: { rawSrc: string; alt: string }) {
  const src = useAlphaCroppedImage(rawSrc);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-contain"
      style={{ filter: "drop-shadow(0 8px 12px rgba(45,49,46,0.2))" }}
      // Sin loading="lazy" a propósito: las dos páginas del cuaderno están
      // montadas en la MISMA posición de pantalla (apiladas por transform
      // 3D, no fuera del viewport) — el heurístico de lazy-loading del
      // navegador mira el layout box, no si algo queda oculto por z-index,
      // así que acá no evita ninguna descarga real, solo puede sumar
      // latencia (medido: no era la causa del retraso reportado).
    />
  );
}
