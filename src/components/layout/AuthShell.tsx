// Layout para pantallas de autenticacion (login y register).
//
// En mobile: la card del formulario aparece centrada sobre el fondo crema.
// En desktop (lg+): split-screen — panel violeta de marca a la izquierda,
// formulario a la derecha. Da una sensacion de app cuidada en pantallas grandes
// sin sacrificar la simplicidad en mobile.

import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/ui/Logo";
import Wordmark from "@/components/ui/Wordmark";

type Props = {
  /** Eyebrow corto sobre el titulo (ej: "Bienvenido de vuelta"). */
  eyebrow?: string;
  /** Titulo grande del panel de marca (lado izquierdo en desktop). */
  brandTitle: string;
  /** Subtitulo descriptivo del panel de marca. */
  brandSubtitle: string;
  /** Contenido del panel derecho (form + ayudas). */
  children: ReactNode;
};

export default function AuthShell({
  eyebrow,
  brandTitle,
  brandSubtitle,
  children,
}: Props) {
  return (
    <main className="flex flex-1 flex-col lg:grid lg:grid-cols-2">
      {/* Panel de marca (visible siempre, distinta forma en mobile vs desktop). */}
      <aside
        className="relative overflow-hidden lg:min-h-screen"
        style={{
          background:
            "linear-gradient(160deg,#5a6e59 0%,#6B7F6A 45%,#8B9E8A 80%,#E8EFE7 100%)",
        }}
      >
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col justify-between px-6 py-6 sm:px-10 sm:py-10 lg:px-12 lg:py-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 self-start rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            aria-label="Ir al inicio"
          >
            <Logo size={32} tone="inverse" />
            <Wordmark className="text-xl" tone="inverse" />
          </Link>

          {/* En mobile el panel se ve corto: solo logo + tagline minimo. */}
          <div className="hidden lg:block max-w-md mt-16">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
              {brandTitle}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/85">
              {brandSubtitle}
            </p>
          </div>

          <p className="hidden lg:block text-xs text-white/60">
            Bogota · Universidad Sergio Arboleda · 2026
          </p>
        </div>

        {/* Bloque visible solo en mobile: tagline corto bajo el logo. */}
        <div className="lg:hidden px-6 pb-8 sm:px-10">
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            {brandTitle}
          </h1>
          <p className="mt-2 text-sm text-white/85">{brandSubtitle}</p>
        </div>
      </aside>

      {/* Panel derecho: formulario. */}
      <section className="flex flex-1 items-center justify-center bg-bg px-4 py-10 sm:px-6 sm:py-14">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
