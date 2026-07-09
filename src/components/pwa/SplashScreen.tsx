// Splash de arranque de la PWA. Cubre el viewport con el bone-white de marca y
// el logo de StrandIA mientras la app hidrata, para que el usuario nunca vea el
// negro por defecto del launch nativo/hydrate en iOS.
//
// Es un overlay (no gatea el contenido): la app se renderiza debajo desde el
// primer HTML, así que si el JS fallara la pantalla igual queda utilizable —
// solo que el splash tardaría en desmontarse. La coreografía es JS-driven con
// estilos inline (sin keyframes globales): el logo entra opacity/scale y toda
// la capa hace fade-out. Respeta prefers-reduced-motion acortando y sin escala.

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Crema base de la app (token --color-bg) e igual al background_color del
// manifest: el launch nativo, el splash y el fondo real de la app comparten un
// solo color, así el fade-out revela la app sin ningún salto de tono.
const BG = "#fcf9f6";

export default function SplashScreen() {
  const [mounted, setMounted] = useState(true); // presente en el DOM
  const [entered, setEntered] = useState(false); // logo revelado
  const [leaving, setLeaving] = useState(false); // capa haciendo fade-out

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Entrada del logo en el siguiente frame (evita saltarse la transición).
    const enterRaf = requestAnimationFrame(() => setEntered(true));

    // Sin movimiento: se sostiene menos y desaparece casi instantáneo.
    const leaveAt = reduce ? 450 : 800;
    const removeAt = reduce ? 650 : 1200;

    const leaveT = window.setTimeout(() => setLeaving(true), leaveAt);
    const removeT = window.setTimeout(() => setMounted(false), removeAt);

    return () => {
      cancelAnimationFrame(enterRaf);
      clearTimeout(leaveT);
      clearTimeout(removeT);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 transition-opacity duration-[400ms] ease-out motion-reduce:transition-none"
      style={{
        backgroundColor: BG,
        opacity: leaving ? 0 : 1,
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <div
        className="transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transition-none"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? "scale(1)" : "scale(0.95)",
        }}
      >
        <Image
          src="/logo-strandia.png"
          alt="StrandIA"
          width={220}
          height={110}
          priority
          className="h-auto w-44"
        />
      </div>
    </div>
  );
}
