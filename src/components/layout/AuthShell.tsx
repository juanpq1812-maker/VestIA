// Layout para pantallas de autenticacion (login y register).
//
// Design STRANDIA — strandia_inicio_de_sesi_n: backdrop atmosférico de tonos
// sage/tinta (pensado para recibir una foto de armario como fondo más
// adelante) con el formulario flotando sobre un panel translúcido, anclado
// abajo en mobile. En desktop (lg+): split-screen — panel de marca a la
// izquierda, formulario a la derecha.

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

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
    <main className="relative flex flex-1 flex-col lg:grid lg:grid-cols-2">
      {/* ── Backdrop atmosférico (toda la pantalla en mobile) ─────────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 lg:hidden"
        style={{
          background:
            "linear-gradient(180deg, #8b9e8a 0%, #516351 45%, #2d312e 100%)",
        }}
      >
        {/* Siluetas suaves que sugieren un armario colgado */}
        <div className="absolute inset-x-6 top-1/4 h-px bg-white/25" />
        <div className="absolute left-[18%] top-1/4 h-24 w-14 rounded-b-3xl bg-white/10" />
        <div className="absolute left-[42%] top-1/4 h-32 w-16 rounded-b-3xl bg-white/15" />
        <div className="absolute left-[68%] top-1/4 h-28 w-14 rounded-b-3xl bg-white/10" />
        <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
      </div>

      {/* ── Panel de marca (desktop) ──────────────────────────────────── */}
      <aside
        className="relative hidden overflow-hidden lg:block lg:min-h-screen"
        style={{
          background:
            "linear-gradient(160deg, #8b9e8a 0%, #516351 55%, #2d312e 100%)",
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

        <div className="relative flex h-full flex-col justify-between px-12 py-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 self-start rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            aria-label="Ir al inicio"
          >
            <Image
              src="/logo-strandia.png"
              alt="StrandIA"
              width={160}
              height={48}
              className="h-12 w-auto"
              priority
            />
          </Link>

          <div className="mt-16 max-w-md">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-3 font-display text-4xl leading-tight text-white sm:text-5xl">
              {brandTitle}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/85">
              {brandSubtitle}
            </p>
          </div>

          <p className="text-xs text-white/60">
            Bogota · Universidad Sergio Arboleda · 2026
          </p>
        </div>
      </aside>

      {/* ── Formulario ────────────────────────────────────────────────── */}
      <section className="relative flex flex-1 flex-col justify-end px-4 pb-8 pt-10 sm:px-6 lg:justify-center lg:bg-bg lg:py-14">
        {/* Logo + tagline sobre el backdrop (solo mobile) */}
        <div className="mx-auto mb-8 w-full max-w-md text-center lg:hidden">
          <Link
            href="/"
            className="inline-block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            aria-label="Ir al inicio"
          >
            <Image
              src="/logo-strandia.png"
              alt="StrandIA"
              width={150}
              height={75}
              className="mx-auto h-12 w-auto rounded-lg bg-surface/90 px-3 py-1 backdrop-blur"
              priority
            />
          </Link>
          <h1 className="mt-6 font-display text-3xl text-white">{brandTitle}</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-white/85">
            {brandSubtitle}
          </p>
        </div>

        <div className="mx-auto w-full max-w-md rounded-xl bg-surface/95 p-6 shadow-lg backdrop-blur sm:p-8 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0">
          {children}
        </div>
      </section>
    </main>
  );
}
