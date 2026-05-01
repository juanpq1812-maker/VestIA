// Landing publica de VestIA (/).
// Server Component: solo HTML/CSS, sin interactividad. Funciona como puerta
// de entrada con CTAs claras hacia /register y /login.

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Wordmark from "@/components/ui/Wordmark";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

const features = [
  {
    titulo: "Cataloga con foto",
    descripcion: "Sube tus prendas y arma tu armario digital en minutos.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 15l5-5 4 4 5-5 4 4" />
        <circle cx="9" cy="9" r="1.5" />
      </svg>
    ),
  },
  {
    titulo: "Outfits con IA",
    descripcion:
      "Pidele a la IA que te combine prendas para clase, trabajo o salir.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    titulo: "Mide tu impacto",
    descripcion:
      "Saca mas provecho a lo que ya tienes y reduce CO₂ sin esfuerzo.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Top bar de marca, sin auth aun. */}
      <div className="border-b border-divider bg-surface/80 backdrop-blur">
        <Container size="lg" className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <Wordmark className="text-lg sm:text-xl" />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="!px-4 !py-2 text-sm">
                Iniciar sesion
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

      {/* HERO: gradient violeta como en el splash del prototipo. */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(160deg,#7c3aed 0%,#a855f7 45%,#c084fc 80%,#f0e6ff 100%)",
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
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
                Proyecto de grado · 2026
              </span>

              <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
                Vest<span className="italic">IA</span>
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/90 sm:text-xl lg:mx-0 mx-auto">
                Tu armario. Infinitas combinaciones.{" "}
                <span className="whitespace-nowrap">Cero desperdicio.</span>
              </p>

              <p className="mt-4 max-w-xl text-base text-white/75 lg:mx-0 mx-auto">
                Digitaliza tu ropa, deja que la IA te arme outfits y mide cuanto
                CO₂ evitas reusando lo que ya tienes.
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
                    Ya tengo cuenta
                  </Button>
                </Link>
              </div>
            </div>

            {/* Tarjeta "preview" del armario, decorativa. */}
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/25 text-white font-semibold">
                      A
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div
                      className="aspect-[3/4] rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg,#1e3a8a,#3b82f6)",
                      }}
                      aria-hidden="true"
                    />
                    <div
                      className="aspect-[3/4] rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg,#1c1917,#44403c)",
                      }}
                      aria-hidden="true"
                    />
                    <div
                      className="aspect-[3/4] rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg,#f5f5f4,#d6d3d1)",
                      }}
                      aria-hidden="true"
                    />
                    <div
                      className="aspect-[3/4] rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg,#78350f,#d97706)",
                      }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-xl bg-white/15 px-4 py-3 text-sm text-white">
                    <span className="font-medium">+0.8 kg CO₂ evitado</span>
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

      {/* FEATURES */}
      <section className="border-t border-divider bg-surface">
        <Container size="lg" className="py-16 sm:py-20">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Que puedes hacer
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-text sm:text-4xl">
              Tu armario, ahora inteligente
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-text-muted">
              Tres herramientas para dejar de pensar &quot;no tengo que
              ponerme&quot; aunque tengas el armario lleno.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.titulo}
                className="rounded-xl border border-border bg-surface-2 p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
                  <span className="block h-6 w-6">{f.icon}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-text">
                  {f.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {f.descripcion}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" fullWidth>
                Empezar gratis
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

      <footer className="border-t border-divider bg-bg">
        <Container size="lg" className="py-8 text-center text-xs text-text-muted">
          Bogota · Universidad Sergio Arboleda · 2026
        </Container>
      </footer>
    </main>
  );
}
