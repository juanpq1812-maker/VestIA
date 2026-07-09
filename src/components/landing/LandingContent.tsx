// Landing pública de StrandIA — scroll narrativo que explica el producto en
// una pasada: la ropa que ya tienes + IA = tu outfit de hoy.
//
// Server Component que compone el scroll suave (Lenis) + el hero animado +
// los reveals al hacer scroll. La fotografía editorial (Unsplash, verificada)
// lleva el peso visual; el chrome de UI se mantiene en el registro sage/crema.

import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/ui/Logo";
import Wordmark from "@/components/ui/Wordmark";
import Container from "@/components/ui/Container";
import SmoothScroll from "./SmoothScroll";
import LandingHero from "./LandingHero";
import Reveal from "./Reveal";

const img = (id: string, w = 1000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const pasos = [
  {
    n: "01",
    titulo: "Sube tus prendas",
    descripcion:
      "Foto rápida desde el celular. StrandIA les quita el fondo y arma tu armario digital en minutos.",
    src: img("photo-1490481651871-ab68de25d43d"),
    alt: "Prendas neutras colgadas en ganchos de madera contra una pared blanca",
  },
  {
    n: "02",
    titulo: "La IA combina por ti",
    descripcion:
      "Elige una ocasión o deja que improvise. Recibes outfits reales, armados solo con lo que ya tienes.",
    src: img("photo-1523381210434-271e8be1f52b"),
    alt: "Camisetas verde salvia colgadas en ganchos de madera",
  },
  {
    n: "03",
    titulo: "Usa el look y repite",
    descripcion:
      "Guarda tus favoritos, registra qué usaste y descubre las prendas olvidadas que merecen otra salida.",
    src: img("photo-1489987707025-afc232f7ea0f"),
    alt: "Camisetas de colores ordenadas por tono en un perchero",
  },
];

export default function LandingContent() {
  return (
    <SmoothScroll>
      <main className="flex flex-1 flex-col">
        {/* ── Nav ──────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-divider bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
          <Container size="lg" className="flex items-center justify-between py-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              aria-label="StrandIA — inicio"
            >
              <Logo size={30} />
              <Wordmark className="text-lg sm:text-xl" />
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:bg-primary-hover hover:shadow-md active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:inline-block"
              >
                Crear cuenta
              </Link>
            </div>
          </Container>
        </header>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(150deg, #2d312e 0%, #435243 45%, #516351 100%)",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-primary-mid/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-32 -left-24 -z-10 h-80 w-80 rounded-full bg-primary/30 blur-3xl"
          />
          <Container size="lg" className="py-20 sm:py-24 lg:py-32">
            <LandingHero />
          </Container>
        </section>

        {/* ── Cómo funciona ────────────────────────────────────────────── */}
        <section id="como-funciona" className="scroll-mt-20 bg-bg">
          <Container size="lg" className="py-20 sm:py-28">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl tracking-tight text-text text-balance sm:text-4xl lg:text-5xl">
                Tres pasos. Cero &ldquo;no tengo qué ponerme&rdquo;.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base text-text-muted">
                De un armario lleno a un outfit decidido en menos de lo que
                tardas en desayunar.
              </p>
            </Reveal>

            <div className="mt-16 flex flex-col gap-16 sm:gap-24">
              {pasos.map((paso, i) => (
                <Reveal
                  key={paso.n}
                  className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
                    i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  {/* Foto */}
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-2 sm:aspect-[16/10] lg:aspect-[4/3]">
                    <Image
                      src={paso.src}
                      alt={paso.alt}
                      fill
                      loading="lazy"
                      sizes="(max-width: 1024px) 90vw, 45vw"
                      className="object-cover"
                    />
                  </div>
                  {/* Texto */}
                  <div className="lg:px-4">
                    <span className="font-display text-5xl text-primary-mid sm:text-6xl">
                      {paso.n}
                    </span>
                    <h3 className="mt-3 font-display text-2xl text-text sm:text-3xl">
                      {paso.titulo}
                    </h3>
                    <p className="mt-3 max-w-md text-base leading-relaxed text-text-muted">
                      {paso.descripcion}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── Banda editorial full-bleed ───────────────────────────────── */}
        <section className="relative isolate overflow-hidden">
          <Image
            src={img("photo-1556905055-8f358a7a47b2", 1600)}
            alt="Flat-lay de un outfit: gorro tejido, suéter gris, jeans y tulipanes sobre sábanas claras"
            fill
            loading="lazy"
            sizes="100vw"
            className="-z-10 object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/80 via-ink/45 to-transparent"
          />
          <Container size="lg" className="py-28 sm:py-36 lg:py-44">
            <Reveal className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                Outfit del día
              </p>
              <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
                Un look nuevo cada mañana, hecho con la ropa que ya está en tu
                clóset.
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/85">
                Nada de vitrinas infinitas ni compras por impulso. StrandIA
                mira tu armario real y te propone algo que de verdad puedes
                ponerte hoy.
              </p>
            </Reveal>
          </Container>
        </section>

        {/* ── Por qué StrandIA ─────────────────────────────────────────── */}
        <section className="bg-surface-offset">
          <Container size="lg" className="py-20 sm:py-24">
            <div className="grid gap-12 sm:grid-cols-2 sm:gap-16">
              <Reveal>
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-primary"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21v-8" />
                    <path d="M12 13c0-3.5-2.5-6-6-6H4c0 3.5 2.5 6 6 6h2Z" />
                    <path d="M12 11c0-2.8 2-4.8 4.8-4.8H20c0 2.8-2 4.8-4.8 4.8H12Z" />
                  </svg>
                </span>
                <h3 className="mt-5 font-display text-2xl text-text">
                  Menos consumo, más estilo
                </h3>
                <p className="mt-3 max-w-sm text-base leading-relaxed text-text-muted">
                  Aprovechar lo que ya tienes es la forma más sostenible —y más
                  económica— de vestir bien. StrandIA te ayuda a comprar solo lo
                  que de verdad te suma.
                </p>
              </Reveal>
              <Reveal delay={120}>
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-primary"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3c0 4.42-3.58 8-8 8 4.42 0 8 3.58 8 8 0-4.42 3.58-8 8-8-4.42 0-8-3.58-8-8Z" />
                  </svg>
                </span>
                <h3 className="mt-5 font-display text-2xl text-text">
                  Tu estilo, no un algoritmo genérico
                </h3>
                <p className="mt-3 max-w-sm text-base leading-relaxed text-text-muted">
                  Las combinaciones salen de tus prendas y tus ocasiones. Entre
                  más lo usas, mejor entiende cómo te gusta vestir.
                </p>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* ── CTA final (bookend oscuro) ───────────────────────────────── */}
        <section className="relative overflow-hidden bg-ink">
          <div
            aria-hidden="true"
            className="absolute -bottom-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl"
          />
          <Container size="md" className="py-24 text-center sm:py-32">
            <Reveal>
              <h2 className="mx-auto max-w-2xl font-display text-4xl leading-tight tracking-tight text-white text-balance sm:text-5xl">
                ¿Vemos qué esconde tu armario?
              </h2>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/80">
                Crea tu cuenta gratis y arma tu primer outfit con IA en unos
                minutos.
              </p>
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/register"
                  className="inline-flex h-13 w-full items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-ink shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-lg active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
                >
                  Crear cuenta gratis
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-13 w-full items-center justify-center rounded-full border border-white/40 px-7 text-base font-semibold text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </Reveal>
          </Container>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="bg-bg">
          <Container
            size="lg"
            className="flex flex-col items-center justify-between gap-3 py-8 text-center sm:flex-row sm:text-left"
          >
            <div className="flex items-center gap-2">
              <Logo size={24} />
              <Wordmark className="text-base" />
            </div>
            <p className="text-xs text-text-muted">
              Tu armario digital con IA · {new Date().getFullYear()}
            </p>
          </Container>
        </footer>
      </main>
    </SmoothScroll>
  );
}
