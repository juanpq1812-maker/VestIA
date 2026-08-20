// Hero de la landing. Client component: orquesta la coreografía de entrada
// (las líneas del titular suben tras una máscara, el panel entra con clip +
// scale) y el mockup interactivo de la app. El CTA secundario usa el scroll
// suave de Lenis para bajar a "Cómo funciona".
//
// El panel derecho era una foto de stock de Unsplash: bonita y genérica, no
// contaba qué hace el producto. Ahora es la app misma — un selector de ocasión
// que cambia en vivo las prendas, el score y lo que dice Hebri. El visitante
// entiende StrandIA tocándola.

"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSmoothScroll } from "./SmoothScroll";

// ── Datos del mockup ─────────────────────────────────────────────────────────
//
// Son datos de demo de la landing, no del producto: viven acá y no en lib/.
//
// Antes esto apuntaba a /icons/prendas/ — ilustraciones de línea. Ahora son
// fotografías de prendas reales recortadas, exportadas del armario con
// scripts/export-landing-garments.mjs. Es el output literal del pipeline de
// StrandIA, así que la landing enseña el producto en vez de dibujarlo.
//
// La lámina blanca detrás de cada prenda se queda: los recortes traen fondo
// transparente, y sobre el verde del hero las prendas oscuras desaparecerían.

type Prenda = { src: string; alt: string };

type Ocasion = {
  id: string;
  /** Etiqueta del selector. */
  label: string;
  /** Nombre del look, como lo diría la app. */
  look: string;
  /** Afinidad 0-100, el mismo concepto que `match_percentage` en la app real. */
  score: number;
  prendas: [Prenda, Prenda, Prenda];
  hebri: string;
};

const OCASIONES: Ocasion[] = [
  {
    id: "universitario",
    label: "Casual universitario",
    look: "Casual de todos los días",
    score: 94,
    prendas: [
      { src: "/landing-outfits/casual-top.png", alt: "Camiseta verde oliva" },
      { src: "/landing-outfits/casual-bottom.png", alt: "Jean azul de corte recto" },
      { src: "/landing-outfits/casual-calzado.png", alt: "Tenis blancos de cuero liso" },
    ],
    hebri: "Vas a estar de pie todo el día: algodón y tenis.",
  },
  {
    id: "oficina",
    label: "Smart casual / Oficina",
    look: "Smart casual sobrio",
    score: 91,
    prendas: [
      { src: "/landing-outfits/oficina-top.png", alt: "Camisa celeste de botones" },
      { src: "/landing-outfits/oficina-bottom.png", alt: "Pantalón chino beige" },
      { src: "/landing-outfits/oficina-calzado.png", alt: "Mocasines café de cuero" },
    ],
    hebri: "Camisa sin corbata: formal sin pasarte de formal.",
  },
  {
    id: "noche",
    label: "Cena & noche",
    look: "Noche con intención",
    score: 96,
    prendas: [
      { src: "/landing-outfits/noche-top.png", alt: "Top negro satinado sin mangas" },
      { src: "/landing-outfits/noche-bottom.png", alt: "Falda midi verde botella" },
      { src: "/landing-outfits/noche-calzado.png", alt: "Tacones negros de punta" },
    ],
    hebri: "Una sola pieza que destaque. El resto, que acompañe.",
  },
];

export default function LandingHero() {
  const { scrollTo } = useSmoothScroll();
  const rootRef = useRef<HTMLDivElement>(null);
  const [activa, setActiva] = useState(0);
  const tabsId = useId();
  const ocasion = OCASIONES[activa];

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

  // Flechas izquierda/derecha entre pestañas, que es lo que espera un tablist.
  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const paso = e.key === "ArrowRight" ? 1 : -1;
    const siguiente = (activa + paso + OCASIONES.length) % OCASIONES.length;
    setActiva(siguiente);
    document.getElementById(`${tabsId}-tab-${siguiente}`)?.focus();
  }

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

      {/* Mockup interactivo.
          Antes había un parallax sobre la foto. Se quitó: ese efecto era
          gratis sobre una imagen, pero este panel tiene botones, y desplazar
          el blanco mientras alguien intenta pulsarlo es hostil. */}
      <div className="hero-photo relative mx-auto w-full max-w-md lg:max-w-none">
        <div className="overflow-hidden rounded-[1.75rem] bg-surface shadow-lg ring-1 ring-white/20">
          {/* Cuerpo: el look propuesto */}
          <div
            role="tabpanel"
            id={`${tabsId}-panel`}
            aria-labelledby={`${tabsId}-tab-${activa}`}
            aria-live="polite"
            className="flex flex-col gap-5 p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  El look de hoy
                </p>
                <p className="mt-1 font-display text-xl leading-tight text-text">
                  {ocasion.look}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold tabular-nums text-primary">
                {ocasion.score}% afinidad
              </span>
            </div>

            {/* Las prendas. `key` por ocasión para que React remonte y el
                crossfade se dispare en cada cambio. */}
            <ul
              key={ocasion.id}
              className="grid grid-cols-3 gap-3 motion-safe:animate-[fadeIn_260ms_ease-out]"
            >
              {ocasion.prendas.map((p) => (
                <li
                  key={p.src}
                  className="relative aspect-square overflow-hidden rounded-xl border border-border bg-white p-3 shadow-sm"
                >
                  {/* `object-contain`, nunca cover: estas son prendas
                      recortadas de proporciones dispares (un jean es el doble
                      de alto que ancho) y `cover` las cortaría por la mitad. */}
                  <Image
                    src={p.src}
                    alt={p.alt}
                    fill
                    priority
                    sizes="(max-width: 640px) 30vw, 160px"
                    className="object-contain p-1.5 sm:p-3"
                  />
                </li>
              ))}
            </ul>

            {/* Hebri comentando el look */}
            <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
              <Image
                src="/hebri/estados/hebri_feliz.png"
                alt=""
                width={40}
                height={40}
                loading="eager"
                className="h-10 w-10 shrink-0 object-contain"
              />
              <p key={ocasion.id} className="text-sm leading-snug text-text-muted motion-safe:animate-[fadeIn_260ms_ease-out]">
                {ocasion.hebri}
              </p>
            </div>
          </div>

          {/* Selector de ocasión */}
          <div
            role="tablist"
            aria-label="Elige una ocasión"
            className="flex flex-wrap gap-2 border-t border-divider bg-surface-2/60 px-4 py-3"
          >
            {OCASIONES.map((o, i) => {
              const activo = i === activa;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="tab"
                  id={`${tabsId}-tab-${i}`}
                  aria-selected={activo}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={activo ? 0 : -1}
                  onClick={() => setActiva(i)}
                  onKeyDown={onTabKeyDown}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-xs font-medium transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    activo
                      ? "border-primary bg-primary text-white shadow-sm"
                      : "border-border bg-surface text-text-muted hover:border-primary-mid hover:bg-surface-2 hover:text-text active:translate-y-0"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
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
