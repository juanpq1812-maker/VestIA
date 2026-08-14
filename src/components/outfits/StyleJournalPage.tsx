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
import { GARMENT_PLACEHOLDER_COLOR } from "@/lib/ui/colors";
import { useAlphaCroppedImage } from "@/lib/outfits/useAlphaCroppedImage";
import {
  CATEGORY_SCALE,
  HEADER_BOTTOM,
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
    <div className="absolute inset-0">
      {/* Encabezado — banda reservada y=40 a y=CONTENT_TOP del viewBox,
          nunca invadida por prendas ni etiquetas. El titular es el ancla
          visual de toda la pieza (mismo diseño que composeStyleJournalImage.ts,
          pantalla y export comparten intención): eyebrow chico arriba,
          "Look"/"día" itálicos grandes flanqueando "del" (redonda, un poco
          más chica) con destellos a los lados, nombre del outfit chico
          debajo. Que varíe itálica/redonda entre líneas, no el tamaño —
          las tres deben leerse como una sola frase. */}
      <div
        className="absolute flex flex-col items-center text-center"
        style={{
          top: `${vy(HEADER_TOP)}%`,
          left: `${vx(HEADER_LEFT)}%`,
          width: `${vx(HEADER_RIGHT - HEADER_LEFT)}%`,
          height: `${vy(HEADER_BOTTOM - HEADER_TOP)}%`,
        }}
      >
        {/* Sin sm: en el titular a propósito: esta pieza vive en marcos de
            ancho variable (angosto en el carrusel de tarjetas viejo,
            w-full max-w-md en el cuaderno de páginas) sin importar qué tan
            ancho sea el viewport del navegador — sm: es un breakpoint de
            VIEWPORT, no del contenedor. El tamaño de fuente es px fijo
            mientras que la banda del header es un % (vy()) del alto del
            marco — ensanchar el marco (aspect-[4/5] fijo) agranda esa
            banda en px reales sin agrandar el texto, lo que relaja el
            riesgo de choque en vez de empeorarlo. Verificado en Chrome con
            zoom, no por aritmética — ver plan del cuaderno de páginas. */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
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
        <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          {outfitName}
        </p>
      </div>

      {/* Flechitas — una sola capa SVG por encima de las prendas, por
          debajo de las etiquetas de texto. Mismo viewBox que el arte de
          fondo, así las coordenadas de styleJournalLayout.ts valen tal cual. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 400 500"
        preserveAspectRatio="none"
      >
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
          it.background_removed !== false && Boolean(it.image_url ?? it.thumbnail_url);

        return (
          <div
            key={it.id}
            className="absolute transition-all duration-500 ease-out motion-reduce:transition-none"
            style={{
              width: `${vx(w)}%`,
              height: `${vy(h)}%`,
              top: `${vy(top)}%`,
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
                  rawSrc={(it.image_url ?? it.thumbnail_url) as string}
                  alt={itemLabel(it, labelVariant)}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-border"
                  style={{ backgroundColor: it.primary_color ?? GARMENT_PLACEHOLDER_COLOR }}
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
              top: `${vy(slot.labelTop)}%`,
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
      loading="lazy"
    />
  );
}
