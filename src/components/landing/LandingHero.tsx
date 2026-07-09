// Hero de la landing. Client component: orquesta la coreografía de entrada
// (las líneas del titular suben tras una máscara, el panel-foto entra con
// clip + scale) y el parallax sutil de la foto al hacer scroll. El CTA
// secundario usa el scroll suave de Lenis para bajar a "Cómo funciona".

"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSmoothScroll } from "./SmoothScroll";

// Foto verificada (Unsplash): knitwear cálido colgado, luz de boutique.
const HERO_IMG =
  "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80";

export default function LandingHero() {
  const { scrollTo } = useSmoothScroll();
  const rootRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);

  // Dispara la coreografía de entrada solo cuando hay JS, la pestaña está
  // visible y se permite movimiento. Si no, el contenido queda en su estado
  // base (visible) y nunca se envía un hero en blanco.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const play = () => root.classList.add("hero-ready");
    if (document.visibilityState === "visible") {
      play();
      return;
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        play();
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Parallax sutil: la foto se mueve un poco más lento que el scroll.
  useEffect(() => {
    const el = photoRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      const shift = Math.max(-40, Math.min(40, window.scrollY * -0.05));
      el.style.setProperty("--parallax", `${shift}px`);
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16"
    >
      {/* Copy */}
      <div className="text-center lg:text-left">
        <h1 className="font-display text-[clamp(2.75rem,7vw,5.25rem)] leading-[1.02] tracking-tight text-white">
          <HeroLine delay={80}>Tu armario ya tiene</HeroLine>
          <HeroLine delay={190}>
            tu próximo{" "}
            <span className="italic text-primary-mid">outfit</span>
          </HeroLine>
        </h1>

        <p className="hero-fade mx-auto mt-6 max-w-md text-lg leading-relaxed text-white/85 lg:mx-0" style={{ animationDelay: "460ms" }}>
          StrandIA usa inteligencia artificial para combinar la ropa que ya
          tienes. Menos &ldquo;no tengo qué ponerme&rdquo;, más días bien
          vestido sin comprar de más.
        </p>

        <div
          className="hero-fade mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
          style={{ animationDelay: "600ms" }}
        >
          <Link
            href="/register"
            className="inline-flex h-13 w-full items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-ink shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-lg active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
          >
            Crear cuenta gratis
          </Link>
          <button
            type="button"
            onClick={() => scrollTo("#como-funciona")}
            className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full border border-white/40 px-7 text-base font-semibold text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
          >
            Ver cómo funciona
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Panel-foto con parallax */}
      <div className="hero-photo relative mx-auto w-full max-w-md lg:max-w-none">
        <div
          ref={photoRef}
          className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] ring-1 ring-white/20 will-change-transform"
          style={{ transform: "translateY(var(--parallax, 0px))" }}
        >
          <Image
            src={HERO_IMG}
            alt="Prendas de punto en tonos cálidos colgadas en una boutique, iluminadas con luz natural"
            fill
            priority
            sizes="(max-width: 1024px) 90vw, 45vw"
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent"
          />
        </div>

        {/* Chip flotante: comunica el producto sobre la foto */}
        <div className="hero-chip absolute -bottom-4 -left-3 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-lg sm:-left-6">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c0 4.42-3.58 8-8 8 4.42 0 8 3.58 8 8 0-4.42 3.58-8 8-8-4.42 0-8-3.58-8-8Z" />
            </svg>
          </span>
          <div className="text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Outfit del día
            </p>
            <p className="font-display text-sm text-text">Casual universitario</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Una línea del titular: sube tras una máscara con overflow hidden.
function HeroLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <span className="hero-line block" style={{ animationDelay: `${delay}ms` }}>
        {children}
      </span>
    </span>
  );
}
