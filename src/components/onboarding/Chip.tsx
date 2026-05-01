// Chip multi-select reutilizable para el onboarding y los filtros del armario.
// Es un boton "tipo pildora" que se ilumina en violeta cuando esta seleccionado.

"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
};

export default function Chip({ active, className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
        "border transition-all duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        active
          ? "border-primary bg-primary text-white shadow-sm"
          : "border-border bg-surface text-text-muted hover:border-primary-mid hover:bg-surface-2 hover:text-text",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
