// Proveedor de scroll suave (Lenis) para la landing. Envuelve el contenido,
// corre el loop de rAF y expone `scrollTo(target)` por contexto para los
// anchors internos (ej. "Ver cómo funciona").
//
// Accesibilidad: si el usuario pide menos movimiento, NO inicializamos Lenis
// (scroll nativo) y scrollTo cae a comportamiento instantáneo. Lenis nunca
// secuestra el scroll de quien pidió reduced-motion.

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import Lenis from "lenis";

type ScrollToTarget = string | HTMLElement;
type Ctx = { scrollTo: (target: ScrollToTarget) => void };

const SmoothScrollContext = createContext<Ctx>({
  scrollTo: (target) => {
    if (typeof target === "string") {
      document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
    } else {
      target.scrollIntoView({ behavior: "smooth" });
    }
  },
});

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // scroll nativo, sin inercia

    const lenis = new Lenis({
      lerp: 0.09, // inercia mantequilla, sin sentirse pesado
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollTo = useCallback((target: ScrollToTarget) => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target, { offset: -8 });
      return;
    }
    // Reduced-motion o Lenis no montado todavía → nativo.
    const el =
      typeof target === "string" ? document.querySelector(target) : target;
    el?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, []);

  return (
    <SmoothScrollContext.Provider value={{ scrollTo }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
