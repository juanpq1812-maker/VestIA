// Selector de color principal de una prenda.
//
// Extraído de UploadForm.tsx para poder reutilizarlo en el flujo por pasos sin
// duplicar la paleta. El eyedropper ("De la foto") NO vive acá: necesita el
// <img> del preview para leer el píxel, así que el dueño de la foto es quien
// lo implementa y este componente solo dispara `onActivateEyedropper`.

"use client";

import { useState } from "react";
import { BASIC_COLORS, COLOR_PALETTE } from "@/lib/wardrobe/constants";

// Agrupación de la sección expandible. Los nombres tienen que existir en
// COLOR_PALETTE — si no, el grupo simplemente sale vacío.
const COLOR_GROUPS_EXPANDED = [
  { label: "Neutros", colors: ["negro", "blanco", "gris", "beige", "café"] },
  {
    label: "Colores",
    colors: ["azul", "rojo", "verde", "amarillo", "naranja", "rosa", "morado"],
  },
  { label: "Especial", colors: ["multicolor"] },
];

function ColorCircle({
  name,
  swatch,
  contrastText,
  selected,
  onSelect,
}: {
  name: string;
  swatch: string;
  contrastText: "light" | "dark";
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={name}
      title={name}
      onClick={onSelect}
      className={[
        "group flex flex-col items-center gap-1.5 rounded-md p-1 transition-transform",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected ? "scale-105" : "hover:scale-105",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-10 w-10 items-center justify-center rounded-full transition-shadow",
          selected
            ? "ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-md"
            : name === "blanco"
              ? "ring-1 ring-border"
              : "shadow-sm",
        ].join(" ")}
        style={{ background: swatch }}
        aria-hidden="true"
      >
        {selected ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={contrastText === "light" ? "#fff" : "#111"}
            strokeWidth="3"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        ) : null}
      </span>
      <span className="text-[11px] capitalize text-text-muted">{name}</span>
    </button>
  );
}

type Props = {
  value: string;
  onChange: (color: string) => void;
  /** Activa el modo "toca el color en la foto". Si no se pasa, el botón no se muestra. */
  onActivateEyedropper?: () => void;
  /** true mientras el usuario está eligiendo el color sobre la foto. */
  eyedropperActive?: boolean;
  error?: string;
};

export default function ColorPicker({
  value,
  onChange,
  onActivateEyedropper,
  eyedropperActive = false,
  error,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-text">
            ¿De qué color es tu prenda?
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Elige el color que más predomina en la prenda.
          </p>
        </div>
        {onActivateEyedropper && !eyedropperActive ? (
          <button
            type="button"
            onClick={onActivateEyedropper}
            className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-primary-mid hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            title="Seleccionar color directamente de la foto"
          >
            De la foto
          </button>
        ) : null}
      </div>

      {/* Fila horizontal de colores básicos con scroll invisible */}
      <div
        role="radiogroup"
        aria-label="Color principal"
        className="mt-4 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {COLOR_PALETTE.filter((c) => BASIC_COLORS.includes(c.name)).map((c) => (
          <ColorCircle
            key={c.name}
            name={c.name}
            swatch={c.swatch}
            contrastText={c.contrastText}
            selected={value === c.name}
            onSelect={() => onChange(c.name)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 w-full rounded-xl border border-border py-2.5 text-sm font-medium text-primary transition-colors duration-200 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {expanded ? "Ver menos colores −" : "Ver más colores +"}
      </button>

      {expanded ? (
        <div className="mt-5 space-y-5 motion-safe:animate-[fadeInUp_180ms_ease-out]">
          {COLOR_GROUPS_EXPANDED.map((group) => (
            <div key={group.label}>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-text-muted">
                {group.label}
              </p>
              <div
                role="radiogroup"
                aria-label={group.label}
                className="flex flex-wrap gap-2"
              >
                {COLOR_PALETTE.filter((c) => group.colors.includes(c.name)).map(
                  (c) => (
                    <ColorCircle
                      key={c.name}
                      name={c.name}
                      swatch={c.swatch}
                      contrastText={c.contrastText}
                      selected={value === c.name}
                      onSelect={() => onChange(c.name)}
                    />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
