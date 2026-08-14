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

  // Chrome + snap-mandatory: los scrolls PROGRAMÁTICOS se cancelan porque el
  // navegador re-snappea al elemento que "recuerda" como target (la posición
  // actual). El workaround estándar: apagar el snap durante el scroll
  // programático y restaurarlo al llegar (la posición destino es un snap
  // point exacto, así que restaurar no salta). El swipe del usuario no pasa
  // por aquí y conserva su snap nativo.
  function snapSafeScrollTo(el: HTMLElement, left: number, smooth: boolean) {
    el.style.scrollSnapType = "none";
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      el.style.scrollSnapType = "";
      el.removeEventListener("scrollend", restore);
    };
    el.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    if (!smooth) {
      restore();
      return;
    }
    el.addEventListener("scrollend", restore);
    setTimeout(restore, 700); // fallback por si scrollend no dispara
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
