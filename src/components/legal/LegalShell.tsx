// Layout compartido de las páginas legales públicas (/terms y /privacy-policy).
// Sin Header de la app: son accesibles sin sesión, así que solo llevan un
// top bar mínimo con el logo y un pie con el contacto.

import Link from "next/link";
import type { ReactNode } from "react";
import Container from "@/components/ui/Container";

export const LEGAL_CONTACT_EMAIL = "strandia.fashion@gmail.com";
export const LEGAL_RESPONSIBLE = "Strand Inc.";

type Props = {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
};

export default function LegalShell({ eyebrow, title, updatedAt, children }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-divider bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="font-display text-lg font-semibold text-text hover:text-primary"
          >
            StrandIA
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="flex-1 pb-16 pt-8 sm:pt-12">
        <Container size="md">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-text sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Última actualización: {updatedAt}
          </p>

          <div className="mt-8 flex flex-col gap-8">{children}</div>

          <p className="mt-12 border-t border-divider pt-6 text-sm text-text-muted">
            ¿Dudas sobre este documento? Escríbenos a{" "}
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="font-medium text-primary hover:underline"
            >
              {LEGAL_CONTACT_EMAIL}
            </a>
            .
          </p>
        </Container>
      </main>
    </div>
  );
}

export function LegalSection({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-text">{titulo}</h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-text-muted">
        {children}
      </div>
    </section>
  );
}
