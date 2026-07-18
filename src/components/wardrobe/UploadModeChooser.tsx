// Pantalla previa a cualquier flujo de captura: el usuario elige cómo quiere
// subir sus prendas antes de que se muestre la cámara/galería. Reemplaza el
// default silencioso a "ráfaga" que hacía parecer que no había más opciones.

import Link from "next/link";

const MODES = [
  {
    modo: "burst",
    icon: "burst_mode",
    title: "Ráfaga",
    desc: "Captura varias prendas seguidas, sin pausas entre fotos.",
    recommended: true,
  },
  {
    modo: "individual",
    icon: "checkroom",
    title: "Una a la vez",
    desc: "Sube una foto, cuéntanos qué es y para qué ocasión la usas.",
    recommended: false,
  },
  {
    modo: "outfit",
    icon: "portrait",
    title: "Outfit completo",
    desc: "Sube una foto de tu look completo y detectamos cada prenda por ti.",
    recommended: false,
  },
] as const;

export default function UploadModeChooser() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {MODES.map((mode) => (
        <Link
          key={mode.modo}
          href={`/wardrobe/upload?modo=${mode.modo}`}
          className="group relative flex flex-col items-start gap-3 rounded-xl border border-border bg-surface p-6 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {mode.recommended ? (
            <span className="absolute right-4 top-4 rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              Recomendado
            </span>
          ) : null}

          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-white">
            <span className="material-symbols-outlined text-2xl leading-none" aria-hidden="true">
              {mode.icon}
            </span>
          </span>

          <div>
            <p className="font-display text-lg font-semibold text-text">{mode.title}</p>
            <p className="mt-1 text-sm text-text-muted">{mode.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
