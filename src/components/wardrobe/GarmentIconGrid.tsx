// Grid de tiles de ícono con la transición "elegí uno → los demás se
// desvanecen → avanza al siguiente paso".
//
// Lo comparten CategoryGrid y SubcategoryGrid: la única diferencia entre esos
// dos pasos es el header y de dónde salen los items, así que la lógica de
// selección vive acá una sola vez.

"use client";

import { useEffect, useRef, useState } from "react";
import GarmentIconTile from "@/components/wardrobe/GarmentIconTile";

export type IconGridItem = {
  value: string;
  label: string;
  icon: string;
};

// Cuánto dura el fade-out de los tiles no elegidos antes de avanzar. Tiene que
// ir en sync con la duración de la transición del tile (200ms) — un poco más,
// para que el fade se alcance a ver completo.
const ADVANCE_DELAY_MS = 220;

type Props = {
  title: string;
  subtitle?: string;
  items: readonly IconGridItem[];
  /** Valor ya elegido (si el usuario vuelve a este paso). */
  selected?: string;
  /** Detección de la IA sin confirmar: se resalta pero no cuenta como elegida. */
  hinted?: string;
  onSelect: (value: string) => void;
  onBack?: () => void;
  backLabel?: string;
  /** Clases de columnas del grid; default pensado para 6 categorías. */
  columnsClassName?: string;
};

export default function GarmentIconGrid({
  title,
  subtitle,
  items,
  selected,
  hinted,
  onSelect,
  onBack,
  backLabel = "Volver",
  columnsClassName = "grid-cols-3",
}: Props) {
  // Valor elegido en este paso y todavía sin propagar — durante esa ventana los
  // demás tiles se atenúan.
  const [pending, setPending] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si el paso se desmonta a mitad de la transición (el usuario le da atrás),
  // el timer no debe disparar un onSelect sobre un paso que ya no está.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleSelect(value: string) {
    if (pending) return; // ya hay una transición en curso

    // Con reduced-motion el fade no se ve (globals.css lo anula), así que
    // esperar el delay solo se sentiría como lag: avanzamos de una.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onSelect(value);
      return;
    }

    setPending(value);
    timerRef.current = setTimeout(() => onSelect(value), ADVANCE_DELAY_MS);
  }

  return (
    <div className="motion-safe:animate-[fadeIn_200ms_ease-out]">
      <div className="flex items-start gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : null}
        <div>
          <h2 className="font-display text-2xl font-bold text-text">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label={title}
        className={["mt-5 grid gap-2.5", columnsClassName].join(" ")}
      >
        {items.map((item, i) => (
          <GarmentIconTile
            key={item.value}
            icon={item.icon}
            label={item.label}
            index={i}
            selected={pending ? pending === item.value : selected === item.value}
            hinted={!pending && !selected && hinted === item.value}
            dimmed={pending !== null && pending !== item.value}
            onClick={() => handleSelect(item.value)}
          />
        ))}
      </div>
    </div>
  );
}
