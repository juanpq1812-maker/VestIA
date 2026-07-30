// Celda de un ícono de prenda: dibujo + label debajo. Es la unidad del flujo
// visual de subida (categorías → subcategorías).
//
// La celda NO tiene borde ni sombra propios: vive dentro de un panel blanco
// único (ver GarmentIconGrid) y las celdas son contiguas, sin divisiones
// visibles. El estado (seleccionado / detectado por la IA / hover) lo pinta una
// capa absoluta por encima del panel, con `inset` para que quede un pequeño
// canal entre celdas vecinas y los recuadros no se toquen.
//
// Los PNG son línea oscura sobre transparente, normalizados a un lienzo
// cuadrado por `scripts/import-garment-icons.mjs` — por eso el dibujo se ve del
// mismo tamaño en todas las celdas sin ajustes por archivo. El label lo pinta
// este componente (no viene horneado en la imagen), así que respeta la
// tipografía del sistema y cambia de color al seleccionar.

"use client";

type Props = {
  icon: string;
  label: string;
  selected?: boolean;
  /** Detección de la IA sin confirmar: se resalta, pero no cuenta como elegida. */
  hinted?: boolean;
  /** Se atenúa porque el usuario ya eligió otra celda de este grid. */
  dimmed?: boolean;
  /** Índice en el grid — escalona la animación de entrada. */
  index?: number;
  /** Tamaño del dibujo. `md` para categorías (6 celdas), `sm` para subcategorías. */
  size?: "sm" | "md";
  onClick: () => void;
};

// Escalonado de entrada. Se corta a los 12 tiles para que el último de un grid
// de 14 accesorios no entre medio segundo después del primero.
const STAGGER_MS = 35;
const STAGGER_MAX = 12;

const ICON_SIZE = {
  // Subcategorías: hasta 14 celdas en 4 columnas, el dibujo tiene que ser
  // chico para que 10 items entren de un vistazo en un iPhone.
  sm: "h-12 w-12 sm:h-14 sm:w-14",
  // Categorías: solo 6 celdas en 3 columnas, hay espacio de sobra.
  md: "h-14 w-14 sm:h-16 sm:w-16",
};

export default function GarmentIconTile({
  icon,
  label,
  selected = false,
  hinted = false,
  dimmed = false,
  index = 0,
  size = "sm",
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
        "group relative flex flex-col items-center justify-start gap-1 px-1 py-2",
        "transition-opacity duration-200 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        // `backwards`, NO `both`: con `both` el fill-mode deja pegado el
        // `opacity: 1` del último keyframe de fadeInUp para siempre, y eso le
        // gana al `opacity-25` de `dimmed` — el fade-out al seleccionar no se
        // veía nunca y el paso parecía saltar de una. Con `backwards` el
        // keyframe inicial solo aplica durante el animationDelay del stagger, y
        // al terminar la animación la opacidad vuelve a mandarla la clase.
        "motion-safe:animate-[fadeInUp_200ms_ease-out_backwards]",
        dimmed ? "pointer-events-none opacity-25" : "opacity-100",
      ].join(" ")}
    >
      {/* Capa de estado. Absoluta y con inset para que el recuadro quede
          separado de las celdas vecinas sin necesidad de gap en el grid. */}
      <span
        aria-hidden="true"
        className={[
          "absolute inset-x-0.5 inset-y-1 rounded-lg transition-colors duration-200",
          selected
            ? "bg-primary"
            : hinted
              ? "bg-primary-light"
              : "group-hover:bg-surface-2 group-active:bg-surface-2",
        ].join(" ")}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className={[
          "relative object-contain transition-[filter] duration-200",
          ICON_SIZE[size],
          // El arte es línea oscura sobre transparente: invertirlo lo vuelve
          // claro, que es el contraste que necesita sobre el verde del recuadro
          // seleccionado. Más simple y liviano que un segundo set de PNGs.
          //
          // `invert` solo, sin `brightness-0`: varios íconos tienen relleno
          // oscuro además del contorno (los abrigos, el polo, el vestido
          // largo), y crushear todo a negro antes de invertir los deja como
          // una silueta blanca sin detalle interno.
          selected ? "invert" : "",
        ].join(" ")}
      />

      <span
        className={[
          "relative text-center text-[11px] font-medium leading-tight",
          selected ? "text-white" : "text-text-muted",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}
