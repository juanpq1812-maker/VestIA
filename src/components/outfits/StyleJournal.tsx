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
// Misma coreografía de entrada y mismo criterio de rotación determinista
// que OutfitMoodboard.tsx (ver jitter() en styleJournalLayout.ts, duplicado
// a propósito para no acoplar premium a free).

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

type Props = {
  items: ClothingItem[];
  outfitName: string;
  /** Posición del outfit en la lista — reservado para variar detalles
   * sutiles entre páginas del swipe si hace falta más adelante. */
  index?: number;
  /** Temporal, ver itemLabel(). Default = la variante recomendada. */
  labelVariant?: "name" | "name-color";
};

export default function StyleJournal({ items, outfitName, labelVariant = "name" }: Props) {
  // Misma lógica de revelado que OutfitMoodboard: solo existe tras acción
  // del usuario, así que el JS siempre corre.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(true);
  }, []);

  const board = prioritizeItems(items, 6);
  const template = getTemplate(board.length);

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

      {/* Encabezado — banda reservada y=40 a y=100 del viewBox, nunca
          invadida por prendas ni etiquetas (ver CONTENT_TOP). */}
      <div
        className="absolute"
        style={{
          top: `${vy(HEADER_TOP)}%`,
          left: `${vx(HEADER_LEFT)}%`,
          width: `${vx(HEADER_RIGHT - HEADER_LEFT)}%`,
          height: `${vy(HEADER_BOTTOM - HEADER_TOP)}%`,
        }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary sm:text-xs">
          <SparkleIcon className="h-2.5 w-2.5" />
          Style Journal
          <SparkleIcon className="h-2.5 w-2.5" />
        </p>
        <h3 className="mt-1 truncate font-display text-xl font-bold leading-tight text-text sm:text-2xl">
          {outfitName}
        </h3>
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

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2c0 4.42-3.58 8-8 8 4.42 0 8 3.58 8 8 0-4.42 3.58-8 8-8-4.42 0-8-3.58-8-8Z" />
    </svg>
  );
}
