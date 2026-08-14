// Carrusel horizontal con snap, extraído de ResultsGrid (OutfitGenerator.tsx)
// para reusarlo tanto en el carrusel de tarjetas (free, N outfits, con
// gutters) como en el paginador de 2 páginas del cuaderno premium (sin
// gutters, cada página ocupa el 100% del marco). La única pieza no trivial
// —el workaround de Chrome cancelando scrolls programáticos bajo
// snap-mandatory— vive acá una sola vez.
"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** Cantidad de posiciones (tarjetas u outfits/páginas). */
  count: number;
  /** Gap horizontal entre posiciones, en px — debe coincidir con la clase
   * `gap-*` del scroller. Default 0 (el paginador de páginas no tiene gap:
   * cada página ocupa el 100% del marco, no hay "siguiente" que asome). */
  gap?: number;
  /** Gutters simétricos (padding = (ancho visible - tarjeta)/2) para centrar
   * la posición activa con snap-center, como hace el carrusel de tarjetas.
   * El paginador de páginas no los necesita: cada página ya ocupa el 100%
   * del contenedor, no hay nada que centrar. Default false. */
  gutters?: boolean;
};

export function useSnapPager({ count, gap = 0, gutters = false }: Options) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Chrome, en ciertas condiciones, cancela scrolls PROGRAMÁTICOS bajo
  // snap-mandatory (el navegador re-snappea al elemento que "recuerda" como
  // target). Pero apagar el snap ANTES de pedir el scroll suave —lo que
  // hacía esta función antes— resulta en un salto instantáneo en Chrome y
  // Safari reales (verificado en preview de Vercel, desktop + iPhone): el
  // navegador no anima un scroll hacia un destino donde el snap acaba de
  // desactivarse en el mismo tick. El bug de cancelación solo se reprodujo
  // en el entorno de automatización de este proyecto (rAF/CSS transitions
  // no corren ahí porque el tab queda `document.hidden`), no en un
  // navegador real.
  //
  // Por eso el camino por defecto es el scroll suave nativo, SIN tocar
  // scroll-snap-type — funciona en Chrome/Safari reales y se anima. Solo si
  // se detecta que el scroll realmente no arrancó (el caso raro que el
  // comentario original describía) se cae al workaround de apagar/restaurar
  // el snap, como último recurso — no como camino preferido.
  function snapSafeScrollTo(el: HTMLElement, left: number, smooth: boolean) {
    if (!smooth) {
      el.scrollTo({ left, behavior: "auto" });
      return;
    }

    const startLeft = el.scrollLeft;
    if (startLeft === left) return; // ya está ahí, nada que animar

    el.scrollTo({ left, behavior: "smooth" });

    // Dos rAF: le da tiempo al navegador a arrancar la animación antes de
    // comprobar si de verdad se movió. Si sí, no tocamos nada más — el
    // scroll nativo se encarga de todo (incluye su propio snap al llegar).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (el.scrollLeft !== startLeft) return;

        // Camino de último recurso: el scroll suave normal no arrancó.
        // Apagamos el snap, reintentamos, y lo restauramos al terminar (la
        // posición destino es un snap point exacto, así que restaurar no
        // salta).
        el.style.scrollSnapType = "none";
        let restored = false;
        const restore = () => {
          if (restored) return;
          restored = true;
          el.style.scrollSnapType = "";
          el.removeEventListener("scrollend", restore);
        };
        el.scrollTo({ left, behavior: "smooth" });
        el.addEventListener("scrollend", restore);
        setTimeout(restore, 700); // fallback por si scrollend no dispara
      });
    });
  }

  // Gutters simétricos (solo si `gutters` está activo): con snap-center esto
  // centra la posición activa en cualquier viewport y hace alcanzable el
  // centro de la primera y la última (con ellos, la posición de snap i es
  // exactamente i*(tarjeta+gap)).
  useEffect(() => {
    if (!gutters) return;
    const el = scrollerRef.current;
    if (!el) return;
    const setGutters = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      const gutter = Math.max(16, (el.clientWidth - card.offsetWidth) / 2);
      el.style.paddingLeft = `${gutter}px`;
      el.style.paddingRight = `${gutter}px`;
    };
    setGutters();
    const ro = new ResizeObserver(setGutters);
    ro.observe(el);
    return () => ro.disconnect();
  }, [count, gutters]);

  // Hint de primer render: micro-scroll de 20px y de vuelta, para comunicar
  // que hay más contenido a la derecha. Nunca con reduced-motion. El snap se
  // apaga durante toda la coreografía (20px no es un snap point).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.scrollWidth <= el.clientWidth) return; // no hay nada que asomar
    el.style.scrollSnapType = "none";
    const t1 = setTimeout(() => el.scrollTo({ left: 20, behavior: "smooth" }), 400);
    const t2 = setTimeout(() => el.scrollTo({ left: 0, behavior: "smooth" }), 850);
    const t3 = setTimeout(() => {
      el.style.scrollSnapType = "";
    }, 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      el.style.scrollSnapType = "";
    };
  }, []);

  // El índice activo se deriva del rango REAL de scroll (no del ancho de
  // tarjeta): en contenedores anchos la última posición ancla con snap-end y
  // su posición es maxScroll, no idx*step.
  function onScroll() {
    const el = scrollerRef.current;
    if (!el || count < 2) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    const per = maxScroll / (count - 1);
    const idx = Math.round(el.scrollLeft / per);
    setActiveIdx(Math.max(0, Math.min(count - 1, idx)));
  }

  function scrollToIdx(idx: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    // Con gutters simétricos y snap-center, la posición i es exactamente
    // i*(ancho+gap); el clamp cubre redondeos de subpíxel (y también el
    // caso sin gutters, donde ancho+gap = 100% del contenedor).
    const target = Math.min(idx * (card.offsetWidth + gap), maxScroll);
    snapSafeScrollTo(
      el,
      target,
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  return { scrollerRef, activeIdx, onScroll, scrollToIdx };
}
