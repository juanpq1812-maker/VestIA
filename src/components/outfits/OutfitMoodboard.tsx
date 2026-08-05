// Moodboard editorial de un outfit: las prendas (PNG con fondo transparente,
// removido con Gemini — puede faltar si el pipeline falló del todo, ver
// background_removed) se posicionan como capas superpuestas sobre un fondo sólido de la
// paleta de StrandIA. Cada categoría tiene su zona, con tamaño proporcional y
// una rotación sutil DETERMINISTA (derivada del id) — determinista para no
// romper la hidratación ni "saltar" en cada regeneración.
//
// La coreografía de entrada es progresiva por capa. Solo renderiza tras una
// acción del usuario (generar), así que el JS siempre corre: usamos un flag de
// montaje para revelar y respetamos prefers-reduced-motion.

"use client";

import { useEffect, useState } from "react";
import type { ClothingItem, ClothingCategory } from "@/types/database";
import { GARMENT_PLACEHOLDER_COLOR } from "@/lib/ui/colors";

// Fondos sólidos de marca, rotados por posición del outfit para dar variedad.
const BOARD_BG = ["#e6ece5", "#ebe1d7", "#eef1e9", "#f0edea"] as const;

// Zona por categoría: todo en % del lienzo (aspect 4/5) → escala responsive.
type Zone = { w: number; h: number; top: number; left: number; z: number; rot: number };
const ZONES: Record<ClothingCategory, Zone> = {
  outerwear: { w: 52, h: 46, top: 10, left: 3, z: 10, rot: -5 },
  top: { w: 50, h: 36, top: 8, left: 26, z: 20, rot: 3 },
  dress: { w: 54, h: 64, top: 10, left: 23, z: 20, rot: -2 },
  bottom: { w: 46, h: 38, top: 40, left: 30, z: 15, rot: -4 },
  footwear: { w: 34, h: 22, top: 73, left: 36, z: 30, rot: 6 },
  accessory: { w: 26, h: 22, top: 5, left: 64, z: 40, rot: -8 },
};

const CATEGORIA_LABELS: Record<ClothingCategory, string> = {
  top: "Top",
  bottom: "Pantalón",
  dress: "Vestido",
  outerwear: "Abrigo",
  footwear: "Calzado",
  accessory: "Accesorio",
};

// Hash estable del id → jitter en [-span, span]. Determinista: mismo id, misma
// rotación en servidor y cliente.
function jitter(id: string, span = 3): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % (span * 2 + 1)) - span;
}

type Props = {
  items: ClothingItem[];
  /** Posición del outfit en la lista, para rotar el color de fondo. */
  index?: number;
};

export default function OutfitMoodboard({ items, index = 0 }: Props) {
  // Estado inicial oculto SOLO como punto de partida de la transición; el
  // efecto lo revela apenas monta. Como el moodboard solo existe tras una
  // acción del usuario (generar), el JS siempre corre y esto nunca se queda
  // en blanco. No usamos rAF (no dispara en pestañas ocultas / headless).
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(true);
  }, []);

  const board = items.slice(0, 6);
  const bg = BOARD_BG[index % BOARD_BG.length];

  // Contador por categoría para desplazar prendas repetidas dentro de su zona.
  const perCategory: Partial<Record<ClothingCategory, number>> = {};

  return (
    <div
      // Cuadrado en mobile para que tarjeta + descripción quepan en una
      // pantalla sin deslizar; editorial 4/5 desde sm.
      className="relative aspect-square w-full overflow-hidden rounded-2xl sm:aspect-[4/5]"
      style={{ backgroundColor: bg }}
    >
      {/* Luz superior sutil para dar profundidad sin dejar de ser fondo sólido */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.35), transparent 60%)",
        }}
      />

      {board.map((it, order) => {
        const zone = ZONES[it.category] ?? ZONES.accessory;
        const dup = perCategory[it.category] ?? 0;
        perCategory[it.category] = dup + 1;

        const rot = zone.rot + jitter(it.id) + dup * 3;
        const nombre = it.name ?? it.subcategory ?? CATEGORIA_LABELS[it.category];

        return (
          <div
            key={it.id}
            className="absolute transition-all duration-500 ease-out motion-reduce:transition-none"
            style={{
              width: `${zone.w}%`,
              height: `${zone.h}%`,
              top: `${zone.top + dup * 7}%`,
              left: `${zone.left + dup * 9}%`,
              zIndex: zone.z + dup,
              transitionDelay: `${order * 70}ms`,
              opacity: shown ? 1 : 0,
              transform: shown ? "translateY(0)" : "translateY(14px)",
            }}
          >
            <div className="h-full w-full" style={{ transform: `rotate(${rot}deg)` }}>
              {it.thumbnail_url ?? it.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(it.thumbnail_url ?? it.image_url) as string}
                  alt={nombre}
                  className="h-full w-full object-contain"
                  style={{ filter: "drop-shadow(0 10px 14px rgba(45,49,46,0.22))" }}
                  loading="lazy"
                />
              ) : (
                <div
                  className="h-full w-full rounded-xl"
                  style={{
                    backgroundColor: it.primary_color ?? GARMENT_PLACEHOLDER_COLOR,
                    filter: "drop-shadow(0 10px 14px rgba(45,49,46,0.18))",
                  }}
                  title={nombre}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Lista accesible: los lectores de pantalla no interpretan las capas. */}
      <ul className="sr-only">
        {board.map((it) => (
          <li key={it.id}>
            {CATEGORIA_LABELS[it.category]}: {it.name ?? it.subcategory ?? it.category}
          </li>
        ))}
      </ul>
    </div>
  );
}
