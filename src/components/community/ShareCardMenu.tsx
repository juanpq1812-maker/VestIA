// Menú de moderación (···) de una card del feed — Reportar y Bloquear.
//
// Antes reportar era un botón de bandera suelto sobre la foto. Bloquear tenía
// que quedar accesible DESDE el contenido (es lo que revisa App Store), y un
// segundo botón suelto sobre una foto en una grilla de dos columnas en móvil
// es un blanco táctil de más en muy poco espacio. Un solo blanco que abre un
// menú con etiquetas de texto se entiende mejor que dos íconos.
//
// El menú vive DENTRO del contenedor `overflow-hidden` de la foto, así que su
// ancho no puede pasar del ancho de la card: en la grilla de dos columnas en
// móvil eso son ~170 px (390 de pantalla − 32 de padding − 16 de gap, entre
// dos). De ahí `w-36` y las etiquetas de una palabra — con íconos y textos
// largos el panel quedaba recortado por el borde de la card.

"use client";

import { useEffect, useId, useRef, useState } from "react";

type Props = {
  onReport: () => void;
  onBlock: () => void;
};

export default function ShareCardMenu({ onReport, onBlock }: Props) {
  const [open, setOpen] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={contenedorRef} className="absolute right-2 top-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Opciones de este look"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-text-muted shadow-sm backdrop-blur transition-colors duration-150 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Opciones de este look"
          className="absolute right-0 top-9 z-10 w-36 overflow-hidden rounded-xl border border-border bg-surface shadow-lg motion-safe:animate-[fadeInUp_180ms_ease-out]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onReport();
            }}
            className="block w-full px-4 py-3 text-left text-sm font-medium text-text transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          >
            Reportar
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onBlock();
            }}
            className="block w-full border-t border-divider px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-light focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-danger"
          >
            Bloquear
          </button>
        </div>
      )}
    </div>
  );
}
