// Tile de un ícono de prenda: dibujo + label debajo. Es la unidad del flujo
// visual de subida (categorías → subcategorías).
//
// Los PNG son línea negra sobre transparente, normalizados a un lienzo
// cuadrado por `scripts/import-garment-icons.mjs` — por eso el dibujo se ve
// del mismo tamaño en todos los tiles sin ajustes por archivo. El label lo
// pinta este componente (no viene horneado en la imagen), así que respeta la
// tipografía del sistema y cambia de color al seleccionar.

"use client";

type Props = {
  icon: string;
  label: string;
  selected?: boolean;
  /** Detección de la IA sin confirmar: se resalta, pero no cuenta como elegida. */
  hinted?: boolean;
  /** Se atenúa porque el usuario ya eligió otro tile de este grid. */
  dimmed?: boolean;
  /** Índice en el grid — escalona la animación de entrada. */
  index?: number;
  onClick: () => void;
};

// Escalonado de entrada. Se corta a los 12 tiles para que el último de un grid
// de 14 accesorios no entre medio segundo después del primero.
const STAGGER_MS = 35;
const STAGGER_MAX = 12;

export default function GarmentIconTile({
  icon,
  label,
  selected = false,
  hinted = false,
  dimmed = false,
  index = 0,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      style={{
        animationDelay: `${Math.min(index, STAGGER_MAX) * STAGGER_MS}ms`,
      }}
      className={[
        "group flex flex-col items-center justify-center gap-1 rounded-xl border p-2",
        "transition-[background-color,border-color,opacity,transform] duration-200 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        // `backwards`, NO `both`: con `both` el fill-mode deja pegado el
        // `opacity: 1` del último keyframe de fadeInUp para siempre, y eso le
        // gana al `opacity-25` de `dimmed` — el fade-out al seleccionar no se
        // veía nunca y el paso parecía saltar de una. Con `backwards` el
        // keyframe inicial solo aplica durante el animationDelay del stagger, y
        // al terminar la animación la opacidad vuelve a mandarla la clase.
        "motion-safe:animate-[fadeInUp_200ms_ease-out_backwards]",
        selected
          ? "border-primary bg-primary shadow-sm"
          : hinted
            ? "border-primary-mid bg-primary-light"
            : "border-border bg-surface hover:border-primary-mid hover:bg-surface-2",
        dimmed ? "pointer-events-none opacity-25" : "opacity-100",
      ].join(" ")}
    >
      <span className="flex aspect-square w-full items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={icon}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={[
            "h-full w-full object-contain transition-[filter] duration-200",
            // El arte es línea oscura sobre transparente: invertirlo lo vuelve
            // claro, que es el contraste que necesita sobre el verde del tile
            // seleccionado. Más simple y liviano que un segundo set de PNGs.
            //
            // `invert` solo, sin `brightness-0`: varios íconos tienen relleno
            // oscuro además del contorno (los abrigos, el polo, el vestido
            // largo), y crushear todo a negro antes de invertir los deja como
            // una silueta blanca sin detalle interno.
            selected ? "invert" : "",
          ].join(" ")}
        />
      </span>
      <span
        className={[
          "text-center text-[11px] font-medium leading-tight",
          selected ? "text-white" : "text-text-muted",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}
