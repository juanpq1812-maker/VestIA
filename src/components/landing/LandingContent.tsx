// Landing pública de StrandIA. Extracted from app/page.tsx para que la raíz
// pueda alternar entre landing (sin sesión) y dashboard (con sesión).

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Wordmark from "@/components/ui/Wordmark";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

const features = [
  {
    icono: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
        <circle cx="12" cy="13.5" r="3.5" />
      </svg>
    ),
    titulo: "Cataloga tu armario",
    descripcion: "Sube fotos de tu ropa y arma tu armario digital en minutos.",
  },
  {
    icono: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3c0 4.42-3.58 8-8 8 4.42 0 8 3.58 8 8 0-4.42 3.58-8 8-8-4.42 0-8-3.58-8-8Z" />
        <path d="M19 15c0 1.66-1.34 3-3 3 1.66 0 3 1.34 3 3 0-1.66 1.34-3 3-3-1.66 0-3-1.34-3-3Z" />
      </svg>
    ),
    titulo: "Genera outfits con IA",
    descripcion: "Combinaciones inteligentes con lo que ya tienes.",
  },
  {
    icono: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8h12l1.2 12a1 1 0 0 1-1 1.1H5.8a1 1 0 0 1-1-1.1L6 8Z" />
        <path d="M9 10V6a3 3 0 0 1 6 0v4" />
      </svg>
    ),
    titulo: "Compra con inteligencia",
    descripcion: "Recomendaciones de qué comprar según lo que ya tienes.",
  },
];

export default function LandingContent() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Barra de marca */}
      <div className="border-b border-divider bg-surface/80 backdrop-blur">
        <Container
          size="lg"
          className="flex items-center justify-between py-3"
        >
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <Wordmark className="text-lg sm:text-xl" />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="!px-4 !py-2 text-sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/register" className="hidden sm:inline-block">
              <Button variant="primary" className="!px-4 !py-2 text-sm">
                Crear cuenta
              </Button>
            </Link>
          </div>
        </Container>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(160deg, #8b9e8a 0%, #516351 55%, #2d312e 100%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />

        <Container size="lg" className="py-16 sm:py-24 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Copy */}
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                Proyecto de grado · 2026
              </span>

              <div className="mt-6 flex items-center justify-center gap-3 lg:justify-start">
                <Logo size={48} />
                <Wordmark tone="inverse" className="text-4xl sm:text-5xl" />
              </div>

              <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Tu armario digital con IA
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg lg:mx-0 mx-auto">
                Genera outfits con la ropa que ya tienes, descubre prendas
                olvidadas y compra de forma más inteligente.
              </p>

              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    fullWidth
                    className="!bg-white !text-primary hover:!bg-white hover:!shadow-lg"
                  >
                    Crear cuenta
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="ghost"
                    fullWidth
                    className="!border-white/40 !text-white hover:!bg-white/10 hover:!text-white"
                  >
                    Iniciar sesión
                  </Button>
                </Link>
              </div>
            </div>

            {/* Tarjeta decorativa de preview */}
            <div className="hidden lg:block">
              <div className="relative mx-auto w-full max-w-md">
                <div className="rounded-3xl border border-white/30 bg-white/15 p-6 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                        Outfit sugerido hoy
                      </p>
                      <p className="mt-1 font-display text-2xl text-white">
                        Casual universitario
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/25 text-white"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 4a2 2 0 1 1 2 2c-.9.4-1.4 1-1.4 1.8v.4" />
                        <path d="m12 9-7.5 5.2a1 1 0 0 0 .6 1.8h13.8a1 1 0 0 0 .6-1.8L12 9Z" />
                      </svg>
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[
                      "linear-gradient(135deg,#1e3a8a,#3b82f6)",
                      "linear-gradient(135deg,#1c1917,#44403c)",
                      "linear-gradient(135deg,#f5f5f4,#d6d3d1)",
                      "linear-gradient(135deg,#78350f,#d97706)",
                    ].map((bg, i) => (
                      <div
                        key={i}
                        className="aspect-[3/4] rounded-xl"
                        style={{ background: bg }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-xl bg-white/15 px-4 py-3 text-sm text-white">
                    <span className="font-medium">4 prendas combinadas</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
                      Generado con IA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── QUÉ HACÉS CON STRANDIA ─────────────────────────────────────────── */}
      <section className="border-t border-divider bg-surface">
        <Container size="lg" className="py-16 sm:py-20">
          <div className="text-center">
            <h2 className="font-display text-3xl tracking-tight text-text sm:text-4xl">
              Tu armario, ahora inteligente
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-text-muted">
              Tres herramientas para dejar de pensar &quot;no tengo qué
              ponerme&quot; aunque tengas el armario lleno.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl gap-10 text-center sm:grid-cols-3 sm:gap-8">
            {features.map((f) => (
              <div key={f.titulo} className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary"
                >
                  {f.icono}
                </span>
                <h3 className="mt-4 font-display text-xl text-text">
                  {f.titulo}
                </h3>
                <p className="mt-2 max-w-[28ch] text-sm leading-relaxed text-text-muted">
                  {f.descripcion}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="border-t border-divider bg-surface">
        <Container size="md" className="py-16 sm:py-20 text-center">
          <h2 className="font-display text-3xl tracking-tight text-text sm:text-4xl">
            ¿Listo para conocer tu armario?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-text-muted">
            Empieza hoy y descubre todo lo que puedes armar con lo que ya tienes.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" fullWidth>
                Crear cuenta gratis
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="ghost" fullWidth>
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </Container>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-divider bg-bg">
        <Container
          size="lg"
          className="py-8 text-center text-xs text-text-muted"
        >
          StrandIA — Proyecto de grado · Juan Pablo · Universidad Sergio Arboleda
        </Container>
      </footer>
    </main>
  );
}
