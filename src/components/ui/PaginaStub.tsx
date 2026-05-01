// Pantalla "placeholder" para rutas internas que aun no tienen contenido real.
// Mantiene el Header de la app y el wrapper de contenido para que se sienta
// parte del producto, no un 404 disfrazado.

import type { ReactNode } from "react";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";

type Props = {
  titulo: string;
  descripcion: string;
  /** Email del usuario, ya leido en el Server Component. */
  userEmail?: string | null;
  /** Nombre preferido del usuario (profiles.display_name). */
  displayName?: string | null;
  /** Si se pasa, oculta los enlaces de navegacion (util en /onboarding). */
  hideNav?: boolean;
  /** Acciones opcionales al pie (ej: un boton "Volver"). */
  acciones?: ReactNode;
};

export default function PaginaStub({
  titulo,
  descripcion,
  userEmail,
  displayName,
  hideNav,
  acciones,
}: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <Header email={userEmail} displayName={displayName} hideNav={hideNav} />
      <main className="flex-1 py-10 sm:py-16">
        <Container size="md">
          <div className="rounded-xl border border-border bg-surface p-8 shadow-sm sm:p-12">
            <span className="inline-flex items-center gap-2 rounded-full bg-warning-light px-3 py-1 text-xs font-semibold uppercase tracking-wide text-warning">
              <span
                className="h-1.5 w-1.5 rounded-full bg-warning"
                aria-hidden="true"
              />
              En construccion
            </span>
            <h1 className="mt-5 font-display text-3xl font-bold text-text sm:text-4xl">
              {titulo}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-muted">
              {descripcion}
            </p>
            {acciones ? <div className="mt-8">{acciones}</div> : null}
          </div>
        </Container>
      </main>
    </div>
  );
}
