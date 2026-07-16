// Tarjeta visual de un estilo (paso "Estilo" del onboarding y su edición en
// /profile/style). Muestra una imagen de referencia por estilo — mientras el
// usuario no suba el archivo a `public/onboarding/estilos/`, cae a un
// placeholder de color via onError, sin romper el layout.

"use client";

import { useState } from "react";
import { GARMENT_PLACEHOLDER_COLOR } from "@/lib/ui/colors";

type Props = {
  label: string;
  imageSrc: string;
  active: boolean;
  onClick: () => void;
};

export default function StyleCard({ label, imageSrc, active, onClick }: Props) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "group relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 transition-all duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        active ? "border-primary shadow-md" : "border-border hover:border-primary-mid",
      ].join(" ")}
    >
      {imgError ? (
        <div
          aria-hidden="true"
          className="h-full w-full"
          style={{ backgroundColor: GARMENT_PLACEHOLDER_COLOR }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt=""
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-3 py-3">
        <span className="text-sm font-semibold capitalize text-white">{label}</span>
      </div>

      {active && (
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 13 4 4 10-10" />
          </svg>
        </span>
      )}
    </button>
  );
}
