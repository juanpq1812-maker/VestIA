// CountUpNumber: anima un numero entero desde 0 hasta `value` cuando se
// monta (al cargar la pantalla /impact). Es la unica pieza client de la
// pantalla — el resto se renderiza 100% en el servidor.
//
// Detalles importantes:
//   - Respeta `prefers-reduced-motion`: si el usuario lo tiene activo,
//     mostramos el numero final sin animacion.
//   - Mostramos el numero formateado en es-CO (separador "."), reusando el
//     mismo formatter del lib para que el SSR y el client coincidan en el
//     ultimo frame.
//   - Usamos requestAnimationFrame con easing "ease-out" para que la cuenta
//     desacelere al final (mas natural que linear).

"use client";

import { useEffect, useRef, useState } from "react";
import { formatEsNumber } from "@/lib/impact/calculations";

type Props = {
  /** Valor final al que tiene que llegar el contador. */
  value: number;
  /** Duracion total de la animacion en ms. Default 1500. */
  durationMs?: number;
  /** Clases extra para el <span> que envuelve el numero. */
  className?: string;
};

export default function CountUpNumber({
  value,
  durationMs = 1500,
  className,
}: Props) {
  // Renderizamos siempre el valor final en el SSR (y por tanto en el primer
  // paint cliente) para evitar mismatch de hidratacion. La animacion arranca
  // en el efecto: programamos el primer frame con rAF, lo cual es asincrono
  // y no dispara renders en cascada (lo que detesta el lint de React).
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || value <= 0) {
      // Nada que animar: el valor ya esta correcto en pantalla.
      return;
    }

    let start: number | null = null;

    const tick = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / durationMs);
      // Ease-out cubic: empieza rapido y desacelera.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    // El primer frame inicializa `display` a 0; antes de eso el SSR ya
    // mostro el valor final, pero el rAF es asincrono asi que el navegador
    // pinta "valor final" -> "0" -> ... -> "valor final" sin parpadeo
    // visible en la mayoria de casos.
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return (
    <span className={className} aria-label={formatEsNumber(value)}>
      {formatEsNumber(display)}
    </span>
  );
}
